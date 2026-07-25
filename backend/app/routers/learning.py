import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.learning_content import RESOURCES_BY_SPORT, BASKETBALL_LEARNING_RESOURCES
from app.core.youtube import search_youtube, is_configured as youtube_configured
from app.models import models

router = APIRouter(prefix="/learning", tags=["learning"])

REFRESH_INTERVAL = timedelta(days=2)


def _resources_for(user: models.User | None):
    sport = user.sport if user and user.sport else "Basketball"
    return RESOURCES_BY_SPORT.get(sport, BASKETBALL_LEARNING_RESOURCES)


def _gather_weak_points(db: Session, user: models.User, current_user_id: str) -> list[str]:
    """Pulls current weak points from every relevant source, sport-aware.
    Shared by the category-picker (/recommended) and the live video feed
    (/personalized) so both reflect the same up-to-date picture."""
    weak_points: list[str] = []
    sport = user.sport if user and user.sport else "Basketball"

    if sport == "Tennis":
        profile = (
            db.query(models.TennisScoutingProfile)
            .filter(models.TennisScoutingProfile.user_id == current_user_id)
            .first()
        )
        if profile and profile.weaknesses:
            weak_points.extend(w.strip() for w in profile.weaknesses.split(".") if w.strip())
        else:
            latest_match_scouting = (
                db.query(models.TennisMatchScouting)
                .filter(models.TennisMatchScouting.user_id == current_user_id)
                .order_by(models.TennisMatchScouting.created_at.desc())
                .first()
            )
            if latest_match_scouting and latest_match_scouting.weaknesses:
                weak_points.extend(w.strip() for w in latest_match_scouting.weaknesses.split(".") if w.strip())
    else:
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
    weak_points.extend(g.title for g in incomplete_goals)

    active_injuries = (
        db.query(models.Injury)
        .filter(models.Injury.user_id == current_user_id, models.Injury.status != models.InjuryStatus.RESOLVED)
        .all()
    )
    weak_points.extend(f"Current injury: {i.body_part}" for i in active_injuries)

    return [w for w in weak_points if w]


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
    weak_points = _gather_weak_points(db, user, current_user_id)
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


def _refresh_feed(db: Session, user: models.User, current_user_id: str) -> list[models.LearningFeedItem]:
    sport = user.sport if user and user.sport else "Basketball"
    weak_points = _gather_weak_points(db, user, current_user_id)

    if not weak_points:
        return []

    prompt = (
        f"A {sport.lower()} athlete has these logged weak points / active goals / injuries:\n"
        f"{chr(10).join('- ' + w for w in weak_points)}\n\n"
        "Generate 3 short, specific YouTube search queries (3-6 words each) that would find real "
        "instructional videos addressing these — think like search terms, not sentences (e.g. "
        f'"{sport.lower()} second serve consistency drill", not "how to improve your second serve"). '
        'Respond with ONLY valid JSON: {"queries": [{"query": "...", "reason": "one short sentence tied to the weak point above"}]}'
    )
    raw = call_groq(prompt, max_tokens=250, json_mode=True)
    try:
        parsed = json.loads(raw)
        queries = parsed.get("queries", [])
    except json.JSONDecodeError:
        queries = []

    db.query(models.LearningFeedItem).filter(models.LearningFeedItem.user_id == current_user_id).delete(
        synchronize_session=False
    )

    new_items = []
    for q in queries[:3]:
        query_text = q.get("query")
        if not query_text:
            continue
        videos = search_youtube(query_text, max_results=1)
        for v in videos:
            item = models.LearningFeedItem(
                user_id=current_user_id,
                title=v["title"],
                video_url=v["video_url"],
                channel_title=v.get("channel_title"),
                thumbnail_url=v.get("thumbnail_url"),
                reason=q.get("reason"),
            )
            db.add(item)
            new_items.append(item)
    db.commit()
    for item in new_items:
        db.refresh(item)
    return new_items


@router.get("/personalized")
def get_personalized_feed(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    if not youtube_configured():
        return {"items": [], "note": "YouTube search isn't configured yet.", "configured": False}

    user = db.query(models.User).get(current_user_id)
    existing = (
        db.query(models.LearningFeedItem)
        .filter(models.LearningFeedItem.user_id == current_user_id)
        .order_by(models.LearningFeedItem.fetched_at.desc())
        .all()
    )

    is_stale = not existing or (datetime.utcnow() - existing[0].fetched_at) > REFRESH_INTERVAL
    if is_stale:
        items = _refresh_feed(db, user, current_user_id)
        if not items and existing:
            items = existing  # refresh produced nothing (e.g. rate limited) — keep showing the old set
    else:
        items = existing

    return {
        "items": [
            {
                "id": i.id, "title": i.title, "video_url": i.video_url,
                "channel_title": i.channel_title, "thumbnail_url": i.thumbnail_url,
                "reason": i.reason, "fetched_at": i.fetched_at,
            }
            for i in items
        ],
        "configured": True,
    }


@router.post("/personalized/refresh")
def force_refresh_feed(
    current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)
):
    if not youtube_configured():
        return {"items": [], "note": "YouTube search isn't configured yet.", "configured": False}
    user = db.query(models.User).get(current_user_id)
    items = _refresh_feed(db, user, current_user_id)
    return {
        "items": [
            {
                "id": i.id, "title": i.title, "video_url": i.video_url,
                "channel_title": i.channel_title, "thumbnail_url": i.thumbnail_url,
                "reason": i.reason, "fetched_at": i.fetched_at,
            }
            for i in items
        ],
        "configured": True,
    }
