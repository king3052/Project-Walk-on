"""
Web Push notifications. Uses the standard, free, open Web Push protocol
(VAPID) — no paid push service (Firebase, OneSignal, etc.) involved.

/subscribe and /unsubscribe are called by the logged-in user's browser.
/send-reminders is NOT user-authenticated — it's meant to be called once a
day by a free external scheduler (e.g. a GitHub Actions cron workflow),
protected instead by a shared secret header so random requests can't
trigger it.
"""
import os
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:example@example.com")
CRON_SECRET = os.getenv("CRON_SECRET")


@router.post("/subscribe")
def subscribe(
    payload: schemas.PushSubscriptionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.endpoint == payload.endpoint
    ).first()
    if existing:
        existing.user_id = current_user_id
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
    else:
        db.add(models.PushSubscription(user_id=current_user_id, **payload.model_dump()))
    db.commit()
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(
    payload: schemas.PushSubscriptionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    db.query(models.PushSubscription).filter(
        models.PushSubscription.endpoint == payload.endpoint,
        models.PushSubscription.user_id == current_user_id,
    ).delete()
    db.commit()
    return {"unsubscribed": True}


def _send_push(sub: models.PushSubscription, title: str, body: str) -> bool:
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=f'{{"title": "{title}", "body": "{body}"}}',
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
        )
        return True
    except WebPushException:
        return False


@router.post("/send-reminders")
def send_reminders(
    x_cron_secret: str = Header(None),
    db: Session = Depends(get_db),
):
    if not CRON_SECRET or x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="VAPID_PRIVATE_KEY not configured")

    today = date.today()
    subs = db.query(models.PushSubscription).all()
    sent = 0
    stale = []

    for sub in subs:
        # Skip anyone who's already logged something today across the main log types
        logged_today = any([
            db.query(models.TrainingSession).filter(
                models.TrainingSession.user_id == sub.user_id, models.TrainingSession.date == today
            ).first(),
            db.query(models.ShootingLog).filter(
                models.ShootingLog.user_id == sub.user_id, models.ShootingLog.date == today
            ).first(),
            db.query(models.NutritionLog).filter(
                models.NutritionLog.user_id == sub.user_id, models.NutritionLog.date == today
            ).first(),
        ])
        if logged_today:
            continue

        ok = _send_push(sub, "Project Walk-On", "You haven't logged anything today — keep your streak going.")
        if ok:
            sent += 1
        else:
            stale.append(sub.id)

    if stale:
        db.query(models.PushSubscription).filter(models.PushSubscription.id.in_(stale)).delete(
            synchronize_session=False
        )
        db.commit()

    return {"sent": sent, "removed_stale_subscriptions": len(stale)}
