from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.readiness import compute_readiness
from app.core.goal_projection import compute_weight_projection
from app.core import google_calendar
from app.models import models

router = APIRouter(prefix="/briefing", tags=["briefing"])


def _format_calendar_events(events: list) -> str | None:
    """events is None when not connected, [] when connected but empty,
    or a list of real Google Calendar events for roughly the next 24h."""
    if events is None:
        return None
    if not events:
        return "Nothing on the connected Google Calendar in the next day."
    lines = []
    for e in events:
        when = "all day" if e["all_day"] else e["start"]
        lines.append(f"{e['summary']} ({when})")
    return "Today's calendar: " + ", ".join(lines)


@router.get("/today")
def get_morning_briefing(current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)):
    user = db.query(models.User).get(current_user_id)
    today = date.today()

    readiness = compute_readiness(db, current_user_id)
    weight_projection = compute_weight_projection(db, current_user_id)
    calendar_events = google_calendar.get_events_for_user(db, models, current_user_id, days_ahead=1)

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

    lines = [
        f"Readiness: {readiness['readiness_score']}/100 ({readiness['readiness_label']}) — {readiness['readiness_note']}"
    ]
    if weight_projection:
        wp = weight_projection
        if wp["status"] == "on_track":
            direction = "gain" if wp["rate_lb_per_week"] > 0 else "lose"
            lines.append(
                f"Weight goal: {wp['current_weight_lb']}lb now, goal {wp['goal_weight_lb']}lb — "
                f"trending to {direction} {abs(wp['rate_lb_per_week'])}lb/week, "
                f"projected to hit goal around {wp['projected_date']}"
            )
        elif wp["status"] == "stalled_or_wrong_direction":
            lines.append(
                f"Weight goal: {wp['current_weight_lb']}lb now, goal {wp['goal_weight_lb']}lb — "
                "recent trend is flat or moving the wrong direction"
            )
        elif wp["status"] == "not_enough_data":
            lines.append(f"Weight goal: {wp['goal_weight_lb']}lb — not enough logged weigh-ins yet for a trend")

    if todays_items:
        lines.append("Scheduled today: " + ", ".join(f"{i.workout_type}: {i.title}" for i in todays_items))
    else:
        lines.append("Nothing scheduled today yet.")

    if incomplete_goals:
        lines.append("Active goals: " + ", ".join(g.title for g in incomplete_goals))

    calendar_line = _format_calendar_events(calendar_events)
    if calendar_line:
        lines.append(calendar_line)

    context = "\n".join(lines)

    prompt = (
        "You are an athlete's morning performance briefing. Given their readiness score, weight-goal "
        "trend, today's training schedule, active goals, and (if present) their real calendar events "
        "below, write a short (2-4 sentence) briefing that names the ONE highest-impact thing to focus "
        "on today. If readiness is low, factor that into the recommendation (suggest lighter work, not "
        "just 'push harder'). If the calendar shows something demanding today (an exam, a packed day, "
        "travel, etc.), factor that in too — e.g. suggesting a shorter or lighter training session isn't "
        "a bad thing to recommend when the day is genuinely full. Be specific and reference the actual "
        "data given — never invent a number, event, or fact that isn't in the data below. If there isn't "
        "enough data to say something useful, say so plainly.\n\n"
        f"{context}"
    )
    priority_narrative = call_groq(prompt, max_tokens=200)

    return {
        "player_name": user.name if user else None,
        "readiness": readiness,
        "weight_projection": weight_projection,
        "todays_items": [{"id": i.id, "workout_type": i.workout_type, "title": i.title} for i in todays_items],
        "goals": [{"id": g.id, "title": g.title} for g in incomplete_goals],
        "calendar_connected": calendar_events is not None,
        "calendar_events": calendar_events or [],
        "priority_narrative": priority_narrative,
    }
