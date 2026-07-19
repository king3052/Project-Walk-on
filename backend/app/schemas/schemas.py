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
    broad_jump_in: Optional[float] = None
    wingspan_in: Optional[float] = None
    standing_reach_in: Optional[float] = None
    body_fat_pct: Optional[float] = None
    shoe_size: Optional[str] = None
    dominant_foot: Optional[str] = None
    age: Optional[int] = None
    sprint_20m_sec: Optional[float] = None
    lane_agility_sec: Optional[float] = None
    shuttle_sec: Optional[float] = None
    max_pullups: Optional[int] = None
    max_pushups: Optional[int] = None
    grip_strength_lb: Optional[float] = None
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


# ---------- Film Room ----------
class FilmTagCreate(BaseModel):
    timestamp_sec: int
    tag_type: str
    note: Optional[str] = None


class FilmTagOut(FilmTagCreate):
    id: str
    film_session_id: str

    class Config:
        from_attributes = True


class FilmSessionCreate(BaseModel):
    user_id: str
    date: date
    title: str
    video_url: str
    notes: Optional[str] = None


class FilmSessionOut(BaseModel):
    id: str
    user_id: str
    date: date
    title: str
    video_url: str
    notes: Optional[str] = None
    tags: list[FilmTagOut] = []

    class Config:
        from_attributes = True


# ---------- AI Coach ----------
class AICoachSummaryOut(BaseModel):
    id: str
    user_id: str
    week_start: date
    summary_text: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Scouting Report ----------
class ScoutingReportOut(BaseModel):
    id: str
    user_id: str
    report_month: date
    strengths: Optional[str] = None
    needs_improvement: Optional[str] = None
    overall_grade: Optional[str] = None
    next_priority: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Scheduled Workouts (planning calendar) ----------
class ScheduledWorkoutCreate(BaseModel):
    user_id: str
    date: date
    workout_type: str
    title: str
    notes: Optional[str] = None


class ScheduledWorkoutUpdate(BaseModel):
    date: Optional[date] = None
    workout_type: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None


class ScheduledWorkoutOut(BaseModel):
    id: str
    user_id: str
    date: date
    workout_type: str
    title: str
    notes: Optional[str] = None
    completed: bool

    class Config:
        from_attributes = True


# ---------- Achievements (computed, read-only) ----------
class Achievement(BaseModel):
    key: str
    name: str
    description: str
    earned: bool
    progress_current: float
    progress_target: float


# ---------- Conditioning ----------
class ConditioningLogCreate(BaseModel):
    user_id: str
    date: date
    activity: str
    distance_m: Optional[float] = None
    duration_sec: Optional[int] = None
    notes: Optional[str] = None


class ConditioningLogOut(ConditioningLogCreate):
    id: str

    class Config:
        from_attributes = True


# ---------- Journal ----------
class JournalEntryCreate(BaseModel):
    user_id: str
    date: date
    went_well: Optional[str] = None
    mistakes: Optional[str] = None
    confidence: Optional[int] = None
    focus: Optional[str] = None


class JournalEntryOut(JournalEntryCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Bodyweight ----------
class BodyweightLogCreate(BaseModel):
    user_id: str
    date: date
    weight_lb: float


class BodyweightLogOut(BodyweightLogCreate):
    id: str

    class Config:
        from_attributes = True


# ---------- Weekly Review ----------
class WeeklyReviewCreate(BaseModel):
    user_id: str
    week_start: date
    wins: Optional[str] = None
    weakness: Optional[str] = None
    next_focus: Optional[str] = None


class WeeklyReviewOut(WeeklyReviewCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Analytics (aggregate, read-only) ----------
class WeightPoint(BaseModel):
    date: date
    weight_lb: float


class StrengthPoint(BaseModel):
    date: date
    exercise: str
    estimated_1rm: float


class ShootingPoint(BaseModel):
    date: date
    shot_type: str
    attempts: int
    makes: int


class AnalyticsOut(BaseModel):
    weight: list[WeightPoint]
    strength: list[StrengthPoint]
    shooting: list[ShootingPoint]
    active_dates: list[date]  # any date with at least one logged entry, for the activity calendar


# ---------- Dashboard (aggregate, read-only) ----------
class DashboardOut(BaseModel):
    athlete_score: int
    score_breakdown: dict[str, float]
    weight_lb: Optional[float]
    goal_weight_lb: Optional[float]
    bench_lb: Optional[float]
    squat_lb: Optional[float]
    deadlift_lb: Optional[float]
    shots_this_week: int
    shooting_pct_this_week: float
    avg_sleep_this_week: Optional[float]
