from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.ai import call_groq
from app.models import models

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    question: str


@router.post("/")
def ask_question(
    payload: AskRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    uid = current_user_id
    user = db.query(models.User).get(uid)
    since = date.today() - timedelta(days=90)

    strength = (
        db.query(models.StrengthLog, models.TrainingSession.date)
        .join(models.TrainingSession, models.StrengthLog.session_id == models.TrainingSession.id)
        .filter(models.TrainingSession.user_id == uid, models.TrainingSession.date >= since)
        .order_by(models.TrainingSession.date.asc())
        .all()
    )
    shooting = (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == uid, models.ShootingLog.date >= since)
        .order_by(models.ShootingLog.date.asc())
        .all()
    )
    weight = (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == uid, models.BodyweightLog.date >= since)
        .order_by(models.BodyweightLog.date.asc())
        .all()
    )
    goals = db.query(models.Goal).filter(models.Goal.user_id == uid).all()

    lines = [f"Name: {user.name if user else 'unknown'}"]
    if weight:
        lines.append(
            "Bodyweight over time: " + ", ".join(f"{w.date.isoformat()}={w.weight_lb}lb" for w in weight)
        )
    if strength:
        lines.append(
            "Strength sessions: "
            + "; ".join(
                f"{d.isoformat()} {s.exercise} {s.sets}x{s.reps}@{s.weight_lb}lb (est.1RM~{s.estimated_1rm})"
                for s, d in strength
            )
        )
    if shooting:
        lines.append(
            "Shooting sessions: "
            + "; ".join(f"{s.date.isoformat()} {s.shot_type} {s.makes}/{s.attempts}" for s in shooting)
        )
    if goals:
        lines.append(
            "Goals: " + "; ".join(f"{g.title} ({g.status.value})" for g in goals)
        )

    data_block = "\n".join(lines) if len(lines) > 1 else "No data logged yet."

    prompt = (
        "Answer this athlete's question about their own training data, given below. Answer directly "
        "and specifically, citing actual numbers/dates from the data where relevant. If the data doesn't "
        "answer the question, say so honestly rather than guessing or inventing figures.\n\n"
        f"Data (last 90 days):\n{data_block}\n\n"
        f"Question: {payload.question}"
    )
    answer = call_groq(prompt, max_tokens=400)
    return {"answer": answer}
