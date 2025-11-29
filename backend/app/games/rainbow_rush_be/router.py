"""
Rainbow Rush API Router
REST API endpoints for Rainbow Rush game
Following REST principles and secure API design
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from .database import get_rainbow_rush_db
from .repository import RainbowRushRepository
from .service import RainbowRushService, ValidationError


# ==================== PYDANTIC SCHEMAS ====================

class ProgressResponse(BaseModel):
    """Player progress response schema"""
    progress_id: str
    user_id: str
    current_level: int
    max_level_unlocked: int
    total_coins: int
    total_stars: int
    high_score: int
    level_completions: Dict[str, Any]
    unlocked_items: Dict[str, Any]
    statistics: Dict[str, Any]
    created_at: str
    last_played: str
    updated_at: str


class LevelCompletionRequest(BaseModel):
    """Level completion submission schema"""
    level_id: int = Field(..., ge=1, description="Level identifier")
    level_name: str = Field(default="", description="Level name")
    stars_earned: int = Field(..., ge=0, le=3, description="Stars earned (0-3)")
    completion_time: float = Field(..., ge=0.0, description="Completion time in seconds")
    score: int = Field(..., ge=0, description="Score achieved")
    objectives_completed: list = Field(default=[], description="Completed objectives")
    level_stats: Dict[str, Any] = Field(default={}, description="Level statistics")
    session_duration: float = Field(default=0.0, description="Session duration")
    client_timestamp: Optional[str] = Field(default=None, description="Client timestamp")


class SessionStartRequest(BaseModel):
    """Start game session request schema"""
    level_id: int = Field(..., ge=1, description="Level to play")


class SessionUpdateRequest(BaseModel):
    """Update game session request schema"""
    heartbeat: bool = Field(default=False, description="Heartbeat ping")
    current_stats: Optional[Dict[str, Any]] = Field(default=None, description="Current stats")
    session_events: Optional[list] = Field(default=None, description="Session events")


class SaveProgressRequest(BaseModel):
    """Save level progress request schema"""
    level_id: int = Field(..., ge=1, description="Level identifier")
    stars: int = Field(..., ge=0, le=3, description="Stars earned")
    best_time: float = Field(..., ge=0.0, description="Best completion time")
    completed: bool = Field(default=True, description="Level completed")
    coins: Optional[int] = Field(default=None, description="Coins collected")


# ==================== ROUTER ====================

router = APIRouter(
    prefix="/rainbow-rush",
    tags=["Rainbow Rush"],
    responses={404: {"description": "Not found"}}
)


def get_rainbow_rush_service(db: Session = Depends(get_rainbow_rush_db)) -> RainbowRushService:
    """
    Dependency injection for RainbowRushService
    
    Args:
        db: Database session
        
    Returns:
        RainbowRushService instance
    """
    repository = RainbowRushRepository(db)
    return RainbowRushService(repository)


# ==================== PROGRESS ENDPOINTS ====================

@router.get("/progress/{user_id}", response_model=ProgressResponse)
async def get_progress(
    user_id: str,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Get player progress
    
    Args:
        user_id: User identifier
        service: RainbowRushService instance
        
    Returns:
        Player progress data
    """
    try:
        progress = service.get_player_progress(user_id)
        return JSONResponse(content=progress)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching progress: {str(e)}"
        )


@router.post("/progress/{user_id}/save-level")
async def save_level_progress(
    user_id: str,
    request: SaveProgressRequest,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Save progress for specific level
    
    Args:
        user_id: User identifier
        request: Level progress data
        service: RainbowRushService instance
        
    Returns:
        Updated progress
    """
    try:
        level_data = request.dict()
        progress = service.save_level_progress(user_id, request.level_id, level_data)
        return JSONResponse(content=progress)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving level progress: {str(e)}"
        )


# ==================== LEVEL COMPLETION ENDPOINTS ====================

@router.post("/completion/{user_id}")
async def submit_level_completion(
    user_id: str,
    request: LevelCompletionRequest,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Submit level completion with anti-cheat validation
    
    Args:
        user_id: User identifier
        request: Completion data
        service: RainbowRushService instance
        
    Returns:
        Completion record with validation results
    """
    try:
        completion_data = request.dict()
        result = service.submit_level_completion(user_id, completion_data)
        
        return JSONResponse(content={
            "success": True,
            "completion": result,
            "message": "Level completion recorded successfully"
        })
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting completion: {str(e)}"
        )


@router.get("/completion/{user_id}/history")
async def get_completion_history(
    user_id: str,
    level_id: Optional[int] = None,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Get level completion history
    
    Args:
        user_id: User identifier
        level_id: Optional level filter
        service: RainbowRushService instance
        
    Returns:
        List of completions
    """
    try:
        history = service.get_level_history(user_id, level_id)
        return JSONResponse(content={
            "user_id": user_id,
            "level_id": level_id,
            "completions": history,
            "total": len(history)
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching history: {str(e)}"
        )


# ==================== SESSION ENDPOINTS ====================

@router.post("/session/{user_id}/start")
async def start_session(
    user_id: str,
    request: SessionStartRequest,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Start new game session
    
    Args:
        user_id: User identifier
        request: Session start data
        service: RainbowRushService instance
        
    Returns:
        Created session
    """
    try:
        session = service.start_game_session(user_id, request.level_id)
        return JSONResponse(content={
            "success": True,
            "session": session,
            "message": "Session started successfully"
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting session: {str(e)}"
        )


@router.put("/session/{session_id}")
async def update_session(
    session_id: str,
    request: SessionUpdateRequest,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Update game session (heartbeat, stats)
    
    Args:
        session_id: Session identifier
        request: Update data
        service: RainbowRushService instance
        
    Returns:
        Updated session
    """
    try:
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        session = service.update_game_session(session_id, update_data)
        
        return JSONResponse(content={
            "success": True,
            "session": session
        })
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating session: {str(e)}"
        )


@router.post("/session/{session_id}/end")
async def end_session(
    session_id: str,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    End active game session
    
    Args:
        session_id: Session identifier
        service: RainbowRushService instance
        
    Returns:
        Ended session data
    """
    try:
        session = service.end_game_session(session_id)
        return JSONResponse(content={
            "success": True,
            "session": session,
            "message": "Session ended successfully"
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ending session: {str(e)}"
        )


@router.get("/session/{user_id}/active")
async def get_active_session(
    user_id: str,
    service: RainbowRushService = Depends(get_rainbow_rush_service)
):
    """
    Get active session for user
    
    Args:
        user_id: User identifier
        service: RainbowRushService instance
        
    Returns:
        Active session or null
    """
    try:
        session = service.get_active_session(user_id)
        return JSONResponse(content={
            "user_id": user_id,
            "session": session,
            "has_active_session": session is not None
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching active session: {str(e)}"
        )


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(content={
        "status": "healthy",
        "service": "rainbow-rush",
        "timestamp": datetime.utcnow().isoformat()
    })
