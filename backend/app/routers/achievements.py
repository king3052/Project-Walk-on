from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/{user_id}", response_model=list[schemas.Achievement])
def get_achievements(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).get(user_id)
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == user_id).first()

    total_shots = (
        db.query(func.coalesce(func.sum(models.ShootingLog.attempts), 0))
        .filter(models.ShootingLog.user_id == user_id)
        .scalar()
    )

    pr_count = (
        db.query(func.count(models.StrengthLog.id))
        .join(models.TrainingSession, models.StrengthLog.session_id == models.TrainingSession.id)
        .filter(models.TrainingSession.user_id == user_id, models.StrengthLog.is_pr == 1)
        .scalar()
    )

    active_days = set()
    for model, date_col in [
        (models.NutritionLog, models.NutritionLog.date),
        (models.RecoveryLog, models.RecoveryLog.date),
        (models.ShootingLog, models.ShootingLog.date),
        (models.BodyweightLog, models.BodyweightLog.date),
        (models.ConditioningLog, models.ConditioningLog.date),
        (models.TrainingSession, models.TrainingSession.date),
    ]:
        rows = db.query(date_col).filter(model.user_id == user_id).distinct().all()
        active_days.update(r[0] for r in rows)
    days_logged = len(active_days)

    best_ft = (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == user_id, models.ShootingLog.shot_type.ilike("%free throw%"))
        .filter(models.ShootingLog.attempts >= 20)
        .all()
    )
    best_ft_pct = max((s.makes / s.attempts * 100 for s in best_ft), default=0)

    weight_hit = False
    if user and profile and profile.goal_weight_lb and user.weight_lb:
        weight_hit = abs(user.weight_lb - profile.goal_weight_lb) <= 1

    return [
        schemas.Achievement(
            key="shots_1000",
            name="1,000 shots",
            description="Log 1,000 total shot attempts",
            earned=total_shots >= 1000,
            progress_current=min(total_shots, 1000),
            progress_target=1000,
        ),
        schemas.Achievement(
            key="days_100",
            name="100 days logged",
            description="Log something on 100 different days",
            earned=days_logged >= 100,
            progress_current=min(days_logged, 100),
            progress_target=100,
        ),
        schemas.Achievement(
            key="prs_10",
            name="10 PRs",
            description="Hit 10 personal records in strength training",
            earned=pr_count >= 10,
            progress_current=min(pr_count, 10),
            progress_target=10,
        ),
        schemas.Achievement(
            key="goal_weight",
            name="Goal weight",
            description="Reach your goal weight (within 1 lb)",
            earned=weight_hit,
            progress_current=1 if weight_hit else 0,
            progress_target=1,
        ),
        schemas.Achievement(
            key="ft_90",
            name="90% free throws",
            description="Shoot 90%+ on a free throw session of 20+ attempts",
            earned=best_ft_pct >= 90,
            progress_current=round(best_ft_pct, 1),
            progress_target=90,
        ),
    ]
