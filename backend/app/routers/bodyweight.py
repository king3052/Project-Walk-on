from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/bodyweight-logs", tags=["bodyweight"])


@router.post("/", response_model=schemas.BodyweightLogOut)
def create_bodyweight_log(payload: schemas.BodyweightLogCreate, db: Session = Depends(get_db)):
    log = models.BodyweightLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/user/{user_id}", response_model=list[schemas.BodyweightLogOut])
def list_bodyweight_logs(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == user_id)
        .order_by(models.BodyweightLog.date.desc())
        .all()
    )
