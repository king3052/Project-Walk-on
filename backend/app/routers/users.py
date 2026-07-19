from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/whoami")
def whoami(current_user_id: str = Depends(get_current_user_id)):
    """Returns the verified user id from the token — handy for confirming auth is wired up."""
    return {"user_id": current_user_id}


@router.post("/sync", response_model=schemas.UserOut)
def sync_user(
    payload: schemas.UserSync,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Called once right after login/signup. Ensures a row exists in our own
    `users` table keyed by the same id Supabase Auth issued, so the rest of
    the app can keep working with a plain `user_id` foreign key.
    """
    user = db.query(models.User).get(current_user_id)
    if not user:
        user = models.User(id=current_user_id, email=payload.email, name=payload.name)
        db.add(user)
    else:
        user.email = payload.email
        user.name = payload.name
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).get(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found — call /users/sync first")
    return user


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    # user_id in the path is ignored for lookup — you can only ever fetch your own record.
    user = db.query(models.User).get(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/profile", response_model=schemas.AthleteProfileOut)
def get_profile(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == current_user_id).first()
    if not profile:
        profile = models.AthleteProfile(user_id=current_user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/{user_id}/profile", response_model=schemas.AthleteProfileOut)
def upsert_profile(
    user_id: str,
    payload: schemas.AthleteProfileUpsert,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == current_user_id).first()
    if not profile:
        profile = models.AthleteProfile(user_id=current_user_id, **payload.model_dump())
        db.add(profile)
    else:
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile
