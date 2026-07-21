from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.models import models

router = APIRouter(prefix="/planner", tags=["planner"])


@router.get("/today")
def get_today_plan(current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)):
    today = date.today()
    recent_start = today - timedelta(days=3)

    recovery_rows = (
        db.query(models.RecoveryLog)
        .filter(models.RecoveryLog.user_id == current_user_id, models.RecoveryLog.date >= recent_start)
        .all()
    )
    sleep_vals = [r.sleep_hours for r in recovery_rows if r.sleep_hours]
    soreness_vals = [r.soreness for r in recovery_rows if r.soreness]
    avg_sleep = sum(sleep_vals) / len(sleep_vals) if sleep_vals else None
    avg_soreness = sum(soreness_vals) / len(soreness_vals) if soreness_vals else None

    todays_items = (
        db.query(models.ScheduledWorkout)
        .filter(models.ScheduledWorkout.user_id == current_user_id, models.ScheduledWorkout.date == today)
        .all()
    )
    incomplete_goals = (
        db.query(models.Goal)
        .filter(models.Goal.user_id == current_user_id, models.Goal.status != models.GoalStatus.ACHIEVED)
        .limit(5)
        .all()
    )
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == current_user_id).first()

    lines = []
    if profile and profile.experience_level:
        lines.append(f"Experience level: {profile.experience_level}")
    if profile and profile.training_days_per_week:
        lines.append(f"Typical training availability: {profile.training_days_per_week} days/week")
    if avg_sleep is not None:
        lines.append(f"Avg sleep (last 3 days): {round(avg_sleep, 1)}h")
    if avg_soreness is not None:
        lines.append(f"Avg soreness (last 3 days, 1-10): {round(avg_soreness, 1)}")
    if todays_items:
        lines.append(
            "Scheduled today: " + ", ".join(f"{i.workout_type}: {i.title}" for i in todays_items)
        )
    else:
        lines.append("Nothing scheduled today yet.")
    if incomplete_goals:
        lines.append("Active goals: " + ", ".join(g.title for g in incomplete_goals))

    context = "\n".join(lines) if lines else "No recent data logged."

    prompt = (
        "You are an athlete performance coach. Based on the athlete's recent recovery data, what's "
        "scheduled today, and their active goals, give ONE short, direct recommendation (2-3 sentences) "
        "for what to prioritize today. Be specific and reference the actual data given — don't invent "
        "numbers. If there's not enough data to say anything useful, say so plainly rather than guessing.\n\n"
        f"{context}"
    )
    suggestion = call_groq(prompt, max_tokens=200)
    return {"suggestion": suggestion, "context": context}
