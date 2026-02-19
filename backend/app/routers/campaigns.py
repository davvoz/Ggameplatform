"""
Campaign Router
Public endpoints for campaign data (active campaigns per game).
Admin CRUD is handled in admin.py following existing pattern.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.repositories import RepositoryFactory
from app.services import ServiceFactory

router = APIRouter()


def get_db():
    """Get database session as dependency"""
    with get_db_session() as session:
        yield session


@router.get("/active")
async def get_active_campaigns(db: Session = Depends(get_db)):
    """Get all currently active campaigns"""
    repo = RepositoryFactory.create_campaign_repository(db)
    service = ServiceFactory.create_campaign_service(repo)
    campaigns = service.get_all_active()
    return {"success": True, "data": campaigns}


@router.get("/game/{game_id}")
async def get_game_campaigns(game_id: str, db: Session = Depends(get_db)):
    """Get active campaigns for a specific game"""
    repo = RepositoryFactory.create_campaign_repository(db)
    service = ServiceFactory.create_campaign_service(repo)
    campaigns = service.get_active_for_game(game_id)
    return {"success": True, "data": campaigns}
