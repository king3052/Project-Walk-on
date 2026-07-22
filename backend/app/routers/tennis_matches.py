from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/matches", tags=["tennis"])


@router.post("/", response_model=schemas.TennisMatchOut)
def create_match(
    payload: schemas.TennisMatchCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["user_id"] = current_user_id
    match = models.TennisMatch(**data)
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/", response_model=list[schemas.TennisMatchOut])
def list_matches(
    days: int = 365, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    from datetime import date, timedelta

    return (
        db.query(models.TennisMatch)
        .filter(
            models.TennisMatch.user_id == current_user_id,
            models.TennisMatch.date >= date.today() - timedelta(days=days),
        )
        .order_by(models.TennisMatch.date.desc())
        .all()
    )


@router.patch("/{match_id}", response_model=schemas.TennisMatchOut)
def update_match(
    match_id: str,
    payload: schemas.TennisMatchUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    match = db.query(models.TennisMatch).get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your match")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(match, k, v)
    db.commit()
    db.refresh(match)
    return match


@router.delete("/{match_id}")
def delete_match(
    match_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    match = db.query(models.TennisMatch).get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your match")
    db.query(models.TennisMatchScouting).filter(models.TennisMatchScouting.match_id == match_id).delete(
        synchronize_session=False
    )
    db.delete(match)
    db.commit()
    return {"deleted": True}


@router.post("/{match_id}/scout", response_model=schemas.TennisMatchScoutingOut)
def generate_match_scouting(
    match_id: str,
    current_user_id: str = Depends(check_ai_rate_limit),
    db: Session = Depends(get_db),
):
    match = db.query(models.TennisMatch).get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your match")

    stats_lines = [
        f"Opponent: {match.opponent or 'unknown'}",
        f"Result: {match.result or 'unknown'} ({match.score or 'no score recorded'})",
        f"Surface: {match.surface or 'unknown'}",
    ]
    if match.first_serve_pct is not None:
        stats_lines.append(f"First serve %: {match.first_serve_pct}")
    if match.second_serve_pct is not None:
        stats_lines.append(f"Second serve %: {match.second_serve_pct}")
    if match.aces is not None:
        stats_lines.append(f"Aces: {match.aces}")
    if match.double_faults is not None:
        stats_lines.append(f"Double faults: {match.double_faults}")
    if match.winners is not None:
        stats_lines.append(f"Winners: {match.winners}")
    if match.unforced_errors is not None:
        stats_lines.append(f"Unforced errors: {match.unforced_errors}")
    if match.break_points_total:
        stats_lines.append(f"Break points: {match.break_points_won or 0}/{match.break_points_total}")
    if match.net_points_total:
        stats_lines.append(f"Net points: {match.net_points_won or 0}/{match.net_points_total}")
    if match.return_pct is not None:
        stats_lines.append(f"Return %: {match.return_pct}")
    if match.notes:
        stats_lines.append(f"Player notes: {match.notes}")

    prompt = (
        "You are a tennis coach analyzing one match's stats, given below. Identify 2-3 strengths, "
        "2-3 weaknesses, and any tactical patterns worth noting. Be specific to the numbers given — "
        "don't invent stats that aren't there. Respond with ONLY valid JSON: "
        '{"strengths": "text", "weaknesses": "text", "patterns": "text"}\n\n'
        f"{chr(10).join(stats_lines)}"
    )
    import json

    raw = call_groq(prompt, max_tokens=350, json_mode=True)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Could not parse the AI's response")

    scouting = models.TennisMatchScouting(
        match_id=match_id,
        user_id=current_user_id,
        strengths=parsed.get("strengths"),
        weaknesses=parsed.get("weaknesses"),
        patterns=parsed.get("patterns"),
    )
    db.add(scouting)
    db.commit()
    db.refresh(scouting)
    return scouting


@router.get("/{match_id}/scout", response_model=list[schemas.TennisMatchScoutingOut])
def get_match_scouting(
    match_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    return (
        db.query(models.TennisMatchScouting)
        .filter(models.TennisMatchScouting.match_id == match_id, models.TennisMatchScouting.user_id == current_user_id)
        .order_by(models.TennisMatchScouting.created_at.desc())
        .all()
    )
