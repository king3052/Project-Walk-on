import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/coach", tags=["coach"])


def _generate_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


def _require_active_link(db: Session, coach_id: str, player_id: str) -> models.CoachPlayerLink:
    """The single choke point every coach-views-player-data endpoint must
    go through. Raises 403 unless an ACTIVE link exists between exactly
    this coach and exactly this player — a revoked or nonexistent link
    fails closed."""
    link = (
        db.query(models.CoachPlayerLink)
        .filter(
            models.CoachPlayerLink.coach_user_id == coach_id,
            models.CoachPlayerLink.player_user_id == player_id,
            models.CoachPlayerLink.active.is_(True),
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="No active coaching link to this player")
    return link


@router.post("/invite-code", response_model=schemas.CoachInviteCodeOut)
def generate_invite_code(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    code_row = models.CoachInviteCode(player_user_id=current_user_id, code=_generate_code())
    db.add(code_row)
    db.commit()
    db.refresh(code_row)
    return code_row


@router.post("/link")
def redeem_invite_code(
    payload: schemas.RedeemCodeRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    coach = db.query(models.User).get(current_user_id)
    if not coach or coach.role != "Coach":
        raise HTTPException(status_code=403, detail="Only Coach accounts can redeem an invite code")

    code_row = (
        db.query(models.CoachInviteCode)
        .filter(models.CoachInviteCode.code == payload.code.strip().upper(), models.CoachInviteCode.used.is_(False))
        .first()
    )
    if not code_row:
        raise HTTPException(status_code=404, detail="Invalid or already-used code")
    if code_row.player_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="You can't coach yourself")

    code_row.used = True
    code_row.used_by_coach_id = current_user_id

    existing = (
        db.query(models.CoachPlayerLink)
        .filter(
            models.CoachPlayerLink.coach_user_id == current_user_id,
            models.CoachPlayerLink.player_user_id == code_row.player_user_id,
        )
        .first()
    )
    if existing:
        existing.active = True
    else:
        db.add(models.CoachPlayerLink(coach_user_id=current_user_id, player_user_id=code_row.player_user_id))
    db.commit()
    return {"linked": True}


@router.get("/players", response_model=list[schemas.LinkedPlayerOut])
def list_my_players(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    links = (
        db.query(models.CoachPlayerLink)
        .filter(models.CoachPlayerLink.coach_user_id == current_user_id, models.CoachPlayerLink.active.is_(True))
        .all()
    )
    result = []
    for link in links:
        player = db.query(models.User).get(link.player_user_id)
        if player:
            result.append(schemas.LinkedPlayerOut(
                link_id=link.id, player_user_id=player.id, player_name=player.name,
                player_sport=player.sport, linked_since=link.created_at,
            ))
    return result


@router.get("/my-coaches", response_model=list[schemas.LinkedCoachOut])
def list_my_coaches(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    links = (
        db.query(models.CoachPlayerLink)
        .filter(models.CoachPlayerLink.player_user_id == current_user_id, models.CoachPlayerLink.active.is_(True))
        .all()
    )
    result = []
    for link in links:
        coach = db.query(models.User).get(link.coach_user_id)
        if coach:
            result.append(schemas.LinkedCoachOut(
                link_id=link.id, coach_user_id=coach.id, coach_name=coach.name, linked_since=link.created_at,
            ))
    return result


@router.delete("/links/{link_id}")
def revoke_link(link_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    link = db.query(models.CoachPlayerLink).get(link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if current_user_id not in (link.coach_user_id, link.player_user_id):
        raise HTTPException(status_code=403, detail="Not part of this coaching relationship")
    link.active = False
    db.commit()
    return {"revoked": True}


@router.get("/visibility-settings", response_model=schemas.VisibilitySettingsOut)
def get_visibility_settings(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    settings = (
        db.query(models.PlayerVisibilitySettings)
        .filter(models.PlayerVisibilitySettings.player_user_id == current_user_id)
        .first()
    )
    if not settings:
        settings = models.PlayerVisibilitySettings(player_user_id=current_user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.patch("/visibility-settings", response_model=schemas.VisibilitySettingsOut)
def update_visibility_settings(
    payload: schemas.VisibilitySettingsUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    settings = (
        db.query(models.PlayerVisibilitySettings)
        .filter(models.PlayerVisibilitySettings.player_user_id == current_user_id)
        .first()
    )
    if not settings:
        settings = models.PlayerVisibilitySettings(player_user_id=current_user_id)
        db.add(settings)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/players/{player_id}/dashboard")
def get_player_dashboard(
    player_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    _require_active_link(db, current_user_id, player_id)

    player = db.query(models.User).get(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    visibility = (
        db.query(models.PlayerVisibilitySettings)
        .filter(models.PlayerVisibilitySettings.player_user_id == player_id)
        .first()
    )
    share_journal = bool(visibility and visibility.share_journal)
    share_mental = bool(visibility and visibility.share_mental)

    matches = (
        db.query(models.TennisMatch)
        .filter(models.TennisMatch.user_id == player_id)
        .order_by(models.TennisMatch.date.desc())
        .limit(10)
        .all()
    )
    practice_sessions = (
        db.query(models.TennisPracticeSession)
        .filter(models.TennisPracticeSession.user_id == player_id)
        .order_by(models.TennisPracticeSession.date.desc())
        .limit(10)
        .all()
    )
    goals = db.query(models.Goal).filter(models.Goal.user_id == player_id).all()

    result = {
        "player_name": player.name,
        "player_sport": player.sport,
        "matches": [
            {"id": m.id, "date": m.date, "opponent": m.opponent, "result": m.result, "score": m.score}
            for m in matches
        ],
        "practice_sessions": [
            {"id": p.id, "date": p.date, "duration_min": p.duration_min, "focus_area": p.focus_area}
            for p in practice_sessions
        ],
        "goals": [{"id": g.id, "title": g.title, "status": g.status.value if hasattr(g.status, "value") else g.status} for g in goals],
        "journal_shared": share_journal,
        "mental_shared": share_mental,
    }

    if share_journal:
        journal_entries = (
            db.query(models.JournalEntry)
            .filter(models.JournalEntry.user_id == player_id)
            .order_by(models.JournalEntry.date.desc())
            .limit(10)
            .all()
        )
        result["journal"] = [
            {"date": j.date, "went_well": j.went_well, "mistakes": j.mistakes} for j in journal_entries
        ]

    if share_mental:
        mental_logs = (
            db.query(models.TennisMentalLog)
            .filter(models.TennisMentalLog.user_id == player_id)
            .order_by(models.TennisMentalLog.date.desc())
            .limit(10)
            .all()
        )
    return result


# ---------- Comments on specific logged items ----------

_TARGET_MODELS = {
    "match": models.TennisMatch,
    "practice_session": models.TennisPracticeSession,
    "stroke_log": models.TennisStrokeLog,
}


@router.post("/players/{player_id}/comments", response_model=schemas.CoachCommentOut)
def add_comment(
    player_id: str,
    payload: schemas.CoachCommentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    is_player = current_user_id == player_id
    if not is_player:
        _require_active_link(db, current_user_id, player_id)  # must be an active coach of this player

    model = _TARGET_MODELS.get(payload.target_type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid target_type")
    target = db.query(model).get(payload.target_id)
    if not target or target.user_id != player_id:
        raise HTTPException(status_code=404, detail="Target item not found for this player")

    comment = models.CoachComment(
        player_user_id=player_id,
        author_user_id=current_user_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        comment=payload.comment,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    author = db.query(models.User).get(current_user_id)
    return schemas.CoachCommentOut(
        id=comment.id, player_user_id=comment.player_user_id, author_user_id=comment.author_user_id,
        author_name=author.name if author else None, target_type=comment.target_type,
        target_id=comment.target_id, comment=comment.comment, created_at=comment.created_at,
    )


@router.get("/players/{player_id}/comments", response_model=list[schemas.CoachCommentOut])
def list_comments(
    player_id: str,
    target_type: str,
    target_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    is_player = current_user_id == player_id
    if not is_player:
        _require_active_link(db, current_user_id, player_id)

    comments = (
        db.query(models.CoachComment)
        .filter(
            models.CoachComment.player_user_id == player_id,
            models.CoachComment.target_type == target_type,
            models.CoachComment.target_id == target_id,
        )
        .order_by(models.CoachComment.created_at.asc())
        .all()
    )
    out = []
    for c in comments:
        author = db.query(models.User).get(c.author_user_id)
        out.append(schemas.CoachCommentOut(
            id=c.id, player_user_id=c.player_user_id, author_user_id=c.author_user_id,
            author_name=author.name if author else None, target_type=c.target_type,
            target_id=c.target_id, comment=c.comment, created_at=c.created_at,
        ))
    return out


# ---------- Assignments (drills / videos) ----------

@router.post("/players/{player_id}/assignments", response_model=schemas.CoachAssignmentOut)
def create_assignment(
    player_id: str,
    payload: schemas.CoachAssignmentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    _require_active_link(db, current_user_id, player_id)
    assignment = models.CoachAssignment(coach_user_id=current_user_id, player_user_id=player_id, **payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/players/{player_id}/assignments", response_model=list[schemas.CoachAssignmentOut])
def list_assignments_for_player(
    player_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    is_player = current_user_id == player_id
    if not is_player:
        _require_active_link(db, current_user_id, player_id)
    return (
        db.query(models.CoachAssignment)
        .filter(models.CoachAssignment.player_user_id == player_id)
        .order_by(models.CoachAssignment.created_at.desc())
        .all()
    )


@router.get("/my-assignments", response_model=list[schemas.CoachAssignmentOut])
def list_my_assignments(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return (
        db.query(models.CoachAssignment)
        .filter(models.CoachAssignment.player_user_id == current_user_id)
        .order_by(models.CoachAssignment.created_at.desc())
        .all()
    )


@router.patch("/assignments/{assignment_id}/complete", response_model=schemas.CoachAssignmentOut)
def complete_assignment(
    assignment_id: str,
    payload: schemas.AssignmentCompleteRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    assignment = db.query(models.CoachAssignment).get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.player_user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    from datetime import datetime
    assignment.status = "Completed"
    assignment.player_note = payload.player_note
    assignment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    return assignment
