from fastapi import APIRouter, Depends
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
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == current_user_id)
        .order_by(models.BodyweightLog.date.desc())
        .all()
    )
