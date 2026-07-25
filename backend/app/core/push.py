"""
Shared push-notification sending logic. Extracted from the notifications
router so other routers (coach, tennis matches/scoring) can trigger a push
to a specific user without importing router modules into each other.
"""
import os

from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.models import models

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:example@example.com")


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
    except Exception:
        # Never let a notification failure break the calling endpoint's
        # actual work (creating an assignment, logging a match, etc.)
        return False


def notify_user(db: Session, user_id: str, title: str, body: str) -> None:
    """Best-effort push to every device a user has subscribed on. Silently
    does nothing if push isn't configured or the user has no subscriptions —
    callers should never have to check that themselves."""
    if not VAPID_PRIVATE_KEY:
        return
    subs = db.query(models.PushSubscription).filter(models.PushSubscription.user_id == user_id).all()
    stale = []
    for sub in subs:
        if not _send_push(sub, title, body):
            stale.append(sub.id)
    if stale:
        db.query(models.PushSubscription).filter(models.PushSubscription.id.in_(stale)).delete(
            synchronize_session=False
        )
        db.commit()
