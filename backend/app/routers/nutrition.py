from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/nutrition-logs", tags=["nutrition"])


@router.post("/", response_model=schemas.NutritionLogOut)
def create_nutrition_log(
    payload: schemas.NutritionLogCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    log = models.NutritionLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    mark_category_done(db, models, current_user_id, log.date, ['Nutrition'])

    return log


@router.get("/user/{user_id}", response_model=list[schemas.NutritionLogOut])
def list_nutrition_logs(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.NutritionLog)
        .filter(models.NutritionLog.user_id == current_user_id)
        .order_by(models.NutritionLog.date.desc())
        .all()
    )
