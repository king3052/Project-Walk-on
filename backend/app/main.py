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
    injuries,
    quick_log,
    planner,
    ask,
    notifications,
    learning,
    template,
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
app.include_router(injuries.router)
app.include_router(quick_log.router)
app.include_router(planner.router)
app.include_router(ask.router)
app.include_router(notifications.router)
app.include_router(learning.router)
app.include_router(template.router)


@app.on_event("startup")
def on_startup():
    # MVP: create tables directly. Switch to Alembic migrations once the schema stabilizes.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
