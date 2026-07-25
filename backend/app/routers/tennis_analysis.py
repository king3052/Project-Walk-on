import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.tennis_scoring import replay_match, summarize_points
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/analysis", tags=["tennis-analysis"])

MATCHES_TO_ANALYZE = 10


def _match_summary_block(db: Session, match: models.TennisMatch) -> str:
    rows = (
        db.query(models.TennisPointLog)
        .filter(models.TennisPointLog.match_id == match.id)
        .order_by(models.TennisPointLog.sequence.asc())
        .all()
    )
    lines = [f"Match on {match.date} vs {match.opponent or 'unknown'} ({match.result or 'result unknown'}, {match.score or 'no score'})"]
    if rows:
        state = replay_match(
            [{"description": r.description, "won": r.won, "shot_type": r.shot_type, "outcome_type": r.outcome_type} for r in rows],
            scoring_format=match.scoring_format or "best_of_3",
            no_ad=bool(match.no_ad),
            first_server=match.first_server or "Me",
        )
        agg = summarize_points(state)
        bp = agg["break_points"]
        if bp["me_chances"]:
            lines.append(f"  Break points: converted {bp['me_won']}/{bp['me_chances']}")
        if bp["opp_chances"]:
            lines.append(f"  Break points faced: saved {bp['opp_chances'] - bp['opp_won']}/{bp['opp_chances']}")
        if agg["shot_type_outcomes"]:
            lines.append("  Tagged shots: " + ", ".join(f"{k} x{v}" for k, v in agg["shot_type_outcomes"].items()))
    if match.first_serve_pct is not None:
        lines.append(f"  First serve %: {match.first_serve_pct}")
    if match.unforced_errors is not None:
        lines.append(f"  Unforced errors: {match.unforced_errors}")
    return "\n".join(lines)


@router.get("/profile", response_model=schemas.TennisScoutingProfileOut)
def get_profile(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    profile = (
        db.query(models.TennisScoutingProfile)
        .filter(models.TennisScoutingProfile.user_id == current_user_id)
        .first()
    )
    if not profile:
        profile = models.TennisScoutingProfile(user_id=current_user_id, matches_analyzed=0)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("/profile/refresh", response_model=schemas.TennisScoutingProfileOut)
def refresh_profile(
    current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)
):
    matches = (
        db.query(models.TennisMatch)
        .filter(models.TennisMatch.user_id == current_user_id, models.TennisMatch.result.isnot(None))
        .order_by(models.TennisMatch.date.desc())
        .limit(MATCHES_TO_ANALYZE)
        .all()
    )
    if not matches:
        raise HTTPException(status_code=400, detail="No completed matches yet to analyze.")

    existing = (
        db.query(models.TennisScoutingProfile)
        .filter(models.TennisScoutingProfile.user_id == current_user_id)
        .first()
    )

    match_blocks = [_match_summary_block(db, m) for m in reversed(matches)]

    prior_profile_block = ""
    if existing and existing.summary:
        prior_profile_block = (
            f"\n\nYour previous standing profile (for reference — note whether these trends are "
            f"continuing, improving, or reversing):\nSummary: {existing.summary}\n"
            f"Strengths: {existing.strengths}\nWeaknesses: {existing.weaknesses}"
        )

    prompt = (
        f"You are a tennis coach reviewing an athlete's last {len(matches)} matches TOGETHER, looking "
        "for trends a single match can't show — recurring strengths, recurring weaknesses, and whether "
        "things are improving or getting worse over time. Be specific and cite actual matches/numbers "
        "from the data below — don't invent anything. Respond with ONLY valid JSON: "
        '{"summary": "2-3 sentence overview of trajectory", "strengths": "recurring strengths, cite matches", '
        '"weaknesses": "recurring weaknesses, cite matches"}\n\n'
        f"Matches (oldest to most recent):\n" + "\n\n".join(match_blocks) + prior_profile_block
    )
    raw = call_groq(prompt, max_tokens=600, json_mode=True)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Could not parse the AI's response")

    if not existing:
        existing = models.TennisScoutingProfile(user_id=current_user_id)
        db.add(existing)
    existing.summary = parsed.get("summary")
    existing.strengths = parsed.get("strengths")
    existing.weaknesses = parsed.get("weaknesses")
    existing.matches_analyzed = len(matches)
    existing.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(existing)
    return existing


@router.get("/opponent/{opponent_name}")
def get_opponent_history(
    opponent_name: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    matches = (
        db.query(models.TennisMatch)
        .filter(
            models.TennisMatch.user_id == current_user_id,
            models.TennisMatch.opponent.ilike(opponent_name),
        )
        .order_by(models.TennisMatch.date.desc())
        .all()
    )
    wins = sum(1 for m in matches if m.result == "Win")
    losses = sum(1 for m in matches if m.result == "Loss")
    return {
        "opponent": opponent_name,
        "matches_played": len(matches),
        "wins": wins,
        "losses": losses,
        "matches": [
            {"date": m.date, "result": m.result, "score": m.score, "surface": m.surface} for m in matches
        ],
    }
