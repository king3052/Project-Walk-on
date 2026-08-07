from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.readiness import compute_readiness
from app.core.checklist import mark_category_done
from app.core import google_calendar
from app.models import models
from app.schemas import schemas
from app.routers.training import epley_1rm

router = APIRouter(prefix="/mission", tags=["mission"])

HIGH_INTENSITY_CATEGORIES = {"Basketball", "Tennis", "Strength", "Athleticism", "Conditioning"}


@router.get("/today")
def get_todays_mission(current_user_id: str = Depends(check_ai_rate_limit), db: Session = Depends(get_db)):
    today = date.today()
    items = (
        db.query(models.ScheduledWorkout)
        .filter(models.ScheduledWorkout.user_id == current_user_id, models.ScheduledWorkout.date == today)
        .all()
    )

    readiness = compute_readiness(db, current_user_id)
    low_readiness = readiness["readiness_score"] < 50
    calendar_events = google_calendar.get_events_for_user(db, models, current_user_id, days_ahead=1)

    def effective_priority(item):
        p = item.priority or 3
        if low_readiness and item.workout_type in HIGH_INTENSITY_CATEGORIES:
            p = max(1, p - 1)
        return p

    incomplete = [i for i in items if not i.completed]
    ranked = sorted(incomplete, key=lambda i: effective_priority(i), reverse=True)
    top_5 = ranked[:5]
    completed_count = sum(1 for i in items if i.completed)

    focus_note = ""
    if top_5:
        item_lines = "\n".join(f"- {i.title} ({i.workout_type})" for i in top_5)
        calendar_line = ""
        if calendar_events:
            events_str = ", ".join(
                f"{e['summary']} ({'all day' if e['all_day'] else e['start']})" for e in calendar_events
            )
            calendar_line = f"\n\nToday's real calendar events: {events_str}"

        prompt = (
            f"An athlete's readiness today is {readiness['readiness_score']}/100 ({readiness['readiness_label']}). "
            f"Their top 5 priorities for today, already ranked by importance, are:\n{item_lines}"
            f"{calendar_line}\n\n"
            "Write ONE short sentence (max 25 words) framing today's overall focus — don't just repeat the "
            "list, tie it together. If readiness is low, acknowledge that framing. If the calendar shows "
            "something demanding today (exam, packed schedule, travel), factor that into the framing too. "
            "Don't invent anything not implied by the data above."
        )
        focus_note = call_groq(prompt, max_tokens=60)

    return {
        "focus_note": focus_note,
        "readiness_score": readiness["readiness_score"],
        "readiness_label": readiness["readiness_label"],
        "calendar_connected": calendar_events is not None,
        "calendar_events": calendar_events or [],
        "top_5": [
            {
                "id": i.id, "title": i.title, "workout_type": i.workout_type,
                "priority": i.priority, "completed": i.completed,
            }
            for i in top_5
        ],
        "total_items": len(items),
        "completed_count": completed_count,
        "remaining_beyond_top_5": max(0, len(incomplete) - len(top_5)),
    }


@router.post("/{scheduled_workout_id}/complete-with-detail")
def complete_with_detail(
    scheduled_workout_id: str,
    payload: schemas.MissionCompleteWithDetail,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Marks a Today's Mission item complete AND captures real structured
    detail in the same request — a strength set actually becomes a
    StrengthLog row (feeding PRs/1RM tracking), a shooting drill becomes
    real ShootingLog rows, a film note becomes a FilmSession. This is what
    makes the checklist genuinely valuable long-term instead of just ticking
    a box."""
    item = db.query(models.ScheduledWorkout).get(scheduled_workout_id)
    if not item or item.user_id != current_user_id:
        raise HTTPException(status_code=404, detail="Item not found")

    created = None

    if payload.detail_type == "strength":
        if not payload.strength:
            raise HTTPException(status_code=400, detail="strength detail required")
        s = payload.strength
        session = (
            db.query(models.TrainingSession)
            .filter(
                models.TrainingSession.user_id == current_user_id,
                models.TrainingSession.date == date.today(),
                models.TrainingSession.type == models.SessionType.STRENGTH,
            )
            .first()
        )
        if not session:
            session = models.TrainingSession(
                user_id=current_user_id, date=date.today(), type=models.SessionType.STRENGTH,
            )
            db.add(session)
            db.flush()

        est_1rm = epley_1rm(s.weight_lb, s.reps)
        prior_best = (
            db.query(models.StrengthLog)
            .join(models.TrainingSession)
            .filter(
                models.TrainingSession.user_id == current_user_id,
                models.StrengthLog.exercise == s.exercise,
            )
            .order_by(models.StrengthLog.estimated_1rm.desc())
            .first()
        )
        is_pr = 1 if (not prior_best or est_1rm > (prior_best.estimated_1rm or 0)) else 0
        log = models.StrengthLog(
            session_id=session.id, exercise=s.exercise, sets=s.sets, reps=s.reps,
            weight_lb=s.weight_lb, estimated_1rm=est_1rm, is_pr=is_pr,
        )
        db.add(log)
        db.flush()
        created = {"type": "strength", "exercise": s.exercise, "estimated_1rm": est_1rm, "is_pr": bool(is_pr)}

    elif payload.detail_type == "shooting":
        if not payload.shooting or not payload.shooting.spots:
            raise HTTPException(status_code=400, detail="shooting detail required")
        logged_spots = []
        for spot in payload.shooting.spots:
            log = models.ShootingLog(
                user_id=current_user_id, date=date.today(), shot_type=spot.shot_type,
                attempts=spot.attempts, makes=spot.makes,
            )
            db.add(log)
            logged_spots.append({"shot_type": spot.shot_type, "attempts": spot.attempts, "makes": spot.makes})
        created = {"type": "shooting", "spots": logged_spots}

    elif payload.detail_type == "film":
        if not payload.film:
            raise HTTPException(status_code=400, detail="film detail required")
        f = payload.film
        session = models.FilmSession(
            user_id=current_user_id, date=date.today(), title=f.title, notes=f.notes,
        )
        db.add(session)
        created = {"type": "film", "title": f.title}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown detail_type: {payload.detail_type}")

    item.completed = True
    db.commit()
    return {"completed": True, "detail": created}
