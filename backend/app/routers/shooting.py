from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/shooting-logs", tags=["shooting"])


@router.post("/", response_model=schemas.ShootingLogOut)
def create_shooting_log(payload: schemas.ShootingLogCreate, db: Session = Depends(get_db)):
    log = models.ShootingLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/user/{user_id}", response_model=list[schemas.ShootingLogOut])
def list_shooting_logs(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == user_id)
        .order_by(models.ShootingLog.date.desc())
        .all()
    )
