from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models.models import SessionType, GoalStatus


# ---------- Users ----------
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    height_in: Optional[float] = None
    weight_lb: Optional[float] = None
    position: Optional[str] = None
    dominant_hand: Optional[str] = None


class UserOut(UserCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Athlete Profile ----------
class AthleteProfileUpsert(BaseModel):
    vertical_in: Optional[float] = None
    wingspan_in: Optional[float] = None
    standing_reach_in: Optional[float] = None
    body_fat_pct: Optional[float] = None
    goal_weight_lb: Optional[float] = None
    goal_bench_lb: Optional[float] = None
    goal_squat_lb: Optional[float] = None
    goal_deadlift_lb: Optional[float] = None


class AthleteProfileOut(AthleteProfileUpsert):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# ---------- Training Sessions ----------
class StrengthLogCreate(BaseModel):
    exercise: str
    sets: int
    reps: int
    weight_lb: float


class StrengthLogOut(StrengthLogCreate):
    id: str
    session_id: str
    estimated_1rm: Optional[float] = None
    is_pr: int = 0

    class Config:
        from_attributes = True


class TrainingSessionCreate(BaseModel):
    user_id: str
    date: date
    type: SessionType
    duration_min: Optional[int] = None
    notes: Optional[str] = None
    strength_logs: Optional[list[StrengthLogCreate]] = None


class TrainingSessionOut(BaseModel):
    id: str
    user_id: str
    date: date
    type: SessionType
    duration_min: Optional[int] = None
    notes: Optional[str] = None
    strength_logs: list[StrengthLogOut] = []

    class Config:
        from_attributes = True


# ---------- Shooting ----------
class ShootingLogCreate(BaseModel):
    user_id: str
    date: date
    shot_type: str
    attempts: int
    makes: int
    location: Optional[str] = None


class ShootingLogOut(ShootingLogCreate):
    id: str
    percentage: float

    class Config:
        from_attributes = True


# ---------- Nutrition ----------
class NutritionLogCreate(BaseModel):
    user_id: str
    date: date
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    water_l: Optional[float] = None


class NutritionLogOut(NutritionLogCreate):
    id: str

    class Config:
        from_attributes = True


# ---------- Recovery ----------
class RecoveryLogCreate(BaseModel):
    user_id: str
    date: date
    sleep_hours: Optional[float] = None
    energy: Optional[int] = None
    stress: Optional[int] = None
    soreness: Optional[int] = None


class RecoveryLogOut(RecoveryLogCreate):
    id: str

    class Config:
        from_attributes = True


# ---------- Goals ----------
class GoalCreate(BaseModel):
    user_id: str
    title: str
    category: str
    target: Optional[str] = None
    deadline: Optional[date] = None


class GoalOut(GoalCreate):
    id: str
    status: GoalStatus

    class Config:
        from_attributes = True


# ---------- Dashboard (aggregate, read-only) ----------
class DashboardOut(BaseModel):
    athlete_score: int
    weight_lb: Optional[float]
    goal_weight_lb: Optional[float]
    bench_lb: Optional[float]
    squat_lb: Optional[float]
    deadlift_lb: Optional[float]
    shots_this_week: int
    shooting_pct_this_week: float
    avg_sleep_this_week: Optional[float]
