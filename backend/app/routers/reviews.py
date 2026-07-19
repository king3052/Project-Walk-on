from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/weekly-reviews", tags=["weekly-reviews"])


@router.post("/", response_model=schemas.WeeklyReviewOut)
def create_review(payload: schemas.WeeklyReviewCreate, db: Session = Depends(get_db)):
    review = models.WeeklyReview(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/user/{user_id}", response_model=list[schemas.WeeklyReviewOut])
def list_reviews(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.WeeklyReview)
        .filter(models.WeeklyReview.user_id == user_id)
        .order_by(models.WeeklyReview.week_start.desc())
        .all()
    )
