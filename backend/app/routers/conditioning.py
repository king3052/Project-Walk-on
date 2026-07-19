from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/conditioning-logs", tags=["conditioning"])


@router.post("/", response_model=schemas.ConditioningLogOut)
def create_conditioning_log(payload: schemas.ConditioningLogCreate, db: Session = Depends(get_db)):
    log = models.ConditioningLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/user/{user_id}", response_model=list[schemas.ConditioningLogOut])
def list_conditioning_logs(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.ConditioningLog)
        .filter(models.ConditioningLog.user_id == user_id)
        .order_by(models.ConditioningLog.date.desc())
        .all()
    )
