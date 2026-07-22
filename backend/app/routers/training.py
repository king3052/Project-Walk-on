from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done, mark_matching_done
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

    category_map = {
        "STRENGTH": "Strength",
        "BASKETBALL": "Basketball",
        "CONDITIONING": "Conditioning",
        "RECOVERY": "Recovery",
        "FILM": "Film",
    }
    type_value = payload.type.value if hasattr(payload.type, "value") else payload.type
    category = category_map.get(type_value)

    if category == "Strength" and payload.strength_logs:
        # Only check off the specific exercises actually logged, not every Strength item that day.
        exercise_names = [log.exercise for log in payload.strength_logs]
        mark_matching_done(db, models, current_user_id, payload.date, "Strength", exercise_names)
    elif category:
        mark_category_done(db, models, current_user_id, payload.date, [category])

    mark_category_done(db, models, current_user_id, payload.date, ["Analytics"])

    return session


@router.get("/user/{user_id}", response_model=list[schemas.TrainingSessionOut])
def list_sessions(
    user_id: str,
    days: int = 30,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.TrainingSession)
        .options(joinedload(models.TrainingSession.strength_logs))
        .filter(models.TrainingSession.user_id == current_user_id, models.TrainingSession.date >= date.today() - timedelta(days=days))
        .order_by(models.TrainingSession.date.desc())
        .all()
    )


@router.patch("/strength-logs/{log_id}", response_model=schemas.StrengthLogOut)
def update_strength_log(
    log_id: str,
    payload: schemas.StrengthLogUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    log = (
        db.query(models.StrengthLog)
        .join(models.TrainingSession)
        .filter(models.StrengthLog.id == log_id, models.TrainingSession.user_id == current_user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Strength log not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    # recompute estimated 1RM if weight or reps changed
    log.estimated_1rm = epley_1rm(log.weight_lb, log.reps)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/strength-logs/{log_id}")
def delete_strength_log(
    log_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    log = (
        db.query(models.StrengthLog)
        .join(models.TrainingSession)
        .filter(models.StrengthLog.id == log_id, models.TrainingSession.user_id == current_user_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Strength log not found")
    db.delete(log)
    db.commit()
    return {"deleted": True}


@router.patch("/{session_id}", response_model=schemas.TrainingSessionOut)
def update_session(
    session_id: str,
    payload: schemas.TrainingSessionUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    session = db.query(models.TrainingSession).get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your session")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(session, k, v)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}")
def delete_session(
    session_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    session = db.query(models.TrainingSession).get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your session")
    db.query(models.StrengthLog).filter(models.StrengthLog.session_id == session_id).delete(
        synchronize_session=False
    )
    db.delete(session)
    db.commit()
    return {"deleted": True}
