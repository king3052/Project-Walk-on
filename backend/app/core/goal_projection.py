"""
Weight goal projection.

Deliberately does NOT output a fabricated "87% chance" style number —
that would imply a statistical model this data doesn't support (a handful
of noisy bodyweight readings isn't enough to responsibly claim a precise
probability). Instead this computes two honest, defensible things:

1. The actual recent rate of change (lb/week), from a real linear fit
   over logged bodyweight entries.
2. A projected date the goal would be hit AT THAT RATE, plus a plain
   on-track / stalled / wrong-direction read — grounded in the real
   numbers, not a precision-flavored guess.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import models

MIN_ENTRIES = 3
TREND_WINDOW_DAYS = 60


def compute_weight_projection(db: Session, user_id: str):
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == user_id).first()
    if not profile or not profile.goal_weight_lb:
        return None

    window_start = date.today() - timedelta(days=TREND_WINDOW_DAYS)
    logs = (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == user_id, models.BodyweightLog.date >= window_start)
        .order_by(models.BodyweightLog.date.asc())
        .all()
    )
    if len(logs) < MIN_ENTRIES:
        return {
            "goal_weight_lb": profile.goal_weight_lb,
            "current_weight_lb": logs[-1].weight_lb if logs else None,
            "rate_lb_per_week": None,
            "projected_date": None,
            "status": "not_enough_data",
        }

    x = [(log.date - logs[0].date).days for log in logs]
    y = [log.weight_lb for log in logs]
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))
    slope_per_day = numerator / denominator if denominator else 0.0
    rate_per_week = round(slope_per_day * 7, 2)

    current_weight = logs[-1].weight_lb
    goal_weight = profile.goal_weight_lb
    remaining = goal_weight - current_weight

    if abs(rate_per_week) < 0.01 or (remaining > 0) != (rate_per_week > 0):
        return {
            "goal_weight_lb": goal_weight,
            "current_weight_lb": current_weight,
            "rate_lb_per_week": rate_per_week,
            "projected_date": None,
            "status": "stalled_or_wrong_direction",
        }

    weeks_needed = remaining / rate_per_week
    projected_date = date.today() + timedelta(weeks=weeks_needed)

    return {
        "goal_weight_lb": goal_weight,
        "current_weight_lb": current_weight,
        "rate_lb_per_week": rate_per_week,
        "projected_date": projected_date.isoformat(),
        "status": "on_track",
    }
