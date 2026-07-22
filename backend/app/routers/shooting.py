from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done, mark_matching_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/shooting-logs", tags=["shooting"])


@router.post("/", response_model=schemas.ShootingLogOut)
def create_shooting_log(
    payload: schemas.ShootingLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.ShootingLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    mark_matching_done(db, models, current_user_id, log.date, "Basketball", [payload.shot_type])
    mark_category_done(db, models, current_user_id, log.date, ["Analytics"])

    return log


@router.get("/user/{user_id}", response_model=list[schemas.ShootingLogOut])
def list_shooting_logs(
    user_id: str,
    days: int = 30,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == current_user_id, models.ShootingLog.date >= date.today() - timedelta(days=days))
        .order_by(models.ShootingLog.date.desc())
        .all()
    )


@router.patch("/{log_id}", response_model=schemas.ShootingLogOut)
def update_shooting_logs(
    log_id: str,
    payload: schemas.ShootingLogUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    log = db.query(models.ShootingLog).get(log_id)
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
def delete_shooting_logs(
    log_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    log = db.query(models.ShootingLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    db.delete(log)
    db.commit()
    return {"deleted": True}
