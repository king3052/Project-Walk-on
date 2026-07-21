"""
Caps how many AI-powered requests (Groq calls) each user can make per day.
This exists purely to prevent runaway API costs — it's a plain counter row
in Postgres, no external rate-limiting service, so it costs nothing beyond
what's already running.

Every AI-calling endpoint should depend on check_ai_rate_limit. It counts
ANY AI feature (quick-log parsing, planner, film analysis, ask, AI coach,
scouting report) toward the same daily total per user, since they all hit
the same Groq account.
"""
import os
from datetime import date

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models

AI_DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "20"))


def check_ai_rate_limit(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
) -> str:
    today = date.today()
    usage = (
        db.query(models.AIUsage)
        .filter(models.AIUsage.user_id == current_user_id, models.AIUsage.date == today)
        .first()
    )
    if not usage:
        usage = models.AIUsage(user_id=current_user_id, date=today, count=0)
        db.add(usage)

    if usage.count >= AI_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"You've hit today's AI usage limit ({AI_DAILY_LIMIT} requests). Resets at midnight.",
        )

    usage.count += 1
    db.commit()
    return current_user_id
