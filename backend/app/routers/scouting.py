import json
import os
from datetime import date, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/scouting-reports", tags=["scouting"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def _gather_profile_data(db: Session, user_id: str) -> str:
    """Pull career-to-date bests and current standing — broader than the AI Coach's weekly window."""
    user = db.query(models.User).get(user_id)
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == user_id).first()

    def best_1rm(exercise_name: str):
        row = (
            db.query(models.StrengthLog)
            .join(models.TrainingSession)
            .filter(
                models.TrainingSession.user_id == user_id,
                models.StrengthLog.exercise.ilike(exercise_name),
            )
            .order_by(models.StrengthLog.estimated_1rm.desc())
            .first()
        )
        return row.estimated_1rm if row else None

    bench = best_1rm("bench%")
    squat = best_1rm("squat%")
    deadlift = best_1rm("deadlift%")

    last_30 = date.today() - timedelta(days=30)
    shots = (
        db.query(models.ShootingLog)
        .filter(models.ShootingLog.user_id == user_id, models.ShootingLog.date >= last_30)
        .all()
    )
    total_attempts = sum(s.attempts for s in shots)
    total_makes = sum(s.makes for s in shots)
    shooting_pct = round((total_makes / total_attempts) * 100, 1) if total_attempts else None

    pr_count = (
        db.query(func.count(models.StrengthLog.id))
        .join(models.TrainingSession)
        .filter(models.TrainingSession.user_id == user_id, models.StrengthLog.is_pr == 1)
        .scalar()
    )

    active_days = set()
    for model, date_col in [
        (models.NutritionLog, models.NutritionLog.date),
        (models.RecoveryLog, models.RecoveryLog.date),
        (models.ShootingLog, models.ShootingLog.date),
        (models.BodyweightLog, models.BodyweightLog.date),
        (models.ConditioningLog, models.ConditioningLog.date),
        (models.TrainingSession, models.TrainingSession.date),
    ]:
        rows = db.query(date_col).filter(model.user_id == user_id, date_col >= last_30).distinct().all()
        active_days.update(r[0] for r in rows)

    lines = [
        f"Name: {user.name if user else 'Unknown'}",
        f"Position: {user.position if user else 'Unknown'}",
        f"Height: {user.height_in} in" if user and user.height_in else "Height: not recorded",
        f"Weight: {user.weight_lb} lb (goal: {profile.goal_weight_lb if profile else 'none'})" if user else "",
        f"Wingspan: {profile.wingspan_in} in" if profile and profile.wingspan_in else "",
        f"Vertical jump: {profile.vertical_in} in" if profile and profile.vertical_in else "",
        f"Bench 1RM: {bench} lb (goal {profile.goal_bench_lb if profile else 'none'})" if bench else "Bench: no data logged",
        f"Squat 1RM: {squat} lb (goal {profile.goal_squat_lb if profile else 'none'})" if squat else "Squat: no data logged",
        f"Deadlift 1RM: {deadlift} lb" if deadlift else "Deadlift: no data logged",
        f"Shooting % (last 30 days): {shooting_pct}%" if shooting_pct is not None else "Shooting: no data logged",
        f"PRs hit (all time): {pr_count}",
        f"Active training days (last 30): {len(active_days)}/30",
    ]
    return "\n".join(l for l in lines if l)


@router.post("/{user_id}/generate", response_model=schemas.ScoutingReportOut)
def generate_report(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user_id = current_user_id  # ignore path value — always operate as the verified caller
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not set in backend/.env — add it to enable scouting reports.",
        )

    data_block = _gather_profile_data(db, user_id)

    prompt = (
        "You are a college basketball scout writing a short, honest evaluation of a player based "
        "on the real training data below. Do not invent stats that aren't given. Respond with ONLY "
        "valid JSON, no markdown fences, no extra text, in exactly this shape:\n"
        '{"strengths": ["...", "..."], "needs_improvement": ["...", "..."], '
        '"overall_grade": "B+", "next_priority": "one sentence"}\n'
        "Give 2-4 strengths and 2-4 areas to improve, each a short phrase (under 12 words). "
        "overall_grade is a single letter grade with optional +/-, based on how close testing/strength "
        "numbers are to stated goals and how consistently the athlete is logging training.\n\n"
        f"Player data:\n{data_block}"
    )

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "max_tokens": 500,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
    except (requests.RequestException, json.JSONDecodeError, KeyError) as e:
        raise HTTPException(status_code=502, detail=f"Scouting report generation failed: {e}")

    report = models.ScoutingReport(
        user_id=user_id,
        report_month=date.today().replace(day=1),
        strengths="\n".join(parsed.get("strengths", [])),
        needs_improvement="\n".join(parsed.get("needs_improvement", [])),
        overall_grade=parsed.get("overall_grade"),
        next_priority=parsed.get("next_priority"),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/user/{user_id}", response_model=list[schemas.ScoutingReportOut])
def list_reports(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user_id = current_user_id
    return (
        db.query(models.ScoutingReport)
        .filter(models.ScoutingReport.user_id == user_id)
        .order_by(models.ScoutingReport.report_month.desc())
        .all()
    )
