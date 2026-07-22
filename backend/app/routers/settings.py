from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/me", response_model=schemas.UserSettingsOut)
def get_settings(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user_id).first()
    if not settings:
        settings = models.UserSettings(user_id=current_user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/me", response_model=schemas.UserSettingsOut)
def update_settings(
    payload: schemas.ScoreWeights,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user_id).first()
    if not settings:
        settings = models.UserSettings(user_id=current_user_id, **payload.model_dump())
        db.add(settings)
    else:
        for k, v in payload.model_dump().items():
            setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings


@router.patch("/account", response_model=schemas.UserOut)
def update_account(
    payload: schemas.AccountUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).get(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.sport is not None:
        user.sport = payload.sport
    db.commit()
    db.refresh(user)
    return user


@router.delete("/data")
def clear_all_data(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Danger zone: deletes every logged record for this account (workouts,
    shooting, nutrition, recovery, journal, film, reports, etc.) but keeps
    the account itself and its profile/goals shell intact.
    """
    uid = current_user_id

    # child tables that reference a parent by a non-user_id foreign key first
    session_ids = [r[0] for r in db.query(models.TrainingSession.id).filter(models.TrainingSession.user_id == uid).all()]
    if session_ids:
        db.query(models.StrengthLog).filter(models.StrengthLog.session_id.in_(session_ids)).delete(synchronize_session=False)

    film_ids = [r[0] for r in db.query(models.FilmSession.id).filter(models.FilmSession.user_id == uid).all()]
    if film_ids:
        db.query(models.FilmTag).filter(models.FilmTag.film_session_id.in_(film_ids)).delete(synchronize_session=False)

    per_user_models = [
        models.TrainingSession,
        models.ShootingLog,
        models.NutritionLog,
        models.RecoveryLog,
        models.Goal,
        models.BodyweightLog,
        models.WeeklyReview,
        models.ConditioningLog,
        models.JournalEntry,
        models.FilmSession,
        models.AICoachSummary,
        models.ScoutingReport,
        models.ScheduledWorkout,
    ]
    for model in per_user_models:
        db.query(model).filter(model.user_id == uid).delete(synchronize_session=False)

    db.commit()
    return {"cleared": True}
