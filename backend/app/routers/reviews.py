from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/weekly-reviews", tags=["weekly-reviews"])


@router.post("/", response_model=schemas.WeeklyReviewOut)
def create_review(
    payload: schemas.WeeklyReviewCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    review = models.WeeklyReview(**data)
    db.add(review)
    db.commit()
    db.refresh(review)

    mark_category_done(db, models, current_user_id, review.week_start, ["Journal", "Planning"])

    return review


@router.get("/user/{user_id}", response_model=list[schemas.WeeklyReviewOut])
def list_reviews(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.WeeklyReview)
        .filter(models.WeeklyReview.user_id == current_user_id)
        .order_by(models.WeeklyReview.week_start.desc())
        .all()
    )
