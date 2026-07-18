from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/nutrition-logs", tags=["nutrition"])


@router.post("/", response_model=schemas.NutritionLogOut)
def create_nutrition_log(payload: schemas.NutritionLogCreate, db: Session = Depends(get_db)):
    log = models.NutritionLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/user/{user_id}", response_model=list[schemas.NutritionLogOut])
def list_nutrition_logs(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.NutritionLog)
        .filter(models.NutritionLog.user_id == user_id)
        .order_by(models.NutritionLog.date.desc())
        .all()
    )
