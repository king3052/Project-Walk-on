from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import mark_category_done
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/journal-entries", tags=["journal"])


@router.post("/", response_model=schemas.JournalEntryOut)
def create_entry(
    payload: schemas.JournalEntryCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    entry = models.JournalEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)

    mark_category_done(db, models, current_user_id, entry.date, ["Mental", "Journal"])

    return entry


@router.get("/user/{user_id}", response_model=list[schemas.JournalEntryOut])
def list_entries(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.JournalEntry)
        .filter(models.JournalEntry.user_id == current_user_id)
        .order_by(models.JournalEntry.date.desc())
        .all()
    )
