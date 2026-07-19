"""
Database connection setup.

Reads DATABASE_URL from environment, e.g.:
postgresql://user:password@localhost:5432/walkon
(Supabase gives you this connection string directly from your project settings.)

Uses the pg8000 driver (pure Python, no system libpq dependency — this avoids
the "libpq.so.5 not found" error some hosts like Railway hit with psycopg2).
A plain "postgresql://" URL is automatically rewritten to specify the driver.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/walkon")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
