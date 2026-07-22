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


@router.post("/onboard", response_model=schemas.UserOut)
def onboard(
    payload: schemas.OnboardingPayload,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Called once from the onboarding survey — sets real starting numbers instead of leaving mock data implied."""
    user = db.query(models.User).get(current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found — call /users/sync first")

    if payload.height_in is not None:
        user.height_in = payload.height_in
    if payload.weight_lb is not None:
        user.weight_lb = payload.weight_lb
    if payload.position is not None:
        user.position = payload.position
    if payload.dominant_hand is not None:
        user.dominant_hand = payload.dominant_hand
    if payload.sport is not None:
        user.sport = payload.sport
    user.onboarding_complete = True

    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == current_user_id).first()
    if not profile:
        profile = models.AthleteProfile(user_id=current_user_id)
        db.add(profile)

    profile_fields = [
        "dominant_foot", "age", "shoe_size", "experience_level",
        "wingspan_in", "standing_reach_in", "body_fat_pct",
        "vertical_in", "broad_jump_in", "sprint_20m_sec", "lane_agility_sec", "shuttle_sec",
        "max_pullups", "max_pushups", "grip_strength_lb",
        "goal_weight_lb", "goal_bench_lb", "goal_squat_lb", "goal_deadlift_lb",
        "training_days_per_week",
    ]
    for field in profile_fields:
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)

    weight_fields = [
        "weight_strength", "weight_basketball", "weight_recovery", "weight_nutrition", "weight_consistency"
    ]
    if any(getattr(payload, f) is not None for f in weight_fields):
        settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user_id).first()
        if not settings:
            settings = models.UserSettings(user_id=current_user_id)
            db.add(settings)
        for field in weight_fields:
            value = getattr(payload, field)
            if value is not None:
                setattr(settings, field, value)

    if payload.injury_body_part:
        db.add(models.Injury(
            user_id=current_user_id,
            body_part=payload.injury_body_part,
            severity=payload.injury_severity or 5,
            description=payload.injury_description,
        ))

    db.commit()
    db.refresh(user)
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
