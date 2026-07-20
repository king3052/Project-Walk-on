from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
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

    mark_category_done(db, models, current_user_id, log.date, ['Basketball', 'Analytics'])

    return log


@router.get("/user/{user_id}", response_model=list[schemas.ShootingLogOut])
def list_shooting_logs(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == current_user_id)
        .order_by(models.ShootingLog.date.desc())
        .all()
    )
