from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date as date_type

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import seed_week
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/scheduled-workouts", tags=["scheduled-workouts"])


@router.post("/seed-week")
def seed_week_from_template(
    week_start: date_type,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).get(current_user_id)
    sport = user.sport if user and user.sport else "Basketball"
    created = seed_week(db, models, current_user_id, week_start, sport)
    return {"created": created, "sport": sport}


@router.post("/", response_model=schemas.ScheduledWorkoutOut)
def create_scheduled_workout(
    payload: schemas.ScheduledWorkoutCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    workout = models.ScheduledWorkout(**data)
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.get("/user/{user_id}", response_model=list[schemas.ScheduledWorkoutOut])
def list_scheduled_workouts(
    user_id: str,
    start: date_type | None = None,
    end: date_type | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    query = db.query(models.ScheduledWorkout).filter(models.ScheduledWorkout.user_id == current_user_id)
    if start:
        query = query.filter(models.ScheduledWorkout.date >= start)
    if end:
        query = query.filter(models.ScheduledWorkout.date <= end)
    return query.order_by(models.ScheduledWorkout.date.asc()).all()


def _get_owned_workout(db: Session, workout_id: str, current_user_id: str) -> models.ScheduledWorkout:
    workout = db.query(models.ScheduledWorkout).get(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Scheduled workout not found")
    if workout.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your scheduled workout")
    return workout


@router.patch("/{workout_id}", response_model=schemas.ScheduledWorkoutOut)
def update_scheduled_workout(
    workout_id: str,
    payload: schemas.ScheduledWorkoutUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    workout = _get_owned_workout(db, workout_id, current_user_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(workout, k, v)
    db.commit()
    db.refresh(workout)
    return workout


@router.patch("/{workout_id}/complete", response_model=schemas.ScheduledWorkoutOut)
def toggle_complete(
    workout_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    workout = _get_owned_workout(db, workout_id, current_user_id)
    workout.completed = not workout.completed
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}")
def delete_scheduled_workout(
    workout_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    workout = _get_owned_workout(db, workout_id, current_user_id)
    db.delete(workout)
    db.commit()
    return {"deleted": True}
