import os
from datetime import date, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def _gather_week_summary(db: Session, user_id: str, week_start: date) -> str:
    """Turn a week of raw logs into a compact text block for the LLM prompt."""
    week_end = week_start + timedelta(days=7)

    strength = (
        db.query(models.StrengthLog, models.TrainingSession.date)
        .join(models.TrainingSession, models.StrengthLog.session_id == models.TrainingSession.id)
        .filter(
            models.TrainingSession.user_id == user_id,
            models.TrainingSession.date >= week_start,
            models.TrainingSession.date < week_end,
        )
        .all()
    )
    shooting = (
        db.query(models.ShootingLog)
        .filter(
            models.ShootingLog.user_id == user_id,
            models.ShootingLog.date >= week_start,
            models.ShootingLog.date < week_end,
        )
        .all()
    )
    recovery = (
        db.query(models.RecoveryLog)
        .filter(
            models.RecoveryLog.user_id == user_id,
            models.RecoveryLog.date >= week_start,
            models.RecoveryLog.date < week_end,
        )
        .all()
    )
    weight = (
        db.query(models.BodyweightLog)
        .filter(
            models.BodyweightLog.user_id == user_id,
            models.BodyweightLog.date >= week_start,
            models.BodyweightLog.date < week_end,
        )
        .order_by(models.BodyweightLog.date.asc())
        .all()
    )
    journal = (
        db.query(models.JournalEntry)
        .filter(
            models.JournalEntry.user_id == user_id,
            models.JournalEntry.date >= week_start,
            models.JournalEntry.date < week_end,
        )
        .all()
    )

    lines = []
    if weight:
        lines.append(f"Bodyweight entries: {[(w.date.isoformat(), w.weight_lb) for w in weight]}")
    if strength:
        lines.append(
            "Strength sets: "
            + ", ".join(f"{d.isoformat()} {s.exercise} {s.sets}x{s.reps}@{s.weight_lb}lb" for s, d in strength)
        )
    if shooting:
        lines.append(
            "Shooting: "
            + ", ".join(f"{s.date.isoformat()} {s.shot_type} {s.makes}/{s.attempts}" for s in shooting)
        )
    if recovery:
        lines.append(
            "Recovery: "
            + ", ".join(
                f"{r.date.isoformat()} sleep={r.sleep_hours}h energy={r.energy} stress={r.stress} soreness={r.soreness}"
                for r in recovery
            )
        )
    if journal:
        lines.append(
            "Journal: "
            + " | ".join(f"{j.date.isoformat()}: {j.went_well or ''} / {j.mistakes or ''}" for j in journal)
        )

    return "\n".join(lines) if lines else "No data logged this week."


@router.post("/{user_id}/generate", response_model=schemas.AICoachSummaryOut)
def generate_summary(
    user_id: str,
    week_start: date,
    current_user_id: str = Depends(check_ai_rate_limit),
    db: Session = Depends(get_db),
):
    user_id = current_user_id  # ignore path value — always operate as the verified caller
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not set in backend/.env — add it to enable the AI Coach.",
        )

    data_block = _gather_week_summary(db, user_id, week_start)

    prompt = (
        "You are an athlete performance coach writing a short, direct weekly report for a "
        "high school/college basketball player based on their logged training data below. "
        "Write 3 short sections: Wins, Weakness, Next focus. Keep it under 120 words total, "
        "concrete, and specific to the numbers given — don't invent data that isn't there.\n\n"
        f"Data for the week of {week_start.isoformat()}:\n{data_block}"
    )

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "max_tokens": 400,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        summary_text = response.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"AI Coach request failed: {e}")

    summary = models.AICoachSummary(user_id=user_id, week_start=week_start, summary_text=summary_text)
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/user/{user_id}", response_model=list[schemas.AICoachSummaryOut])
def list_summaries(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user_id = current_user_id
    return (
        db.query(models.AICoachSummary)
        .filter(models.AICoachSummary.user_id == user_id)
        .order_by(models.AICoachSummary.week_start.desc())
        .all()
    )
