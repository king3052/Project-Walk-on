from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/{user_id}", response_model=schemas.AnalyticsOut)
def get_analytics(user_id: str, days: int = 90, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)

    weight_rows = (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == user_id, models.BodyweightLog.date >= since)
        .order_by(models.BodyweightLog.date.asc())
        .all()
    )

    strength_rows = (
        db.query(models.StrengthLog, models.TrainingSession.date)
        .join(models.TrainingSession, models.StrengthLog.session_id == models.TrainingSession.id)
        .filter(models.TrainingSession.user_id == user_id, models.TrainingSession.date >= since)
        .order_by(models.TrainingSession.date.asc())
        .all()
    )

    shooting_rows = (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == user_id, models.ShootingLog.date >= since)
        .order_by(models.ShootingLog.date.asc())
        .all()
    )

    weight = [schemas.WeightPoint(date=r.date, weight_lb=r.weight_lb) for r in weight_rows]

    strength = [
        schemas.StrengthPoint(date=session_date, exercise=log.exercise, estimated_1rm=log.estimated_1rm or 0)
        for log, session_date in strength_rows
    ]

    shooting = [
        schemas.ShootingPoint(date=r.date, shot_type=r.shot_type, attempts=r.attempts, makes=r.makes)
        for r in shooting_rows
    ]

    active_dates = sorted(
        {p.date for p in weight} | {p.date for p in strength} | {p.date for p in shooting}
    )

    return schemas.AnalyticsOut(
        weight=weight,
        strength=strength,
        shooting=shooting,
        active_dates=active_dates,
    )
