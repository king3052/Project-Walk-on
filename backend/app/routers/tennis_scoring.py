import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.tennis_scoring import replay_match
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tennis/matches", tags=["tennis-scoring"])


def _get_match(db: Session, match_id: str, current_user_id: str) -> models.TennisMatch:
    match = db.query(models.TennisMatch).get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your match")
    return match


def _replay(db: Session, match: models.TennisMatch) -> dict:
    rows = (
        db.query(models.TennisPointLog)
        .filter(models.TennisPointLog.match_id == match.id)
        .order_by(models.TennisPointLog.sequence.asc())
        .all()
    )
    points = [{"description": r.description, "won": r.won} for r in rows]
    return replay_match(
        points,
        scoring_format=match.scoring_format or "best_of_3",
        no_ad=bool(match.no_ad),
        first_server=match.first_server or "Me",
    )


def _sync_match_summary(db: Session, match: models.TennisMatch, state: dict) -> None:
    if not state["match_complete"]:
        return
    match.result = "Win" if state["match_winner"] == "Me" else "Loss"
    match.score = state["overall_set_score"]
    db.commit()


@router.patch("/{match_id}/scoring-settings")
def update_scoring_settings(
    match_id: str,
    payload: schemas.ScoringSettingsUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    match = _get_match(db, match_id, current_user_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(match, k, v)
    db.commit()
    return _replay(db, match)


@router.get("/{match_id}/state")
def get_match_state(
    match_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    match = _get_match(db, match_id, current_user_id)
    return {
        "settings": {
            "scoring_format": match.scoring_format,
            "no_ad": match.no_ad,
            "first_server": match.first_server,
        },
        **_replay(db, match),
    }


@router.get("/{match_id}/points", response_model=list[schemas.PointOut])
def list_points(
    match_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    match = _get_match(db, match_id, current_user_id)
    return (
        db.query(models.TennisPointLog)
        .filter(models.TennisPointLog.match_id == match.id)
        .order_by(models.TennisPointLog.sequence.asc())
        .all()
    )


@router.post("/{match_id}/points")
def add_point(
    match_id: str,
    payload: schemas.PointCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    match = _get_match(db, match_id, current_user_id)
    existing_count = (
        db.query(models.TennisPointLog).filter(models.TennisPointLog.match_id == match_id).count()
    )
    point = models.TennisPointLog(
        match_id=match_id,
        sequence=existing_count + 1,
        description=payload.description,
        won=payload.won,
    )
    db.add(point)
    db.commit()

    state = _replay(db, match)
    _sync_match_summary(db, match, state)
    return state


@router.post("/{match_id}/points/bulk")
def add_points_bulk(
    match_id: str,
    payload: schemas.BulkParseResult,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    match = _get_match(db, match_id, current_user_id)
    existing_count = (
        db.query(models.TennisPointLog).filter(models.TennisPointLog.match_id == match_id).count()
    )
    for i, p in enumerate(payload.points):
        db.add(models.TennisPointLog(
            match_id=match_id,
            sequence=existing_count + i + 1,
            description=p.description,
            won=p.won,
        ))
    db.commit()

    state = _replay(db, match)
    _sync_match_summary(db, match, state)
    return state


@router.delete("/{match_id}/points/last")
def undo_last_point(
    match_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    match = _get_match(db, match_id, current_user_id)
    last = (
        db.query(models.TennisPointLog)
        .filter(models.TennisPointLog.match_id == match_id)
        .order_by(models.TennisPointLog.sequence.desc())
        .first()
    )
    if not last:
        raise HTTPException(status_code=404, detail="No points to undo")
    db.delete(last)
    db.commit()
    return _replay(db, match)


@router.post("/{match_id}/points/parse", response_model=schemas.BulkParseResult)
def parse_points_bulk(
    match_id: str,
    payload: schemas.BulkParseRequest,
    current_user_id: str = Depends(check_ai_rate_limit),
    db: Session = Depends(get_db),
):
    _get_match(db, match_id, current_user_id)

    prompt = (
        "A tennis player is transcribing point-by-point notes from a match, written after the fact. "
        "Split the text below into individual points, in order. For each point, write a short "
        "description (keep their own wording/shorthand where possible) and decide whether the "
        "tracked player (the one writing these notes, 'I'/'me') won or lost that specific point. "
        "The text often ends with an explicit \"Won\" or \"Lost\" for the whole game — use that to "
        "anchor your guess for the final point, and infer the others from context (e.g. \"error\" "
        "phrases usually mean the point was lost, \"good serve/rally/winner\" phrases usually mean "
        "won, unless the wording clearly indicates otherwise). Do not merge multiple points into one. "
        'Respond with ONLY valid JSON: {"points": [{"description": "...", "won": true}, ...]}\n\n'
        f"Text:\n{payload.text}"
    )
    raw = call_groq(prompt, max_tokens=800, json_mode=True)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Could not parse the AI's response")
    return schemas.BulkParseResult(**parsed)
