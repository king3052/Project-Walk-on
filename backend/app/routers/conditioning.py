from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
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
