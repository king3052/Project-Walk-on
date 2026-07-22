from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/strokes", tags=["tennis"])


@router.post("/", response_model=schemas.TennisStrokeLogOut)
def create_stroke_log(
    payload: schemas.TennisStrokeLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.TennisStrokeLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=list[schemas.TennisStrokeLogOut])
def list_stroke_logs(
    days: int = 30, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.TennisStrokeLog)
        .filter(
            models.TennisStrokeLog.user_id == current_user_id,
            models.TennisStrokeLog.date >= date.today() - timedelta(days=days),
        )
        .order_by(models.TennisStrokeLog.date.desc())
        .all()
    )


@router.patch("/{log_id}", response_model=schemas.TennisStrokeLogOut)
def update_stroke_log(
    log_id: str,
    payload: schemas.TennisStrokeLogUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    log = db.query(models.TennisStrokeLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}")
def delete_stroke_log(
    log_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    log = db.query(models.TennisStrokeLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    db.delete(log)
    db.commit()
    return {"deleted": True}
