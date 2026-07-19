from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/journal-entries", tags=["journal"])


@router.post("/", response_model=schemas.JournalEntryOut)
def create_entry(payload: schemas.JournalEntryCreate, db: Session = Depends(get_db)):
    entry = models.JournalEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/user/{user_id}", response_model=list[schemas.JournalEntryOut])
def list_entries(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.JournalEntry)
        .filter(models.JournalEntry.user_id == user_id)
        .order_by(models.JournalEntry.date.desc())
        .all()
    )
