from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/practice", tags=["tennis-practice"])


@router.post("/", response_model=schemas.TennisPracticeSessionOut)
def create_practice_session(
    payload: schemas.TennisPracticeSessionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = models.TennisPracticeSession(user_id=current_user_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/", response_model=list[schemas.TennisPracticeSessionOut])
def list_practice_sessions(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return (
        db.query(models.TennisPracticeSession)
        .filter(models.TennisPracticeSession.user_id == current_user_id)
        .order_by(models.TennisPracticeSession.date.desc())
        .all()
    )


@router.patch("/{item_id}", response_model=schemas.TennisPracticeSessionOut)
def update_practice_session(
    item_id: str,
    payload: schemas.TennisPracticeSessionUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    row = db.query(models.TennisPracticeSession).get(item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if row.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not yours")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{item_id}")
def delete_practice_session(
    item_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    row = db.query(models.TennisPracticeSession).get(item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    if row.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not yours")
    db.delete(row)
    db.commit()
    return {"deleted": True}
