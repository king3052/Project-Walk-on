import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.learning_content import RESOURCES_BY_SPORT, BASKETBALL_LEARNING_RESOURCES
from app.models import models

router = APIRouter(prefix="/learning", tags=["learning"])


def _resources_for(user: models.User | None):
    sport = user.sport if user and user.sport else "Basketball"
    return RESOURCES_BY_SPORT.get(sport, BASKETBALL_LEARNING_RESOURCES)


@router.get("/resources")
def get_resources(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).get(current_user_id)
    return _resources_for(user)


@router.get("/recommended")
def get_recommended(
    current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)
):
    user = db.query(models.User).get(current_user_id)
    resources = _resources_for(user)
    sport = user.sport if user and user.sport else "Basketball"

    weak_points = []

    latest_report = (
        db.query(models.ScoutingReport)
        .filter(models.ScoutingReport.user_id == current_user_id)
        .order_by(models.ScoutingReport.report_month.desc())
        .first()
    )
    if latest_report and latest_report.needs_improvement:
        weak_points.extend(latest_report.needs_improvement.split("\n"))

    incomplete_goals = (
        db.query(models.Goal)
        .filter(models.Goal.user_id == current_user_id, models.Goal.status != models.GoalStatus.ACHIEVED)
        .limit(5)
        .all()
    )
    if incomplete_goals:
        weak_points.extend(g.title for g in incomplete_goals)

    active_injuries = (
        db.query(models.Injury)
        .filter(models.Injury.user_id == current_user_id, models.Injury.status != models.InjuryStatus.RESOLVED)
        .all()
    )
    if active_injuries:
        weak_points.extend(f"Current injury: {i.body_part}" for i in active_injuries)

    categories = sorted(set(r["category"] for r in resources))

    if not weak_points:
        return {"picks": [], "note": "Log a scouting report or some goals first for personalized picks."}

    prompt = (
        f"A {sport.lower()} athlete has these logged weak points / active goals / injuries:\n"
        f"{chr(10).join('- ' + w for w in weak_points)}\n\n"
        f"Available learning topic categories: {', '.join(categories)}\n\n"
        "Pick the 2-3 categories from that exact list most relevant right now, and for each give a "
        "one-sentence reason tied to the specific weak point/goal/injury above. Respond with ONLY "
        'valid JSON: {"picks": [{"category": "...", "reason": "..."}]}'
    )
    raw = call_groq(prompt, max_tokens=300, json_mode=True)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"picks": [], "note": "Couldn't generate picks right now."}

    return parsed
