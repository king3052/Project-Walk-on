"""
Project Walk-On OS — SQLAlchemy models (schema v0.1)

Covers: users, athlete_profiles, training_sessions, strength_logs,
shooting_logs, nutrition_logs, recovery_logs, goals.
"""
import enum
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime, ForeignKey, Enum, Text, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class SessionType(str, enum.Enum):
    STRENGTH = "STRENGTH"
    BASKETBALL = "BASKETBALL"
    CONDITIONING = "CONDITIONING"
    RECOVERY = "RECOVERY"
    FILM = "FILM"


class GoalStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    ACHIEVED = "ACHIEVED"
    MISSED = "MISSED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    height_in = Column(Float, nullable=True)
    weight_lb = Column(Float, nullable=True)
    position = Column(String, nullable=True)
    dominant_hand = Column(String, nullable=True)
    sport = Column(String, default="Basketball")  # "Basketball" | "Tennis"
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("AthleteProfile", back_populates="user", uselist=False)
    training_sessions = relationship("TrainingSession", back_populates="user")
    shooting_logs = relationship("ShootingLog", back_populates="user")
    nutrition_logs = relationship("NutritionLog", back_populates="user")
    recovery_logs = relationship("RecoveryLog", back_populates="user")
    goals = relationship("Goal", back_populates="user")


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)

    # Measurements
    vertical_in = Column(Float, nullable=True)
    broad_jump_in = Column(Float, nullable=True)
    wingspan_in = Column(Float, nullable=True)
    standing_reach_in = Column(Float, nullable=True)
    body_fat_pct = Column(Float, nullable=True)
    shoe_size = Column(String, nullable=True)
    dominant_foot = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    experience_level = Column(String, nullable=True)  # Beginner | Intermediate | Advanced
    training_days_per_week = Column(Integer, nullable=True)

    # Athletic testing
    sprint_20m_sec = Column(Float, nullable=True)
    lane_agility_sec = Column(Float, nullable=True)
    shuttle_sec = Column(Float, nullable=True)
    max_pullups = Column(Integer, nullable=True)
    max_pushups = Column(Integer, nullable=True)
    grip_strength_lb = Column(Float, nullable=True)

    # Goals
    goal_weight_lb = Column(Float, nullable=True)
    goal_bench_lb = Column(Float, nullable=True)
    goal_squat_lb = Column(Float, nullable=True)
    goal_deadlift_lb = Column(Float, nullable=True)

    user = relationship("User", back_populates="profile")


class ConditioningLog(Base):
    __tablename__ = "conditioning_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    activity = Column(String, nullable=False)  # "Sprints", "Suicides", "Tempo Run", "Bike", "Row", "Jump Rope"
    distance_m = Column(Float, nullable=True)
    duration_sec = Column(Integer, nullable=True)
    rpe = Column(Integer, nullable=True)  # rate of perceived exertion, 1-10
    notes = Column(Text, nullable=True)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    went_well = Column(Text, nullable=True)
    mistakes = Column(Text, nullable=True)
    confidence = Column(Integer, nullable=True)  # 1-10
    focus = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FilmSession(Base):
    __tablename__ = "film_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    title = Column(String, nullable=False)
    video_url = Column(String, nullable=False)
    notes = Column(Text, nullable=True)

    tags = relationship("FilmTag", back_populates="session", cascade="all, delete-orphan")


class FilmTag(Base):
    __tablename__ = "film_tags"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    film_session_id = Column(UUID(as_uuid=False), ForeignKey("film_sessions.id"), nullable=False)
    timestamp_sec = Column(Integer, nullable=False)
    tag_type = Column(String, nullable=False)  # good_possession | bad_turnover | late_rotation | missed_closeout | shot_selection
    note = Column(Text, nullable=True)

    session = relationship("FilmSession", back_populates="tags")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    count = Column(Integer, default=0)


class AICoachSummary(Base):
    __tablename__ = "ai_coach_summaries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScoutingReport(Base):
    __tablename__ = "scouting_reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    report_month = Column(Date, nullable=False)  # first of the month it covers
    strengths = Column(Text, nullable=True)  # newline-separated
    needs_improvement = Column(Text, nullable=True)  # newline-separated
    overall_grade = Column(String, nullable=True)  # e.g. "B+"
    next_priority = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScheduledWorkout(Base):
    __tablename__ = "scheduled_workouts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    workout_type = Column(String, nullable=False)  # Strength | Basketball | Conditioning | Recovery | Film | Rest
    title = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)


class TemplateItem(Base):
    __tablename__ = "template_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    weekday = Column(String, nullable=False)  # "Sunday".."Saturday"
    category = Column(String, nullable=False)
    task = Column(String, nullable=False)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)

    # Athlete Score pillar weights — don't need to sum to 100, the dashboard
    # renormalizes over whichever pillars actually have data.
    weight_strength = Column(Float, default=25)
    weight_basketball = Column(Float, default=25)
    weight_recovery = Column(Float, default=20)
    weight_nutrition = Column(Float, default=15)
    weight_consistency = Column(Float, default=15)


class InjuryStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RECOVERING = "RECOVERING"
    RESOLVED = "RESOLVED"


class Injury(Base):
    __tablename__ = "injuries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date_reported = Column(Date, default=date.today, nullable=False)
    body_part = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)  # 1-10
    description = Column(Text, nullable=True)
    status = Column(Enum(InjuryStatus), default=InjuryStatus.ACTIVE)
    rehab_notes = Column(Text, nullable=True)
    return_to_play_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    type = Column(Enum(SessionType), nullable=False)
    duration_min = Column(Integer, nullable=True)
    rpe = Column(Integer, nullable=True)  # rate of perceived exertion, 1-10 — used for training load (duration x RPE)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="training_sessions")
    strength_logs = relationship("StrengthLog", back_populates="session")


class StrengthLog(Base):
    __tablename__ = "strength_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("training_sessions.id"), nullable=False)
    exercise = Column(String, nullable=False)  # e.g. "Back Squat", "Bench Press"
    sets = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight_lb = Column(Float, nullable=False)
    estimated_1rm = Column(Float, nullable=True)  # computed via Epley formula in service layer
    is_pr = Column(Integer, default=0)  # 0/1 flag, kept simple for MVP

    session = relationship("TrainingSession", back_populates="strength_logs")


class ShootingLog(Base):
    __tablename__ = "shooting_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    shot_type = Column(String, nullable=False)  # "Corner 3", "Wing 3", "Pull-up", "Free Throw"
    attempts = Column(Integer, nullable=False)
    makes = Column(Integer, nullable=False)
    location = Column(String, nullable=True)

    user = relationship("User", back_populates="shooting_logs")

    @property
    def percentage(self) -> float:
        return round((self.makes / self.attempts) * 100, 1) if self.attempts else 0.0


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    calories = Column(Integer, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    water_l = Column(Float, nullable=True)

    user = relationship("User", back_populates="nutrition_logs")


class RecoveryLog(Base):
    __tablename__ = "recovery_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    sleep_hours = Column(Float, nullable=True)
    energy = Column(Integer, nullable=True)  # 1-10
    stress = Column(Integer, nullable=True)  # 1-10
    soreness = Column(Integer, nullable=True)  # 1-10

    user = relationship("User", back_populates="recovery_logs")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # "strength" | "basketball" | "body" | "recovery"
    target = Column(String, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(Enum(GoalStatus), default=GoalStatus.NOT_STARTED)

    user = relationship("User", back_populates="goals")


class BodyweightLog(Base):
    __tablename__ = "bodyweight_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    weight_lb = Column(Float, nullable=False)


class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    wins = Column(Text, nullable=True)
    weakness = Column(Text, nullable=True)
    next_focus = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# =====================================================================
# TENNIS MODULE — dedicated tables, fully separate from the basketball
# ones above (TennisMatch is not ShootingLog, TennisStrokeLog is not
# StrengthLog, etc.) so the two sports never share or collide on data.
# =====================================================================

class TennisProfile(Base):
    __tablename__ = "tennis_profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)

    backhand_style = Column(String, nullable=True)  # "One-handed" | "Two-handed"
    preferred_surface = Column(String, nullable=True)  # Hard | Clay | Grass | Indoor
    racquet_model = Column(String, nullable=True)
    string_type = Column(String, nullable=True)
    string_tension_lb = Column(Float, nullable=True)
    grip_size = Column(String, nullable=True)
    shoe_model = Column(String, nullable=True)


class TennisMatch(Base):
    __tablename__ = "tennis_matches"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    opponent = Column(String, nullable=True)
    tournament = Column(String, nullable=True)
    surface = Column(String, nullable=True)
    score = Column(String, nullable=True)  # e.g. "6-4, 3-6, 7-5"
    result = Column(String, nullable=True)  # "Win" | "Loss"
    duration_min = Column(Integer, nullable=True)
    weather = Column(String, nullable=True)

    first_serve_pct = Column(Float, nullable=True)
    second_serve_pct = Column(Float, nullable=True)
    aces = Column(Integer, nullable=True)
    double_faults = Column(Integer, nullable=True)
    winners = Column(Integer, nullable=True)
    unforced_errors = Column(Integer, nullable=True)
    break_points_won = Column(Integer, nullable=True)
    break_points_total = Column(Integer, nullable=True)
    net_points_won = Column(Integer, nullable=True)
    net_points_total = Column(Integer, nullable=True)
    return_pct = Column(Float, nullable=True)
    longest_rally = Column(Integer, nullable=True)
    avg_rally = Column(Float, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Point-by-point live scoring settings — only used if the match is tracked
    # via the point log below rather than (or in addition to) manual stat entry.
    scoring_format = Column(String, default="best_of_3")  # best_of_3 | best_of_3_tb10 | single_set | best_of_5
    no_ad = Column(Boolean, default=False)
    first_server = Column(String, default="Me")  # "Me" | "Opponent"


class TennisPointLog(Base):
    """The single source of truth for point-by-point match tracking. Games,
    sets, and match completion are all DERIVED from this ordered log by
    app.core.tennis_scoring.replay_match() — nothing here is redundantly
    stored, so there's no risk of it drifting out of sync."""
    __tablename__ = "tennis_point_log"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    match_id = Column(UUID(as_uuid=False), ForeignKey("tennis_matches.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    won = Column(Boolean, nullable=False)  # True = the tracked athlete won this point
    created_at = Column(DateTime, default=datetime.utcnow)


class TennisMatchScouting(Base):
    """AI-generated post-match analysis, tied to one specific match."""
    __tablename__ = "tennis_match_scouting"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    match_id = Column(UUID(as_uuid=False), ForeignKey("tennis_matches.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    patterns = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TennisStrokeLog(Base):
    """Covers the Stroke Tracker: forehand/backhand/serve/return/volley/specialty,
    each as a category with a free-text stroke type (e.g. 'Topspin cross-court',
    'Kick serve') so every variant in the plan is loggable without 30 hardcoded
    columns."""
    __tablename__ = "tennis_stroke_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    stroke_category = Column(String, nullable=False)  # Forehand | Backhand | Serve | Return | Volley | Specialty
    stroke_type = Column(String, nullable=False)  # e.g. "Topspin cross-court", "Kick serve"
    attempts = Column(Integer, nullable=False)
    makes = Column(Integer, nullable=False)  # winners / in-play / successful, depending on stroke
    notes = Column(Text, nullable=True)


class TennisTournament(Base):
    __tablename__ = "tennis_tournaments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    surface = Column(String, nullable=True)
    location = Column(String, nullable=True)
    registration_status = Column(String, nullable=True)  # Planned | Registered | Completed
    seed = Column(String, nullable=True)
    ranking_points = Column(Integer, nullable=True)
    result = Column(String, nullable=True)  # e.g. "Won", "Semifinal", "R16"
    notes = Column(Text, nullable=True)


class TennisRanking(Base):
    __tablename__ = "tennis_rankings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    ranking_type = Column(String, nullable=False)  # UTR | USTA | ITF | ATP | WTA | School | State | National
    value = Column(String, nullable=False)  # kept as string since UTR is decimal, rankings are integers, etc.
