"""
Google Calendar integration. Read-only, always — this module has no code
path that creates, updates, or deletes anything on a user's real calendar,
only lists calendars and reads events.

OAuth flow (see app/routers/calendar_integration.py for the actual endpoints):
  1. Frontend calls POST /calendar-integration/start while authenticated —
     backend generates a one-time state token tied to the user, returns the
     Google consent URL.
  2. Browser navigates to Google, user approves.
  3. Google redirects to GET /calendar-integration/callback with no auth
     header at all — just ?code=...&state=.... The state value is how we
     recover which user this is (see OAuthState in app/models/models.py).
  4. Backend exchanges the code for tokens, stores the refresh_token, and
     redirects the browser back to the frontend.
"""
import os
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import requests

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"

SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
STATE_EXPIRY_MINUTES = 10


def is_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI)


def generate_state_token() -> str:
    return secrets.token_urlsafe(32)


def is_state_expired(created_at) -> bool:
    return datetime.utcnow() - created_at > timedelta(minutes=STATE_EXPIRY_MINUTES)


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict:
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_access_token(refresh_token: str) -> str:
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def list_calendars(access_token: str) -> list:
    resp = requests.get(
        CALENDAR_LIST_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    resp.raise_for_status()
    items = resp.json().get("items", [])
    return [
        {"id": c["id"], "summary": c.get("summary", "Untitled"), "primary": c.get("primary", False)}
        for c in items
    ]


def get_upcoming_events(access_token: str, calendar_ids: list, days_ahead: int = 7) -> list:
    now = datetime.utcnow()
    time_min = now.isoformat() + "Z"
    time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"

    all_events = []
    for calendar_id in calendar_ids:
        try:
            resp = requests.get(
                EVENTS_URL.format(calendar_id=calendar_id),
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 50,
                },
                timeout=15,
            )
            resp.raise_for_status()
            for event in resp.json().get("items", []):
                start = event.get("start", {})
                end = event.get("end", {})
                all_events.append({
                    "summary": event.get("summary", "(No title)"),
                    "start": start.get("dateTime") or start.get("date"),
                    "end": end.get("dateTime") or end.get("date"),
                    "calendar_id": calendar_id,
                    "all_day": "date" in start,
                })
        except requests.RequestException:
            continue

    all_events.sort(key=lambda e: e["start"] or "")
    return all_events


def get_events_for_user(db, models_module, user_id: str, days_ahead: int = 7):
    """Looks up a user's stored integration, mints a fresh access token, and
    returns their upcoming events. Returns None if not connected — callers
    should treat that as "no calendar data available", not an error."""
    import json

    integration = db.query(models_module.GoogleCalendarIntegration).filter(
        models_module.GoogleCalendarIntegration.user_id == user_id
    ).first()
    if not integration:
        return None
    try:
        access_token = get_access_token(integration.refresh_token)
        calendar_ids = json.loads(integration.selected_calendar_ids) if integration.selected_calendar_ids else ["primary"]
        return get_upcoming_events(access_token, calendar_ids, days_ahead)
    except Exception:
        return None
