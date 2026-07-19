from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/{user_id}", response_model=schemas.DashboardOut)
def get_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == user_id).first()

    week_ago = date.today() - timedelta(days=7)

    def latest_1rm(exercise_name: str):
        row = (
            db.query(models.StrengthLog)
            .join(models.TrainingSession)
            .filter(
                models.TrainingSession.user_id == user_id,
                models.StrengthLog.exercise.ilike(exercise_name),
            )
            .order_by(models.StrengthLog.estimated_1rm.desc())
            .first()
        )
        return row.estimated_1rm if row else None

    bench = latest_1rm("bench%")
    squat = latest_1rm("squat%")
    deadlift = latest_1rm("deadlift%")

    week_shots = (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == user_id, models.ShootingLog.date >= week_ago)
        .all()
    )
    total_attempts = sum(s.attempts for s in week_shots)
    total_makes = sum(s.makes for s in week_shots)
    shooting_pct = round((total_makes / total_attempts) * 100, 1) if total_attempts else 0.0

    avg_sleep = (
        db.query(func.avg(models.RecoveryLog.sleep_hours))
        .filter(models.RecoveryLog.user_id == user_id, models.RecoveryLog.date >= week_ago)
        .scalar()
    )

    week_nutrition_days = (
        db.query(func.count(func.distinct(models.NutritionLog.date)))
        .filter(models.NutritionLog.user_id == user_id, models.NutritionLog.date >= week_ago)
        .scalar()
    ) or 0

    active_dates_this_week = set()
    for model, date_col in [
        (models.NutritionLog, models.NutritionLog.date),
        (models.RecoveryLog, models.RecoveryLog.date),
        (models.ShootingLog, models.ShootingLog.date),
        (models.BodyweightLog, models.BodyweightLog.date),
        (models.ConditioningLog, models.ConditioningLog.date),
    ]:
        rows = db.query(date_col).filter(model.user_id == user_id, date_col >= week_ago).distinct().all()
        active_dates_this_week.update(r[0] for r in rows)
    strength_dates = (
        db.query(models.TrainingSession.date)
        .filter(models.TrainingSession.user_id == user_id, models.TrainingSession.date >= week_ago)
        .distinct()
        .all()
    )
    active_dates_this_week.update(r[0] for r in strength_dates)

    # Athlete Score v2 — weighted across five pillars. Each pillar is 0-100 and
    # only counted if there's real data for it; weights are renormalized over
    # whichever pillars are actually present, so missing data doesn't drag
    # the score down artificially for a new athlete.
    pillars: dict[str, tuple[float, float]] = {}  # name -> (value_0_100, weight)

    strength_progress = []
    if profile and profile.goal_bench_lb and bench:
        strength_progress.append(min(bench / profile.goal_bench_lb, 1.0))
    if profile and profile.goal_squat_lb and squat:
        strength_progress.append(min(squat / profile.goal_squat_lb, 1.0))
    if profile and profile.goal_deadlift_lb and deadlift:
        strength_progress.append(min(deadlift / profile.goal_deadlift_lb, 1.0))
    if strength_progress:
        pillars["strength"] = (sum(strength_progress) / len(strength_progress) * 100, 25)

    if total_attempts:
        pillars["basketball"] = (shooting_pct, 25)

    if avg_sleep:
        pillars["recovery"] = (min(avg_sleep / 8.0, 1.0) * 100, 20)

    if week_nutrition_days:
        pillars["nutrition"] = (min(week_nutrition_days / 7.0, 1.0) * 100, 15)

    if active_dates_this_week:
        pillars["consistency"] = (min(len(active_dates_this_week) / 7.0, 1.0) * 100, 15)

    if pillars:
        total_weight = sum(w for _, w in pillars.values())
        athlete_score = round(sum(v * w for v, w in pillars.values()) / total_weight)
    else:
        athlete_score = 0

    score_breakdown = {name: round(v) for name, (v, _) in pillars.items()}

    return schemas.DashboardOut(
        athlete_score=athlete_score,
        score_breakdown=score_breakdown,
        weight_lb=user.weight_lb,
        goal_weight_lb=profile.goal_weight_lb if profile else None,
        bench_lb=bench,
        squat_lb=squat,
        deadlift_lb=deadlift,
        shots_this_week=total_attempts,
        shooting_pct_this_week=shooting_pct,
        avg_sleep_this_week=round(avg_sleep, 1) if avg_sleep else None,
    )
