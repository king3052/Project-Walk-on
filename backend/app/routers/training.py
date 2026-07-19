from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/training-sessions", tags=["training"])


def epley_1rm(weight: float, reps: int) -> float:
    """Epley formula: estimated 1-rep max."""
    if reps <= 1:
        return weight
    return round(weight * (1 + reps / 30), 1)


@router.post("/", response_model=schemas.TrainingSessionOut)
def create_session(
    payload: schemas.TrainingSessionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    session = models.TrainingSession(
        user_id=current_user_id,
        date=payload.date,
        type=payload.type,
        duration_min=payload.duration_min,
        notes=payload.notes,
    )
    db.add(session)
    db.flush()  # get session.id before commit

    if payload.strength_logs:
        for log_in in payload.strength_logs:
            est_1rm = epley_1rm(log_in.weight_lb, log_in.reps)
            prior_best = (
                db.query(models.StrengthLog)
                .join(models.TrainingSession)
                .filter(
                    models.TrainingSession.user_id == current_user_id,
                    models.StrengthLog.exercise == log_in.exercise,
                )
                .order_by(models.StrengthLog.estimated_1rm.desc())
                .first()
            )
            is_pr = 1 if (not prior_best or est_1rm > (prior_best.estimated_1rm or 0)) else 0
            db.add(models.StrengthLog(
                session_id=session.id,
                exercise=log_in.exercise,
                sets=log_in.sets,
                reps=log_in.reps,
                weight_lb=log_in.weight_lb,
                estimated_1rm=est_1rm,
                is_pr=is_pr,
            ))

    db.commit()
    db.refresh(session)
    return session


@router.get("/user/{user_id}", response_model=list[schemas.TrainingSessionOut])
def list_sessions(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.TrainingSession)
        .options(joinedload(models.TrainingSession.strength_logs))
        .filter(models.TrainingSession.user_id == current_user_id)
        .order_by(models.TrainingSession.date.desc())
        .all()
    )
