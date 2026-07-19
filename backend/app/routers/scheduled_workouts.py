from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date as date_type

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/scheduled-workouts", tags=["scheduled-workouts"])


@router.post("/", response_model=schemas.ScheduledWorkoutOut)
def create_scheduled_workout(payload: schemas.ScheduledWorkoutCreate, db: Session = Depends(get_db)):
    workout = models.ScheduledWorkout(**payload.model_dump())
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.get("/user/{user_id}", response_model=list[schemas.ScheduledWorkoutOut])
def list_scheduled_workouts(
    user_id: str,
    start: date_type | None = None,
    end: date_type | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.ScheduledWorkout).filter(models.ScheduledWorkout.user_id == user_id)
    if start:
        query = query.filter(models.ScheduledWorkout.date >= start)
    if end:
        query = query.filter(models.ScheduledWorkout.date <= end)
    return query.order_by(models.ScheduledWorkout.date.asc()).all()


@router.patch("/{workout_id}", response_model=schemas.ScheduledWorkoutOut)
def update_scheduled_workout(
    workout_id: str, payload: schemas.ScheduledWorkoutUpdate, db: Session = Depends(get_db)
):
    workout = db.query(models.ScheduledWorkout).get(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Scheduled workout not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(workout, k, v)
    db.commit()
    db.refresh(workout)
    return workout


@router.patch("/{workout_id}/complete", response_model=schemas.ScheduledWorkoutOut)
def toggle_complete(workout_id: str, db: Session = Depends(get_db)):
    workout = db.query(models.ScheduledWorkout).get(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Scheduled workout not found")
    workout.completed = not workout.completed
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}")
def delete_scheduled_workout(workout_id: str, db: Session = Depends(get_db)):
    workout = db.query(models.ScheduledWorkout).get(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Scheduled workout not found")
    db.delete(workout)
    db.commit()
    return {"deleted": True}
