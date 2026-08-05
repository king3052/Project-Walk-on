from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.database import Base, engine
from app.models import models  # noqa: F401 (ensures models are registered before create_all)
from app.routers import (
    users,
    training,
    shooting,
    nutrition,
    recovery,
    goals,
    dashboard,
    bodyweight,
    reviews,
    analytics,
    conditioning,
    journal,
    film,
    ai_coach,
    achievements,
    scouting,
    scheduled_workouts,
    settings,
    sports_science,
    briefing,
    mission,
    calendar_integration,
    assistant,
    injuries,
    quick_log,
    planner,
    notifications,
    learning,
    template,
    tennis_profile,
    tennis_matches,
    tennis_scoring,
    tennis_analysis,
    tennis_strokes,
    tennis_equipment,
    tennis_practice,
    tennis_mental,
    coach,
    tennis_tournaments,
    tennis_rankings,
)

app = FastAPI(title="Project Walk-On OS API", version="0.1.0")

# Comma-separated list, e.g. "http://localhost:3000,https://your-app.vercel.app"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(training.router)
app.include_router(shooting.router)
app.include_router(nutrition.router)
app.include_router(recovery.router)
app.include_router(goals.router)
app.include_router(dashboard.router)
app.include_router(bodyweight.router)
app.include_router(reviews.router)
app.include_router(analytics.router)
app.include_router(conditioning.router)
app.include_router(journal.router)
app.include_router(film.router)
app.include_router(ai_coach.router)
app.include_router(achievements.router)
app.include_router(scouting.router)
app.include_router(scheduled_workouts.router)
app.include_router(settings.router)
app.include_router(sports_science.router)
app.include_router(briefing.router)
app.include_router(mission.router)
app.include_router(calendar_integration.router)
app.include_router(assistant.router)
app.include_router(injuries.router)
app.include_router(quick_log.router)
app.include_router(planner.router)
app.include_router(notifications.router)
app.include_router(learning.router)
app.include_router(template.router)
app.include_router(tennis_profile.router)
app.include_router(tennis_matches.router)
app.include_router(tennis_scoring.router)
app.include_router(tennis_analysis.router)
app.include_router(tennis_equipment.router)
app.include_router(tennis_practice.router)
app.include_router(tennis_mental.router)
app.include_router(coach.router)
app.include_router(tennis_strokes.router)
app.include_router(tennis_tournaments.router)
app.include_router(tennis_rankings.router)


@app.on_event("startup")
def on_startup():
    # Fail loudly at startup if the ORM's relationships are misconfigured
    # (e.g. an ambiguous foreign key between two tables) rather than only
    # surfacing as a 500 on whichever endpoint a user happens to hit first.
    # This turns a confusing partial outage into an immediate, obvious
    # deploy failure with a clear cause.
    from sqlalchemy.orm import configure_mappers

    try:
        configure_mappers()
    except Exception as exc:
        raise RuntimeError(
            "SCHEMA CONFIGURATION ERROR at startup — the app will not start. "
            "This usually means two models have an ambiguous foreign key "
            "relationship (e.g. two FKs to the same table without an explicit "
            "foreign_keys= on the relationship()). Check any model touched in "
            "the most recent change. Original error: " + str(exc)
        ) from exc

    # MVP: create tables directly. Switch to Alembic migrations once the schema stabilizes.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
