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

    # Simple composite score for MVP: weighted progress toward strength + shooting goals.
    # Refine this once you have real data — this is intentionally simple to start.
    score_components = []
    if profile and profile.goal_bench_lb and bench:
        score_components.append(min(bench / profile.goal_bench_lb, 1.0))
    if profile and profile.goal_squat_lb and squat:
        score_components.append(min(squat / profile.goal_squat_lb, 1.0))
    if total_attempts:
        score_components.append(total_makes / total_attempts)
    athlete_score = round((sum(score_components) / len(score_components)) * 100) if score_components else 0

    return schemas.DashboardOut(
        athlete_score=athlete_score,
        weight_lb=user.weight_lb,
        goal_weight_lb=profile.goal_weight_lb if profile else None,
        bench_lb=bench,
        squat_lb=squat,
        deadlift_lb=deadlift,
        shots_this_week=total_attempts,
        shooting_pct_this_week=shooting_pct,
        avg_sleep_this_week=round(avg_sleep, 1) if avg_sleep else None,
    )
