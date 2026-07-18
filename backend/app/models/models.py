"""
Project Walk-On OS — SQLAlchemy models (schema v0.1)

Covers: users, athlete_profiles, training_sessions, strength_logs,
shooting_logs, nutrition_logs, recovery_logs, goals.
"""
import enum
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime, ForeignKey, Enum, Text
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

    vertical_in = Column(Float, nullable=True)
    wingspan_in = Column(Float, nullable=True)
    standing_reach_in = Column(Float, nullable=True)
    body_fat_pct = Column(Float, nullable=True)

    goal_weight_lb = Column(Float, nullable=True)
    goal_bench_lb = Column(Float, nullable=True)
    goal_squat_lb = Column(Float, nullable=True)
    goal_deadlift_lb = Column(Float, nullable=True)

    user = relationship("User", back_populates="profile")


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    type = Column(Enum(SessionType), nullable=False)
    duration_min = Column(Integer, nullable=True)
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
