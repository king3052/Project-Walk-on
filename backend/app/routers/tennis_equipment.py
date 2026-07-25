from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/equipment", tags=["tennis-equipment"])

RESTRING_HOURS_THRESHOLD = 15  # commonly cited rule of thumb: restring roughly every 15-20 hours of play
SHOE_HOURS_THRESHOLD = 60


def _racquet_with_flags(r: models.TennisRacquet) -> dict:
    return {
        "id": r.id, "user_id": r.user_id, "model": r.model, "weight_g": r.weight_g,
        "balance_point": r.balance_point, "string_type": r.string_type,
        "string_tension_lb": r.string_tension_lb, "hours_played": r.hours_played,
        "last_restrung_date": r.last_restrung_date, "grip_replaced_date": r.grip_replaced_date,
        "active": r.active, "notes": r.notes,
        "needs_restring": (r.hours_played or 0) >= RESTRING_HOURS_THRESHOLD,
    }


@router.get("/racquets")
def list_racquets(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    racquets = db.query(models.TennisRacquet).filter(models.TennisRacquet.user_id == current_user_id).all()
    return [_racquet_with_flags(r) for r in racquets]


@router.post("/racquets", response_model=schemas.TennisRacquetOut)
def create_racquet(
    payload: schemas.TennisRacquetCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    r = models.TennisRacquet(user_id=current_user_id, **payload.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/racquets/{racquet_id}", response_model=schemas.TennisRacquetOut)
def update_racquet(
    racquet_id: str,
    payload: schemas.TennisRacquetUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    r = db.query(models.TennisRacquet).get(racquet_id)
    if not r:
        raise HTTPException(status_code=404, detail="Racquet not found")
    if r.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your racquet")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/racquets/{racquet_id}")
def delete_racquet(
    racquet_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    r = db.query(models.TennisRacquet).get(racquet_id)
    if not r:
        raise HTTPException(status_code=404, detail="Racquet not found")
    if r.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your racquet")
    db.delete(r)
    db.commit()
    return {"deleted": True}


def _shoe_with_flags(s: models.TennisShoe) -> dict:
    return {
        "id": s.id, "user_id": s.user_id, "model": s.model, "surface": s.surface,
        "hours_played": s.hours_played, "purchased_date": s.purchased_date,
        "active": s.active, "notes": s.notes,
        "needs_replacement": (s.hours_played or 0) >= SHOE_HOURS_THRESHOLD,
    }


@router.get("/shoes")
def list_shoes(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    shoes = db.query(models.TennisShoe).filter(models.TennisShoe.user_id == current_user_id).all()
    return [_shoe_with_flags(s) for s in shoes]


@router.post("/shoes", response_model=schemas.TennisShoeOut)
def create_shoe(
    payload: schemas.TennisShoeCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    s = models.TennisShoe(user_id=current_user_id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/shoes/{shoe_id}", response_model=schemas.TennisShoeOut)
def update_shoe(
    shoe_id: str,
    payload: schemas.TennisShoeUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    s = db.query(models.TennisShoe).get(shoe_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shoe not found")
    if s.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your shoe")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/shoes/{shoe_id}")
def delete_shoe(
    shoe_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    s = db.query(models.TennisShoe).get(shoe_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shoe not found")
    if s.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your shoe")
    db.delete(s)
    db.commit()
    return {"deleted": True}
