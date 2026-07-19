from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
)

app = FastAPI(title="Project Walk-On OS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # add your deployed frontend URL too
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


@app.on_event("startup")
def on_startup():
    # MVP: create tables directly. Switch to Alembic migrations once the schema stabilizes.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
