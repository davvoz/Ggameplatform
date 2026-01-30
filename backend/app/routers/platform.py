"""
Platform Router - Platform-wide configuration and info endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.database import get_db_session
from app.models import PlatformConfig

router = APIRouter()


def get_db():
    """Get database session as dependency"""
    with get_db_session() as session:
        yield session


def get_platform_epoch(db: Session) -> str:
    """Get the current platform epoch (reset timestamp)."""
    config = db.query(PlatformConfig).filter_by(key="platform_epoch").first()
    if config:
        return config.value
    return "0"  # Default epoch if not set


def set_platform_epoch(db: Session, epoch: str = None) -> str:
    """Set a new platform epoch. Used when platform is reset."""
    if epoch is None:
        epoch = datetime.now().isoformat()
    
    config = db.query(PlatformConfig).filter_by(key="platform_epoch").first()
    if config:
        config.value = epoch
        config.updated_at = datetime.now().isoformat()
    else:
        config = PlatformConfig(
            key="platform_epoch",
            value=epoch,
            description="Timestamp of last platform reset. Users with older epoch are logged out.",
            updated_at=datetime.now().isoformat()
        )
        db.add(config)
    
    db.commit()
    return epoch


@router.get("/info")
async def get_platform_info(db: Session = Depends(get_db)):
    """
    Get platform information including the current epoch.
    Frontend should check this on load and logout if epoch changed.
    """
    epoch = get_platform_epoch(db)
    
    return {
        "success": True,
        "platform_epoch": epoch,
        "platform_name": "CUR8 Gaming Platform",
        "version": "1.0.0"
    }


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Simple health check endpoint."""
    try:
        # Try to query something simple
        epoch = get_platform_epoch(db)
        return {
            "status": "healthy",
            "database": "connected",
            "platform_epoch": epoch
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
