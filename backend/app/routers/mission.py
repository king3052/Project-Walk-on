from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import check_ai_rate_limit
from app.core.ai import call_groq
from app.core.readiness import compute_readiness
from app.models import models

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
        prompt = (
            f"An athlete's readiness today is {readiness['readiness_score']}/100 ({readiness['readiness_label']}). "
            f"Their top 5 priorities for today, already ranked by importance, are:\n{item_lines}\n\n"
            "Write ONE short sentence (max 25 words) framing today's overall focus — don't just repeat the "
            "list, tie it together. If readiness is low, acknowledge that framing. Don't invent anything "
            "not implied by the list above."
        )
        focus_note = call_groq(prompt, max_tokens=60)

    return {
        "focus_note": focus_note,
        "readiness_score": readiness["readiness_score"],
        "readiness_label": readiness["readiness_label"],
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
