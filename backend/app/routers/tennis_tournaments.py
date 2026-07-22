from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/tournaments", tags=["tennis"])


@router.post("/", response_model=schemas.TennisTournamentOut)
def create_tournament(
    payload: schemas.TennisTournamentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    t = models.TennisTournament(**data)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/", response_model=list[schemas.TennisTournamentOut])
def list_tournaments(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.TennisTournament)
        .filter(models.TennisTournament.user_id == current_user_id)
        .order_by(models.TennisTournament.start_date.desc().nullslast())
        .all()
    )


@router.patch("/{tournament_id}", response_model=schemas.TennisTournamentOut)
def update_tournament(
    tournament_id: str,
    payload: schemas.TennisTournamentUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    t = db.query(models.TennisTournament).get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if t.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your tournament")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{tournament_id}")
def delete_tournament(
    tournament_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    t = db.query(models.TennisTournament).get(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if t.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your tournament")
    db.delete(t)
    db.commit()
    return {"deleted": True}
