from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_matching_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/conditioning-logs", tags=["conditioning"])


@router.post("/", response_model=schemas.ConditioningLogOut)
def create_conditioning_log(
    payload: schemas.ConditioningLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.ConditioningLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    mark_matching_done(db, models, current_user_id, log.date, "Conditioning", [payload.activity])

    return log


@router.get("/user/{user_id}", response_model=list[schemas.ConditioningLogOut])
def list_conditioning_logs(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.ConditioningLog)
        .filter(models.ConditioningLog.user_id == current_user_id)
        .order_by(models.ConditioningLog.date.desc())
        .all()
    )


@router.patch("/{log_id}", response_model=schemas.ConditioningLogOut)
def update_conditioning_logs(
    log_id: str,
    payload: schemas.ConditioningLogUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    log = db.query(models.ConditioningLog).get(log_id)
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
def delete_conditioning_logs(
    log_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    log = db.query(models.ConditioningLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    db.delete(log)
    db.commit()
    return {"deleted": True}
