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
    sport: Optional[str] = None
    role: Optional[str] = None


class UserOut(UserCreate):
    id: str
    onboarding_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserSync(BaseModel):
    """Sent once right after login/signup to make sure a matching row exists."""
    email: EmailStr
    name: str


class OnboardingPayload(BaseModel):
    """Sent once from the /onboarding page to set up a brand new account."""
    role: Optional[str] = None  # "Athlete" | "Coach" — Coach skips all the athlete-specific fields below
    # Basics
    sport: Optional[str] = None
    height_in: Optional[float] = None
    weight_lb: Optional[float] = None
    position: Optional[str] = None
    dominant_hand: Optional[str] = None
    dominant_foot: Optional[str] = None
    age: Optional[int] = None
    shoe_size: Optional[str] = None
    experience_level: Optional[str] = None

    # Body measurements
    wingspan_in: Optional[float] = None
    standing_reach_in: Optional[float] = None
    body_fat_pct: Optional[float] = None

    # Athletic testing
    vertical_in: Optional[float] = None
    broad_jump_in: Optional[float] = None
    sprint_20m_sec: Optional[float] = None
    lane_agility_sec: Optional[float] = None
    shuttle_sec: Optional[float] = None
    max_pullups: Optional[int] = None
    max_pushups: Optional[int] = None
    grip_strength_lb: Optional[float] = None

    # Goals
    goal_weight_lb: Optional[float] = None
    goal_bench_lb: Optional[float] = None
    goal_squat_lb: Optional[float] = None
    goal_deadlift_lb: Optional[float] = None

    # Availability
    training_days_per_week: Optional[int] = None

    # Athlete Score priority weights (see ScoreWeights) — set from a simple
    # "what matters most" choice on the onboarding UI, fine-tunable later in Settings
    weight_strength: Optional[float] = None
    weight_basketball: Optional[float] = None
    weight_recovery: Optional[float] = None
    weight_nutrition: Optional[float] = None
    weight_consistency: Optional[float] = None

    # Optional current injury, logged straight into Injury Management if provided
    injury_body_part: Optional[str] = None
    injury_severity: Optional[int] = None
    injury_description: Optional[str] = None

    # Tennis-specific (only used when sport == "Tennis")
    backhand_style: Optional[str] = None
    preferred_surface: Optional[str] = None
    initial_ranking_type: Optional[str] = None
    initial_ranking_value: Optional[str] = None


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
    experience_level: Optional[str] = None
    training_days_per_week: Optional[int] = None
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
    rpe: Optional[int] = None
    notes: Optional[str] = None
    strength_logs: Optional[list[StrengthLogCreate]] = None


class TrainingSessionUpdate(BaseModel):
    date: Optional[date] = None
    duration_min: Optional[int] = None
    rpe: Optional[int] = None
    notes: Optional[str] = None


class StrengthLogUpdate(BaseModel):
    exercise: Optional[str] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight_lb: Optional[float] = None


class TrainingSessionOut(BaseModel):
    id: str
    user_id: str
    date: date
    type: SessionType
    duration_min: Optional[int] = None
    rpe: Optional[int] = None
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


class ShootingLogUpdate(BaseModel):
    date: Optional[date] = None
    shot_type: Optional[str] = None
    attempts: Optional[int] = None
    makes: Optional[int] = None
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


class NutritionLogUpdate(BaseModel):
    date: Optional[date] = None
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


class RecoveryLogUpdate(BaseModel):
    date: Optional[date] = None
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
    proposed_by_coach_id: Optional[str] = None

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
    priority: int

    class Config:
        from_attributes = True


# ---------- Settings ----------
class ScoreWeights(BaseModel):
    weight_strength: float = 25
    weight_basketball: float = 25
    weight_recovery: float = 20
    weight_nutrition: float = 15
    weight_consistency: float = 15


class UserSettingsOut(ScoreWeights):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None


# ---------- Sports Science Lab ----------
class DailyLoadPoint(BaseModel):
    date: date
    load: float


class SportsScienceOut(BaseModel):
    daily_load: list[DailyLoadPoint]
    acute_load: float  # avg daily load, last 7 days
    chronic_load: float  # avg daily load, last 28 days
    acwr: Optional[float] = None  # acute:chronic workload ratio
    readiness_score: int  # 0-100
    readiness_label: str
    readiness_note: str


# ---------- Injury Management ----------
class InjuryCreate(BaseModel):
    user_id: str
    date_reported: date
    body_part: str
    severity: int
    description: Optional[str] = None


class InjuryUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[int] = None
    rehab_notes: Optional[str] = None
    return_to_play_date: Optional[date] = None


class InjuryOut(BaseModel):
    id: str
    user_id: str
    date_reported: date
    body_part: str
    severity: int
    description: Optional[str] = None
    status: str
    rehab_notes: Optional[str] = None
    return_to_play_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Push Notifications ----------
class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


# ---------- Weekly Template (editable, per-user) ----------
class TemplateItemCreate(BaseModel):
    weekday: str  # "Sunday".."Saturday"
    category: str
    subcategory: Optional[str] = None
    task: str
    target_count: Optional[int] = None
    target_unit: Optional[str] = None
    priority: Optional[int] = 3
    sort_order: Optional[int] = 0


class TemplateItemUpdate(BaseModel):
    weekday: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    task: Optional[str] = None
    target_count: Optional[int] = None
    target_unit: Optional[str] = None
    priority: Optional[int] = None
    sort_order: Optional[int] = None


class TemplateItemOut(BaseModel):
    id: str
    user_id: str
    weekday: str
    category: str
    subcategory: Optional[str] = None
    task: str
    target_count: Optional[int] = None
    target_unit: Optional[str] = None
    priority: int
    sort_order: int

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
    rpe: Optional[int] = None
    notes: Optional[str] = None


class ConditioningLogUpdate(BaseModel):
    date: Optional[date] = None
    activity: Optional[str] = None
    distance_m: Optional[float] = None
    duration_sec: Optional[int] = None
    rpe: Optional[int] = None
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


class BodyweightLogUpdate(BaseModel):
    date: Optional[date] = None
    weight_lb: Optional[float] = None


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


# =====================================================================
# TENNIS MODULE
# =====================================================================

# ---------- Point-by-point live scoring ----------
class ScoringSettingsUpdate(BaseModel):
    scoring_format: Optional[str] = None  # best_of_3 | best_of_3_tb10 | single_set | best_of_5
    no_ad: Optional[bool] = None
    first_server: Optional[str] = None  # "Me" | "Opponent"


class PointCreate(BaseModel):
    description: Optional[str] = None
    won: bool
    shot_type: Optional[str] = None
    outcome_type: Optional[str] = None
    mood: Optional[str] = None
    mood_note: Optional[str] = None
    serve_outcome: Optional[str] = None


class PointOut(BaseModel):
    id: str
    match_id: str
    sequence: int
    description: Optional[str] = None
    won: bool
    shot_type: Optional[str] = None
    outcome_type: Optional[str] = None
    mood: Optional[str] = None
    mood_note: Optional[str] = None
    serve_outcome: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TennisScoutingProfileOut(BaseModel):
    id: str
    user_id: str
    summary: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    matches_analyzed: int
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkParseRequest(BaseModel):
    text: str


class ParsedPoint(BaseModel):
    description: str
    won: bool


class BulkParseResult(BaseModel):
    points: list[ParsedPoint]


class TennisProfileUpsert(BaseModel):
    backhand_style: Optional[str] = None
    preferred_surface: Optional[str] = None
    racquet_model: Optional[str] = None
    string_type: Optional[str] = None
    string_tension_lb: Optional[float] = None
    grip_size: Optional[str] = None
    shoe_model: Optional[str] = None


class TennisProfileOut(TennisProfileUpsert):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class TennisMatchCreate(BaseModel):
    user_id: Optional[str] = None  # ignored — the server always uses the authenticated caller's id
    date: date
    opponent: Optional[str] = None
    tournament: Optional[str] = None
    surface: Optional[str] = None
    score: Optional[str] = None
    result: Optional[str] = None
    duration_min: Optional[int] = None
    weather: Optional[str] = None
    first_serve_pct: Optional[float] = None
    second_serve_pct: Optional[float] = None
    aces: Optional[int] = None
    double_faults: Optional[int] = None
    winners: Optional[int] = None
    unforced_errors: Optional[int] = None
    break_points_won: Optional[int] = None
    break_points_total: Optional[int] = None
    net_points_won: Optional[int] = None
    net_points_total: Optional[int] = None
    return_pct: Optional[float] = None
    longest_rally: Optional[int] = None
    avg_rally: Optional[float] = None
    notes: Optional[str] = None


class TennisMatchUpdate(BaseModel):
    date: Optional[date] = None
    opponent: Optional[str] = None
    tournament: Optional[str] = None
    surface: Optional[str] = None
    score: Optional[str] = None
    result: Optional[str] = None
    duration_min: Optional[int] = None
    weather: Optional[str] = None
    first_serve_pct: Optional[float] = None
    second_serve_pct: Optional[float] = None
    aces: Optional[int] = None
    double_faults: Optional[int] = None
    winners: Optional[int] = None
    unforced_errors: Optional[int] = None
    break_points_won: Optional[int] = None
    break_points_total: Optional[int] = None
    net_points_won: Optional[int] = None
    net_points_total: Optional[int] = None
    return_pct: Optional[float] = None
    longest_rally: Optional[int] = None
    avg_rally: Optional[float] = None
    notes: Optional[str] = None


class TennisMatchOut(TennisMatchCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TennisMatchScoutingOut(BaseModel):
    id: str
    match_id: str
    user_id: str
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    patterns: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TennisStrokeLogCreate(BaseModel):
    user_id: Optional[str] = None  # ignored — the server always uses the authenticated caller's id
    date: date
    stroke_category: str
    stroke_type: str
    attempts: int
    makes: int
    notes: Optional[str] = None


class TennisStrokeLogUpdate(BaseModel):
    date: Optional[date] = None
    stroke_category: Optional[str] = None
    stroke_type: Optional[str] = None
    attempts: Optional[int] = None
    makes: Optional[int] = None
    notes: Optional[str] = None


class TennisStrokeLogOut(TennisStrokeLogCreate):
    id: str

    class Config:
        from_attributes = True


class TennisTournamentCreate(BaseModel):
    user_id: Optional[str] = None  # ignored — the server always uses the authenticated caller's id
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    surface: Optional[str] = None
    location: Optional[str] = None
    registration_status: Optional[str] = None
    seed: Optional[str] = None
    ranking_points: Optional[int] = None
    result: Optional[str] = None
    notes: Optional[str] = None


class TennisTournamentUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    surface: Optional[str] = None
    location: Optional[str] = None
    registration_status: Optional[str] = None
    seed: Optional[str] = None
    ranking_points: Optional[int] = None
    result: Optional[str] = None
    notes: Optional[str] = None


class TennisTournamentOut(TennisTournamentCreate):
    id: str

    class Config:
        from_attributes = True


class TennisRankingCreate(BaseModel):
    user_id: Optional[str] = None  # ignored — the server always uses the authenticated caller's id
    date: date
    ranking_type: str
    value: str


class TennisRankingOut(TennisRankingCreate):
    id: str

    class Config:
        from_attributes = True


# ---------- Equipment Manager ----------
class TennisRacquetCreate(BaseModel):
    model: str
    weight_g: Optional[float] = None
    balance_point: Optional[str] = None
    string_type: Optional[str] = None
    string_tension_lb: Optional[float] = None
    hours_played: Optional[float] = 0
    last_restrung_date: Optional[date] = None
    grip_replaced_date: Optional[date] = None
    active: Optional[bool] = True
    notes: Optional[str] = None


class TennisRacquetUpdate(BaseModel):
    model: Optional[str] = None
    weight_g: Optional[float] = None
    balance_point: Optional[str] = None
    string_type: Optional[str] = None
    string_tension_lb: Optional[float] = None
    hours_played: Optional[float] = None
    last_restrung_date: Optional[date] = None
    grip_replaced_date: Optional[date] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class TennisRacquetOut(TennisRacquetCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


class TennisShoeCreate(BaseModel):
    model: str
    surface: Optional[str] = None
    hours_played: Optional[float] = 0
    purchased_date: Optional[date] = None
    active: Optional[bool] = True
    notes: Optional[str] = None


class TennisShoeUpdate(BaseModel):
    model: Optional[str] = None
    surface: Optional[str] = None
    hours_played: Optional[float] = None
    purchased_date: Optional[date] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class TennisShoeOut(TennisShoeCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# ---------- Practice Sessions ----------
class TennisPracticeSessionCreate(BaseModel):
    date: date
    duration_min: Optional[int] = None
    intensity: Optional[int] = None
    coach: Optional[str] = None
    partner: Optional[str] = None
    focus_area: Optional[str] = None
    performance_notes: Optional[str] = None
    notes: Optional[str] = None


class TennisPracticeSessionUpdate(BaseModel):
    date: Optional[date] = None
    duration_min: Optional[int] = None
    intensity: Optional[int] = None
    coach: Optional[str] = None
    partner: Optional[str] = None
    focus_area: Optional[str] = None
    performance_notes: Optional[str] = None
    notes: Optional[str] = None


class TennisPracticeSessionOut(TennisPracticeSessionCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# ---------- Mental Performance ----------
class TennisMentalLogCreate(BaseModel):
    date: date
    confidence: Optional[int] = None
    focus: Optional[int] = None
    pressure_handling: Optional[int] = None
    visualization_minutes: Optional[int] = None
    pre_match_routine: Optional[str] = None
    notes: Optional[str] = None


class TennisMentalLogUpdate(BaseModel):
    date: Optional[date] = None
    confidence: Optional[int] = None
    focus: Optional[int] = None
    pressure_handling: Optional[int] = None
    visualization_minutes: Optional[int] = None
    pre_match_routine: Optional[str] = None
    notes: Optional[str] = None


class TennisMentalLogOut(TennisMentalLogCreate):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# =====================================================================
# COACH PORTAL
# =====================================================================

class CoachInviteCodeOut(BaseModel):
    id: str
    player_user_id: str
    code: str
    used: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RedeemCodeRequest(BaseModel):
    code: str


class LinkedPlayerOut(BaseModel):
    link_id: str
    player_user_id: str
    player_name: str
    player_sport: Optional[str] = None
    linked_since: datetime


class LinkedCoachOut(BaseModel):
    link_id: str
    coach_user_id: str
    coach_name: str
    linked_since: datetime


class VisibilitySettingsUpdate(BaseModel):
    share_journal: Optional[bool] = None
    share_mental: Optional[bool] = None


class VisibilitySettingsOut(BaseModel):
    player_user_id: str
    share_journal: bool
    share_mental: bool

    class Config:
        from_attributes = True


class CoachCommentCreate(BaseModel):
    target_type: str  # "match" | "practice_session" | "stroke_log"
    target_id: str
    comment: str


class CoachCommentOut(BaseModel):
    id: str
    player_user_id: str
    author_user_id: str
    author_name: Optional[str] = None
    target_type: str
    target_id: str
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class CoachAssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    due_date: Optional[date] = None


class CoachAssignmentOut(BaseModel):
    id: str
    coach_user_id: str
    player_user_id: str
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    player_note: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentCompleteRequest(BaseModel):
    player_note: Optional[str] = None


# =====================================================================
# COACH PORTAL — batch 2: structured match reviews, coach practice plans,
# collaborative goals
# =====================================================================

class CoachMatchReviewCreate(BaseModel):
    serve_rating: Optional[int] = None
    footwork_rating: Optional[int] = None
    mental_rating: Optional[int] = None
    shot_selection_rating: Optional[int] = None
    notes: Optional[str] = None


class CoachMatchReviewOut(BaseModel):
    id: str
    coach_user_id: str
    player_user_id: str
    match_id: str
    serve_rating: Optional[int] = None
    footwork_rating: Optional[int] = None
    mental_rating: Optional[int] = None
    shot_selection_rating: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PracticePlanItemInput(BaseModel):
    day_of_week: int
    activity: str
    duration_min: Optional[int] = None
    notes: Optional[str] = None


class PracticePlanCreate(BaseModel):
    week_start_date: date
    items: list[PracticePlanItemInput]


class PracticePlanItemOut(BaseModel):
    id: str
    day_of_week: int
    activity: str
    duration_min: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PracticePlanOut(BaseModel):
    id: str
    coach_user_id: str
    player_user_id: str
    week_start_date: date
    created_at: datetime
    items: list[PracticePlanItemOut]


class CoachGoalCreate(BaseModel):
    title: str
    category: str
    target: Optional[str] = None
    deadline: Optional[date] = None


# =====================================================================
# NOTIFICATION PREFERENCES
# =====================================================================

class NotificationPreferencesUpdate(BaseModel):
    daily_reminders: Optional[bool] = None
    coach_updates: Optional[bool] = None


class NotificationPreferencesOut(BaseModel):
    user_id: str
    daily_reminders: bool
    coach_updates: bool

    class Config:
        from_attributes = True


# =====================================================================
# ASSISTANT — persisted conversation history
# =====================================================================

class AssistantMessageOut(BaseModel):
    id: str
    role: str
    content: str
    actions_taken: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
