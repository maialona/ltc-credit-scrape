"""Database engine and session configuration."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Support DATABASE_URL env for PostgreSQL on Zeabur, default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/ltc_credits.db")

# SQLite needs check_same_thread=False for FastAPI async
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    # Ensure the data directory exists
    db_path = DATABASE_URL.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables."""
    from . import db_models  # noqa: F401 - import to register models
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
