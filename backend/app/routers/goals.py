from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("/", response_model=schemas.GoalOut)
def create_goal(payload: schemas.GoalCreate, db: Session = Depends(get_db)):
    goal = models.Goal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/user/{user_id}", response_model=list[schemas.GoalOut])
def list_goals(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.Goal).filter(models.Goal.user_id == user_id).all()


@router.patch("/{goal_id}/status", response_model=schemas.GoalOut)
def update_status(goal_id: str, status: models.GoalStatus, db: Session = Depends(get_db)):
    goal = db.query(models.Goal).get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.status = status
    db.commit()
    db.refresh(goal)
    return goal
