from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/rankings", tags=["tennis"])


@router.post("/", response_model=schemas.TennisRankingOut)
def create_ranking(
    payload: schemas.TennisRankingCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    r = models.TennisRanking(**data)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("/", response_model=list[schemas.TennisRankingOut])
def list_rankings(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return (
        db.query(models.TennisRanking)
        .filter(models.TennisRanking.user_id == current_user_id)
        .order_by(models.TennisRanking.date.desc())
        .all()
    )


@router.delete("/{ranking_id}")
def delete_ranking(
    ranking_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    r = db.query(models.TennisRanking).get(ranking_id)
    if not r:
        raise HTTPException(status_code=404, detail="Ranking not found")
    if r.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your ranking entry")
    db.delete(r)
    db.commit()
    return {"deleted": True}
