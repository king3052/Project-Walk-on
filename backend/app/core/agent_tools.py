"""
The assistant's tool registry. Every tool here is:
  1. Scoped to the calling user's own data only — every handler takes
     user_id from the verified JWT, never from the model's arguments.
  2. Deliberately NOT including bulk-delete or other destructive/
     irreversible actions, even though write actions execute immediately
     without confirmation — that's a scope boundary on what the assistant
     is *for* (logging and looking things up), not an extra safety gate
     on top of what was asked for.

Each tool is a dict: {"schema": <OpenAI-style function schema>, "handler": fn}
handler signature: (db: Session, user_id: str, **kwargs) -> dict
"""
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models import models
from app.core.web_search import web_search as _web_search
from app.core import google_calendar


def _get_recent_matches(db, user_id, count=5):
    matches = (
        db.query(models.TennisMatch)
        .filter(models.TennisMatch.user_id == user_id)
        .order_by(models.TennisMatch.date.desc())
        .limit(count)
        .all()
    )
    return {"matches": [
        {"date": str(m.date), "opponent": m.opponent, "result": m.result, "score": m.score} for m in matches
    ]}


def _get_recent_training_sessions(db, user_id, count=5):
    sessions = (
        db.query(models.TrainingSession)
        .filter(models.TrainingSession.user_id == user_id)
        .order_by(models.TrainingSession.date.desc())
        .limit(count)
        .all()
    )
    return {"sessions": [
        {"date": str(s.date), "type": s.type.value if hasattr(s.type, "value") else s.type,
         "duration_min": s.duration_min, "rpe": s.rpe}
        for s in sessions
    ]}


def _get_goals(db, user_id):
    goals = db.query(models.Goal).filter(models.Goal.user_id == user_id).all()
    return {"goals": [
        {"title": g.title, "category": g.category, "target": g.target,
         "deadline": str(g.deadline) if g.deadline else None,
         "status": g.status.value if hasattr(g.status, "value") else g.status}
        for g in goals
    ]}


def _get_upcoming_tournaments(db, user_id):
    tournaments = (
        db.query(models.TennisTournament)
        .filter(models.TennisTournament.user_id == user_id, models.TennisTournament.start_date >= date.today())
        .order_by(models.TennisTournament.start_date.asc())
        .all()
    )
    return {"tournaments": [
        {"name": t.name, "start_date": str(t.start_date), "surface": t.surface, "status": t.registration_status}
        for t in tournaments
    ]}


def _get_weight_trend(db, user_id):
    logs = (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == user_id)
        .order_by(models.BodyweightLog.date.desc())
        .limit(10)
        .all()
    )
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.user_id == user_id).first()
    return {
        "recent_weights": [{"date": str(l.date), "weight_lb": l.weight_lb} for l in reversed(logs)],
        "goal_weight_lb": profile.goal_weight_lb if profile else None,
    }


def _get_todays_schedule(db, user_id):
    items = (
        db.query(models.ScheduledWorkout)
        .filter(models.ScheduledWorkout.user_id == user_id, models.ScheduledWorkout.date == date.today())
        .all()
    )
    return {"items": [{"type": i.workout_type, "title": i.title, "done": bool(i.completed)} for i in items]}


def _get_latest_scouting_summary(db, user_id):
    profile = (
        db.query(models.TennisScoutingProfile).filter(models.TennisScoutingProfile.user_id == user_id).first()
    )
    if profile and profile.summary:
        return {"summary": profile.summary, "strengths": profile.strengths, "weaknesses": profile.weaknesses}
    report = (
        db.query(models.ScoutingReport)
        .filter(models.ScoutingReport.user_id == user_id)
        .order_by(models.ScoutingReport.report_month.desc())
        .first()
    )
    if report:
        return {"summary": None, "strengths": report.strengths, "weaknesses": report.needs_improvement}
    return {"summary": None, "strengths": None, "weaknesses": None, "note": "No scouting data logged yet."}


def _web_search_tool(db, user_id, query):
    return _web_search(query)


def _get_upcoming_calendar_events(db, user_id, days_ahead=7):
    events = google_calendar.get_events_for_user(db, models, user_id, days_ahead)
    if events is None:
        return {"connected": False, "events": [], "note": "Google Calendar isn't connected."}
    return {"connected": True, "events": events}


def _log_practice_session(db, user_id, duration_min=None, intensity=None, focus_area=None, performance_notes=None):
    session = models.TennisPracticeSession(
        user_id=user_id, date=date.today(), duration_min=duration_min, intensity=intensity,
        focus_area=focus_area, performance_notes=performance_notes,
    )
    db.add(session)
    db.commit()
    return {"logged": True, "type": "practice_session", "date": str(session.date)}


def _log_conditioning(db, user_id, activity, duration_sec=None, distance_m=None, rpe=None):
    log = models.ConditioningLog(
        user_id=user_id, date=date.today(), activity=activity, duration_sec=duration_sec,
        distance_m=distance_m, rpe=rpe,
    )
    db.add(log)
    db.commit()
    return {"logged": True, "type": "conditioning", "activity": activity}


def _log_nutrition(db, user_id, calories=None, protein_g=None, carbs_g=None, fat_g=None, water_l=None):
    log = models.NutritionLog(
        user_id=user_id, date=date.today(), calories=calories, protein_g=protein_g,
        carbs_g=carbs_g, fat_g=fat_g, water_l=water_l,
    )
    db.add(log)
    db.commit()
    return {"logged": True, "type": "nutrition", "calories": calories, "protein_g": protein_g}


def _log_recovery(db, user_id, sleep_hours=None, energy=None, stress=None, soreness=None):
    log = models.RecoveryLog(
        user_id=user_id, date=date.today(), sleep_hours=sleep_hours, energy=energy,
        stress=stress, soreness=soreness,
    )
    db.add(log)
    db.commit()
    return {"logged": True, "type": "recovery"}


def _log_bodyweight(db, user_id, weight_lb):
    log = models.BodyweightLog(user_id=user_id, date=date.today(), weight_lb=weight_lb)
    db.add(log)
    db.commit()
    return {"logged": True, "type": "bodyweight", "weight_lb": weight_lb}


def _create_goal(db, user_id, title, category, target=None, deadline=None):
    deadline_date = datetime.strptime(deadline, "%Y-%m-%d").date() if deadline else None
    goal = models.Goal(user_id=user_id, title=title, category=category, target=target, deadline=deadline_date)
    db.add(goal)
    db.commit()
    return {"created": True, "type": "goal", "title": title}


def _create_tournament(db, user_id, name, start_date=None, surface=None):
    start = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
    t = models.TennisTournament(user_id=user_id, name=name, start_date=start, surface=surface)
    db.add(t)
    db.commit()
    return {"created": True, "type": "tournament", "name": name}


TOOLS = [
    {"schema": {"type": "function", "function": {
        "name": "get_recent_matches",
        "description": "Get the athlete's recent tennis matches (result, opponent, score).",
        "parameters": {"type": "object", "properties": {
            "count": {"type": "integer", "description": "How many recent matches to return, default 5"}
        }},
    }}, "handler": _get_recent_matches},

    {"schema": {"type": "function", "function": {
        "name": "get_recent_training_sessions",
        "description": "Get the athlete's recent strength/training sessions.",
        "parameters": {"type": "object", "properties": {
            "count": {"type": "integer", "description": "How many to return, default 5"}
        }},
    }}, "handler": _get_recent_training_sessions},

    {"schema": {"type": "function", "function": {
        "name": "get_goals",
        "description": "Get all of the athlete's goals, including completed ones.",
        "parameters": {"type": "object", "properties": {}},
    }}, "handler": _get_goals},

    {"schema": {"type": "function", "function": {
        "name": "get_upcoming_tournaments",
        "description": "Get the athlete's upcoming tennis tournaments.",
        "parameters": {"type": "object", "properties": {}},
    }}, "handler": _get_upcoming_tournaments},

    {"schema": {"type": "function", "function": {
        "name": "get_weight_trend",
        "description": "Get the athlete's recent bodyweight log entries and their goal weight.",
        "parameters": {"type": "object", "properties": {}},
    }}, "handler": _get_weight_trend},

    {"schema": {"type": "function", "function": {
        "name": "get_todays_schedule",
        "description": "Get what's scheduled for the athlete today.",
        "parameters": {"type": "object", "properties": {}},
    }}, "handler": _get_todays_schedule},

    {"schema": {"type": "function", "function": {
        "name": "get_latest_scouting_summary",
        "description": "Get the athlete's most recent AI scouting summary (strengths/weaknesses).",
        "parameters": {"type": "object", "properties": {}},
    }}, "handler": _get_latest_scouting_summary},

    {"schema": {"type": "function", "function": {
        "name": "web_search",
        "description": "Search the live web for current, real information — use this for anything you "
                        "don't already know or that could have changed recently.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "The search query"}
        }, "required": ["query"]},
    }}, "handler": _web_search_tool},

    {"schema": {"type": "function", "function": {
        "name": "get_upcoming_calendar_events",
        "description": "Get the athlete's upcoming Google Calendar events (classes, exams, appointments) "
                        "for the next several days, if they've connected their calendar.",
        "parameters": {"type": "object", "properties": {
            "days_ahead": {"type": "integer", "description": "How many days ahead to look, default 7"}
        }},
    }}, "handler": _get_upcoming_calendar_events},

    {"schema": {"type": "function", "function": {
        "name": "log_practice_session",
        "description": "Log a tennis practice session for today.",
        "parameters": {"type": "object", "properties": {
            "duration_min": {"type": "integer"},
            "intensity": {"type": "integer", "description": "1-10"},
            "focus_area": {"type": "string"},
            "performance_notes": {"type": "string"},
        }},
    }}, "handler": _log_practice_session},

    {"schema": {"type": "function", "function": {
        "name": "log_conditioning",
        "description": "Log a conditioning session (sprints, bike, etc.) for today.",
        "parameters": {"type": "object", "properties": {
            "activity": {"type": "string"},
            "duration_sec": {"type": "integer"},
            "distance_m": {"type": "number"},
            "rpe": {"type": "integer", "description": "1-10"},
        }, "required": ["activity"]},
    }}, "handler": _log_conditioning},

    {"schema": {"type": "function", "function": {
        "name": "log_nutrition",
        "description": "Log a nutrition entry for today. If the athlete describes a meal (e.g. a restaurant "
                        "order) rather than giving exact numbers, estimate reasonable macro values yourself "
                        "before calling this.",
        "parameters": {"type": "object", "properties": {
            "calories": {"type": "integer"},
            "protein_g": {"type": "number"},
            "carbs_g": {"type": "number"},
            "fat_g": {"type": "number"},
            "water_l": {"type": "number"},
        }},
    }}, "handler": _log_nutrition},

    {"schema": {"type": "function", "function": {
        "name": "log_recovery",
        "description": "Log recovery info (sleep, energy, stress, soreness) for today.",
        "parameters": {"type": "object", "properties": {
            "sleep_hours": {"type": "number"},
            "energy": {"type": "integer", "description": "1-10"},
            "stress": {"type": "integer", "description": "1-10"},
            "soreness": {"type": "integer", "description": "1-10"},
        }},
    }}, "handler": _log_recovery},

    {"schema": {"type": "function", "function": {
        "name": "log_bodyweight",
        "description": "Log today's bodyweight.",
        "parameters": {"type": "object", "properties": {
            "weight_lb": {"type": "number"},
        }, "required": ["weight_lb"]},
    }}, "handler": _log_bodyweight},

    {"schema": {"type": "function", "function": {
        "name": "create_goal",
        "description": "Create a new goal for the athlete.",
        "parameters": {"type": "object", "properties": {
            "title": {"type": "string"},
            "category": {"type": "string", "description": "e.g. Strength, Tennis, Physical, Lifestyle"},
            "target": {"type": "string"},
            "deadline": {"type": "string", "description": "YYYY-MM-DD, optional"},
        }, "required": ["title", "category"]},
    }}, "handler": _create_goal},

    {"schema": {"type": "function", "function": {
        "name": "create_tournament",
        "description": "Add a tennis tournament to the athlete's schedule.",
        "parameters": {"type": "object", "properties": {
            "name": {"type": "string"},
            "start_date": {"type": "string", "description": "YYYY-MM-DD"},
            "surface": {"type": "string"},
        }, "required": ["name"]},
    }}, "handler": _create_tournament},
]

TOOL_HANDLERS = {t["schema"]["function"]["name"]: t["handler"] for t in TOOLS}
TOOL_SCHEMAS = [t["schema"] for t in TOOLS]
