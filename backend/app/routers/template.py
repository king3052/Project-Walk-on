from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.checklist import get_or_bootstrap_template
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/template", tags=["template"])


@router.get("/items", response_model=list[schemas.TemplateItemOut])
def get_template_items(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user = db.query(models.User).get(current_user_id)
    sport = user.sport if user and user.sport else "Basketball"
    return get_or_bootstrap_template(db, models, current_user_id, sport)


@router.post("/items", response_model=schemas.TemplateItemOut)
def create_template_item(
    payload: schemas.TemplateItemCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    item = models.TemplateItem(user_id=current_user_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=schemas.TemplateItemOut)
def update_template_item(
    item_id: str,
    payload: schemas.TemplateItemUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    item = db.query(models.TemplateItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template item not found")
    if item.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your template item")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_template_item(
    item_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    item = db.query(models.TemplateItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template item not found")
    if item.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your template item")
    db.delete(item)
    db.commit()
    return {"deleted": True}


@router.post("/reset", response_model=list[schemas.TemplateItemOut])
def reset_template(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """Wipes your edited template and rebuilds it from the sport's built-in default."""
    db.query(models.TemplateItem).filter(models.TemplateItem.user_id == current_user_id).delete(
        synchronize_session=False
    )
    db.commit()
    user = db.query(models.User).get(current_user_id)
    sport = user.sport if user and user.sport else "Basketball"
    return get_or_bootstrap_template(db, models, current_user_id, sport)
