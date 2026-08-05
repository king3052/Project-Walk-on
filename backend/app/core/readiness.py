"""
Readiness score computation, extracted from app/routers/sports_science.py
so both that endpoint and the Morning Briefing can share one implementation
instead of two copies that could silently drift apart.

See sports_science.py's module docstring for the full methodology notes
(session-RPE training load, ACWR, the 0-100 readiness blend).
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import models


def _acwr_component(acwr):
    if acwr is None:
        return 70.0
    if 0.8 <= acwr <= 1.3:
        return 100.0
    if acwr < 0.8:
        return max(50.0, 100.0 - (0.8 - acwr) * 125)
    return max(0.0, 100.0 - (acwr - 1.3) * 100)


def compute_readiness(db: Session, user_id: str) -> dict:
    today = date.today()
    window_start = today - timedelta(days=27)

    sessions = (
        db.query(models.TrainingSession)
        .filter(
            models.TrainingSession.user_id == user_id,
            models.TrainingSession.date >= window_start,
            models.TrainingSession.duration_min.isnot(None),
            models.TrainingSession.rpe.isnot(None),
        )
        .all()
    )
    conditioning = (
        db.query(models.ConditioningLog)
        .filter(
            models.ConditioningLog.user_id == user_id,
            models.ConditioningLog.date >= window_start,
            models.ConditioningLog.duration_sec.isnot(None),
            models.ConditioningLog.rpe.isnot(None),
        )
        .all()
    )

    daily_totals = {window_start + timedelta(days=i): 0.0 for i in range(28)}
    for s in sessions:
        if s.date in daily_totals:
            daily_totals[s.date] += (s.duration_min or 0) * (s.rpe or 0)
    for c in conditioning:
        if c.date in daily_totals:
            daily_totals[c.date] += ((c.duration_sec or 0) / 60.0) * (c.rpe or 0)

    daily_load = sorted(daily_totals.items())
    last_7 = [load for d, load in daily_load if d > today - timedelta(days=7)]
    last_28 = [load for d, load in daily_load]
    acute_load = round(sum(last_7) / 7, 1)
    chronic_load = round(sum(last_28) / 28, 1)
    acwr = round(acute_load / chronic_load, 2) if chronic_load > 0 else None

    recent_start = today - timedelta(days=3)
    recovery_rows = (
        db.query(models.RecoveryLog)
        .filter(models.RecoveryLog.user_id == user_id, models.RecoveryLog.date >= recent_start)
        .all()
    )
    avg_sleep = (
        sum(r.sleep_hours for r in recovery_rows if r.sleep_hours) / len([r for r in recovery_rows if r.sleep_hours])
        if any(r.sleep_hours for r in recovery_rows)
        else None
    )
    avg_soreness = (
        sum(r.soreness for r in recovery_rows if r.soreness) / len([r for r in recovery_rows if r.soreness])
        if any(r.soreness for r in recovery_rows)
        else None
    )
    avg_energy = (
        sum(r.energy for r in recovery_rows if r.energy) / len([r for r in recovery_rows if r.energy])
        if any(r.energy for r in recovery_rows)
        else None
    )

    sleep_score = min(avg_sleep / 8.0, 1.0) * 100 if avg_sleep else 70.0
    soreness_score = (10 - avg_soreness) / 9 * 100 if avg_soreness else 70.0
    energy_score = (avg_energy - 1) / 9 * 100 if avg_energy else 70.0
    recovery_component = (sleep_score + soreness_score + energy_score) / 3

    acwr_component = _acwr_component(acwr)
    readiness_score = round(0.6 * acwr_component + 0.4 * recovery_component)

    if readiness_score >= 80:
        label, note = "Ready to push", "Workload and recovery both look solid."
    elif readiness_score >= 60:
        label, note = "Moderate", "Train as planned — nothing flagging concern right now."
    elif readiness_score >= 40:
        label, note = "Caution", "Consider a lighter session today — load or recovery is trending off."
    else:
        label, note = "High risk", "Load spike and/or poor recovery — prioritize rest and light work."

    if acwr is not None and acwr > 1.3:
        note = f"ACWR is {acwr} (above the 1.3 sweet-spot ceiling) — that's the main driver here."
    elif chronic_load == 0:
        note = "Not enough logged sessions with duration + RPE yet to compute a real trend."

    return {
        "acute_load": acute_load,
        "chronic_load": chronic_load,
        "acwr": acwr,
        "readiness_score": readiness_score,
        "readiness_label": label,
        "readiness_note": note,
    }
