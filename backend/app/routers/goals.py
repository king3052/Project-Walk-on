from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("/", response_model=schemas.GoalOut)
def create_goal(
    payload: schemas.GoalCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    goal = models.Goal(**data)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/user/{user_id}", response_model=list[schemas.GoalOut])
def list_goals(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user_id).all()


@router.patch("/{goal_id}/status", response_model=schemas.GoalOut)
def update_status(
    goal_id: str,
    status: models.GoalStatus,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your goal")
    goal.status = status
    db.commit()
    db.refresh(goal)

    mark_category_done(db, models, current_user_id, date.today(), ["Goals"])

    return goal
