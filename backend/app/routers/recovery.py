from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/recovery-logs", tags=["recovery"])


@router.post("/", response_model=schemas.RecoveryLogOut)
def create_recovery_log(
    payload: schemas.RecoveryLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.RecoveryLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/user/{user_id}", response_model=list[schemas.RecoveryLogOut])
def list_recovery_logs(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.RecoveryLog)
        .filter(models.RecoveryLog.user_id == current_user_id)
        .order_by(models.RecoveryLog.date.desc())
        .all()
    )
