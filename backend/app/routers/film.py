from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/film-sessions", tags=["film"])


@router.post("/", response_model=schemas.FilmSessionOut)
def create_session(payload: schemas.FilmSessionCreate, db: Session = Depends(get_db)):
    session = models.FilmSession(**payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/user/{user_id}", response_model=list[schemas.FilmSessionOut])
def list_sessions(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.FilmSession)
        .options(joinedload(models.FilmSession.tags))
        .filter(models.FilmSession.user_id == user_id)
        .order_by(models.FilmSession.date.desc())
        .all()
    )


@router.post("/{session_id}/tags", response_model=schemas.FilmTagOut)
def add_tag(session_id: str, payload: schemas.FilmTagCreate, db: Session = Depends(get_db)):
    session = db.query(models.FilmSession).get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Film session not found")
    tag = models.FilmTag(film_session_id=session_id, **payload.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag
