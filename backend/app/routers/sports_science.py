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
from app.core.readiness import compute_readiness
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/sports-science", tags=["sports-science"])


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

    readiness = compute_readiness(db, user_id)

    return schemas.SportsScienceOut(
        daily_load=daily_load,
        acute_load=readiness["acute_load"],
        chronic_load=readiness["chronic_load"],
        acwr=readiness["acwr"],
        readiness_score=readiness["readiness_score"],
        readiness_label=readiness["readiness_label"],
        readiness_note=readiness["readiness_note"],
    )
