"""
Levels Router - API endpoints for level system
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.level_system import LevelSystem


router = APIRouter(prefix="/api/levels", tags=["Levels"])


# Response models
class LevelProgressResponse(BaseModel):
    user_id: str
    username: Optional[str]
    current_level: int
    next_level: int
    current_xp: float
    xp_current_level: int
    xp_next_level: int
    xp_in_level: float
    xp_needed_for_next: int
    progress_percent: float
    title: str
    badge: str
    color: str


class LevelMilestoneResponse(BaseModel):
    level: int
    title: str
    badge: str
    color: str
    xp_required: int
    coin_reward: int


@router.get("/{user_id}", response_model=LevelProgressResponse)
async def get_user_level_progress(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get user's current level progress and information.
    
    Args:
        user_id: User identifier
        
    Returns:
        Detailed level progress information
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get XP progress
    xp_progress = LevelSystem.get_xp_progress(user.total_xp_earned)
    
    # Get title info
    title_info = LevelSystem.get_level_title(xp_progress["current_level"])
    
    return {
        "user_id": user.user_id,
        "username": user.username,
        **xp_progress,
        **title_info
    }


@router.get("/milestones/all", response_model=List[LevelMilestoneResponse])
async def get_all_milestones():
    """
    Get all level milestones with requirements and rewards.
    
    Returns:
        List of all milestone information
    """
    return LevelSystem.get_all_milestones()


@router.get("/calculate/xp-to-level/{xp}")
async def calculate_level_from_xp(xp: float):
    """
    Calculate what level corresponds to a given XP amount.
    
    Args:
        xp: Total XP amount
        
    Returns:
        Level and detailed information
    """
    level = LevelSystem.calculate_level_from_xp(xp)
    xp_progress = LevelSystem.get_xp_progress(xp)
    title_info = LevelSystem.get_level_title(level)
    
    return {
        "xp": xp,
        "level": level,
        "progress": xp_progress,
        "title": title_info
    }


@router.get("/calculate/level-to-xp/{level}")
async def calculate_xp_for_level(level: int):
    """
    Calculate total XP required to reach a specific level.
    
    Args:
        level: Target level
        
    Returns:
        XP requirement information
    """
    if level < 1:
        raise HTTPException(status_code=400, detail="Level must be >= 1")
    
    xp_required = LevelSystem.calculate_xp_for_level(level)
    title_info = LevelSystem.get_level_title(level)
    rewards = LevelSystem.get_level_up_rewards(level)
    
    return {
        "level": level,
        "xp_required": xp_required,
        "title": title_info,
        "rewards": rewards
    }


@router.get("/leaderboard/top-levels")
async def get_level_leaderboard(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get leaderboard of highest level players.
    
    Args:
        limit: Maximum number of results (default 100)
        
    Returns:
        List of top players by level
    """
    users = db.query(User).order_by(User.total_xp_earned.desc()).limit(limit).all()
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
        title_info = LevelSystem.get_level_title(level)
        
        leaderboard.append({
            "rank": rank,
            "user_id": user.user_id,
            "username": user.username if not user.is_anonymous else f"Anonymous ({user.user_id[:8]})",
            "level": level,
            "total_xp": user.total_xp_earned,
            "title": title_info["title"],
            "badge": title_info["badge"],
            "color": title_info["color"]
        })
    
    return {
        "total_count": len(leaderboard),
        "leaderboard": leaderboard
    }
