from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/bodyweight-logs", tags=["bodyweight"])


@router.post("/", response_model=schemas.BodyweightLogOut)
def create_bodyweight_log(
    payload: schemas.BodyweightLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.BodyweightLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    mark_category_done(db, models, current_user_id, log.date, ['Analytics'])

    return log


@router.get("/user/{user_id}", response_model=list[schemas.BodyweightLogOut])
def list_bodyweight_logs(
    user_id: str,
    days: int = 30,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == current_user_id, models.BodyweightLog.date >= date.today() - timedelta(days=days))
        .order_by(models.BodyweightLog.date.desc())
        .all()
    )


@router.patch("/{log_id}", response_model=schemas.BodyweightLogOut)
def update_bodyweight_logs(
    log_id: str,
    payload: schemas.BodyweightLogUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    log = db.query(models.BodyweightLog).get(log_id)
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
def delete_bodyweight_logs(
    log_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    log = db.query(models.BodyweightLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    db.delete(log)
    db.commit()
    return {"deleted": True}
