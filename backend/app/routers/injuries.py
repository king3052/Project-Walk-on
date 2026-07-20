from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/injuries", tags=["injuries"])


@router.post("/", response_model=schemas.InjuryOut)
def create_injury(
    payload: schemas.InjuryCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    injury = models.Injury(**data)
    db.add(injury)
    db.commit()
    db.refresh(injury)
    return injury


@router.get("/user/{user_id}", response_model=list[schemas.InjuryOut])
def list_injuries(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.Injury)
        .filter(models.Injury.user_id == current_user_id)
        .order_by(models.Injury.date_reported.desc())
        .all()
    )


@router.patch("/{injury_id}", response_model=schemas.InjuryOut)
def update_injury(
    injury_id: str,
    payload: schemas.InjuryUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    injury = db.query(models.Injury).get(injury_id)
    if not injury:
        raise HTTPException(status_code=404, detail="Injury not found")
    if injury.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your injury record")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(injury, k, v)
    db.commit()
    db.refresh(injury)
    return injury
