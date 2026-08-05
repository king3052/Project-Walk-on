import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core import google_calendar as gc
from app.models import models

router = APIRouter(prefix="/calendar-integration", tags=["calendar-integration"])


class SelectCalendarsRequest(BaseModel):
    calendar_ids: list[str]


@router.post("/start")
def start_oauth(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not gc.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Google Calendar isn't configured yet — GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI must be set.",
        )
    state = gc.generate_state_token()
    db.add(models.OAuthState(state=state, user_id=current_user_id))
    db.commit()
    return {"authorize_url": gc.build_authorize_url(state)}


@router.get("/callback")
def oauth_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    state_row = db.query(models.OAuthState).filter(models.OAuthState.state == state).first()
    if not state_row:
        return RedirectResponse(f"{gc.FRONTEND_URL}/settings?calendar_error=invalid_state")

    user_id = state_row.user_id
    expired = gc.is_state_expired(state_row.created_at)
    db.delete(state_row)
    db.commit()

    if expired:
        return RedirectResponse(f"{gc.FRONTEND_URL}/settings?calendar_error=expired")

    try:
        tokens = gc.exchange_code_for_tokens(code)
    except Exception:
        return RedirectResponse(f"{gc.FRONTEND_URL}/settings?calendar_error=token_exchange_failed")

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        return RedirectResponse(f"{gc.FRONTEND_URL}/settings?calendar_error=no_refresh_token")

    existing = db.query(models.GoogleCalendarIntegration).filter(
        models.GoogleCalendarIntegration.user_id == user_id
    ).first()
    if existing:
        existing.refresh_token = refresh_token
    else:
        db.add(models.GoogleCalendarIntegration(user_id=user_id, refresh_token=refresh_token))
    db.commit()

    return RedirectResponse(f"{gc.FRONTEND_URL}/settings?calendar_connected=1")


@router.get("/status")
def get_status(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    integration = db.query(models.GoogleCalendarIntegration).filter(
        models.GoogleCalendarIntegration.user_id == current_user_id
    ).first()
    if not integration:
        return {"connected": False, "configured": gc.is_configured(), "calendars": [], "selected_calendar_ids": []}

    try:
        access_token = gc.get_access_token(integration.refresh_token)
        calendars = gc.list_calendars(access_token)
    except Exception:
        calendars = []

    selected = json.loads(integration.selected_calendar_ids) if integration.selected_calendar_ids else []
    return {"connected": True, "configured": True, "calendars": calendars, "selected_calendar_ids": selected}


@router.post("/select-calendars")
def select_calendars(
    payload: SelectCalendarsRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    integration = db.query(models.GoogleCalendarIntegration).filter(
        models.GoogleCalendarIntegration.user_id == current_user_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Not connected to Google Calendar")
    integration.selected_calendar_ids = json.dumps(payload.calendar_ids)
    db.commit()
    return {"saved": True}


@router.delete("")
def disconnect(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    db.query(models.GoogleCalendarIntegration).filter(
        models.GoogleCalendarIntegration.user_id == current_user_id
    ).delete(synchronize_session=False)
    db.commit()
    return {"disconnected": True}


def get_events_for_user(db: Session, user_id: str, days_ahead: int = 7):
    """Thin re-export for other routers that only import from routers by
    convention — the real implementation lives in app/core/google_calendar.py."""
    return gc.get_events_for_user(db, models, user_id, days_ahead)
