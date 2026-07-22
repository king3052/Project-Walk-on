from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/profile", tags=["tennis"])


@router.get("/", response_model=schemas.TennisProfileOut)
def get_profile(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    profile = db.query(models.TennisProfile).filter(models.TennisProfile.user_id == current_user_id).first()
    if not profile:
        profile = models.TennisProfile(user_id=current_user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/", response_model=schemas.TennisProfileOut)
def upsert_profile(
    payload: schemas.TennisProfileUpsert,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = db.query(models.TennisProfile).filter(models.TennisProfile.user_id == current_user_id).first()
    if not profile:
        profile = models.TennisProfile(user_id=current_user_id, **payload.model_dump())
        db.add(profile)
    else:
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile
