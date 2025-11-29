"""
Rainbow Rush Database Configuration
COMPLETELY ISOLATED from core platform
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager

# Database Rainbow Rush SEPARATO in data/games/
RAINBOW_RUSH_DB_PATH = Path(__file__).parent.parent.parent.parent / "data" / "games" / "rainbow_rush.db"
RAINBOW_RUSH_DB_URL = f"sqlite:///{RAINBOW_RUSH_DB_PATH}"

# Crea directory se non esiste
RAINBOW_RUSH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Create engine SEPARATO per Rainbow Rush
rainbow_rush_engine = create_engine(
    RAINBOW_RUSH_DB_URL, 
    connect_args={"check_same_thread": False}
)

# Session factory SEPARATA
RainbowRushSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=rainbow_rush_engine
)


def get_rainbow_rush_db_url():
    """Get Rainbow Rush database URL"""
    return RAINBOW_RUSH_DB_URL


@contextmanager
def get_rainbow_rush_db_session():
    """Context manager for Rainbow Rush database sessions."""
    session = RainbowRushSessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()


def get_rainbow_rush_db():
    """Dependency for Rainbow Rush FastAPI endpoints."""
    db = RainbowRushSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_rainbow_rush_db():
    """Initialize Rainbow Rush database tables"""
    from .models import Base
    Base.metadata.create_all(bind=rainbow_rush_engine)
    print("✅ Rainbow Rush database initialized")
