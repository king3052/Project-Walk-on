"""
Sports Science Lab.

Training load uses the standard "session-RPE" method (Foster et al.):
  load = duration (minutes) x RPE (1-10 rate of perceived exertion)
This only counts sessions where both duration and RPE were actually
logged — it does not guess at missing values, so days with incomplete
data simply contribute 0 rather than a fabricated number.

ACWR (Acute:Chronic Workload Ratio) = 7-day average load / 28-day average
load. This is the standard sports-science heuristic for workload spikes:
~0.8-1.3 is the commonly cited "sweet spot"; well above 1.3 is associated
with elevated injury risk in the research it's drawn from; well below 0.8
suggests detraining. This is a population-level heuristic, not a medical
diagnosis for any individual.

The readiness score blends the ACWR position with recent recovery data
(sleep, soreness, energy) into a single 0-100 number with a plain-language
label. It's meant as a directional signal to plan around, not a clinical
readiness assessment.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/sports-science", tags=["sports-science"])


def _acwr_component(acwr: float | None) -> float:
    if acwr is None:
        return 70.0
    if 0.8 <= acwr <= 1.3:
        return 100.0
    if acwr < 0.8:
        return max(50.0, 100.0 - (0.8 - acwr) * 125)
    return max(0.0, 100.0 - (acwr - 1.3) * 100)


@router.get("/{user_id}", response_model=schemas.SportsScienceOut)
def get_sports_science(
    user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    user_id = current_user_id  # ignore path value — always operate as the verified caller
    today = date.today()
    window_start = today - timedelta(days=27)  # 28-day window inclusive of today

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

    daily_totals: dict[date, float] = {window_start + timedelta(days=i): 0.0 for i in range(28)}
    for s in sessions:
        if s.date in daily_totals:
            daily_totals[s.date] += (s.duration_min or 0) * (s.rpe or 0)
    for c in conditioning:
        if c.date in daily_totals:
            daily_totals[c.date] += ((c.duration_sec or 0) / 60.0) * (c.rpe or 0)

    daily_load = [
        schemas.DailyLoadPoint(date=d, load=round(load, 1)) for d, load in sorted(daily_totals.items())
    ]

    last_7 = [p.load for p in daily_load if p.date > today - timedelta(days=7)]
    last_28 = [p.load for p in daily_load]
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

    return schemas.SportsScienceOut(
        daily_load=daily_load,
        acute_load=acute_load,
        chronic_load=chronic_load,
        acwr=acwr,
        readiness_score=readiness_score,
        readiness_label=label,
        readiness_note=note,
    )
