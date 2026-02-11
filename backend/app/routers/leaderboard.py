"""
Leaderboard Router - API endpoints for weekly and all-time leaderboards
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app.leaderboard_repository import LeaderboardRepository
from app.weekly_scheduler import get_scheduler


router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


# Pydantic schemas
class ScoreUpdate(BaseModel):
    user_id: str
    game_id: str
    score: int


class WeeklyLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    score: int
    game_title: Optional[str] = None
    games_played: Optional[int] = None
    total_score: Optional[int] = None


class AllTimeLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    score: int
    game_title: Optional[str] = None
    achieved_at: Optional[str] = None
    games_played: Optional[int] = None
    total_score: Optional[int] = None


class WinnerHistoryEntry(BaseModel):
    winner_id: str
    week_start: str
    week_end: str
    game_id: str
    game_title: str
    user_id: str
    username: str
    steem_username: Optional[str]
    rank: int
    score: int
    steem_reward: float
    coin_reward: int
    reward_sent: bool
    reward_sent_at: Optional[str]
    steem_tx_id: Optional[str]


class CurrentWeekInfo(BaseModel):
    week_start: str
    week_end: str
    days_remaining: int


@router.get("/week-info")
async def get_current_week_info(db: Session = Depends(get_db)):
    """Get current week information."""
    lb_repo = LeaderboardRepository(db)
    week_start, week_end = lb_repo.get_current_week()
    
    from datetime import datetime
    now = datetime.utcnow()
    end_date = datetime.fromisoformat(week_end)
    days_remaining = (end_date - now).days
    
    return {
        "success": True,
        "week_start": week_start,
        "week_end": week_end,
        "days_remaining": max(0, days_remaining)
    }


@router.get("/weekly", response_model=dict)
async def get_weekly_leaderboard(
    game_id: Optional[str] = Query(None, description="Filter by game ID. If not provided, returns global leaderboard"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get current week's leaderboard.
    
    - **game_id**: Optional. If provided, returns game-specific leaderboard
    - **limit**: Maximum number of entries (1-100)
    """
    lb_repo = LeaderboardRepository(db)
    week_start, week_end = lb_repo.get_current_week()
    
    leaderboard = lb_repo.get_weekly_leaderboard(game_id=game_id, limit=limit)
    
    return {
        "success": True,
        "type": "weekly",
        "week_start": week_start,
        "week_end": week_end,
        "game_id": game_id,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }


@router.get("/all-time", response_model=dict)
async def get_all_time_leaderboard(
    game_id: Optional[str] = Query(None, description="Filter by game ID. If not provided, returns global leaderboard"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get all-time best scores leaderboard.
    
    - **game_id**: Optional. If provided, returns game-specific leaderboard
    - **limit**: Maximum number of entries (1-100)
    """
    lb_repo = LeaderboardRepository(db)
    leaderboard = lb_repo.get_all_time_leaderboard(game_id=game_id, limit=limit)
    
    return {
        "success": True,
        "type": "all_time",
        "game_id": game_id,
        "count": len(leaderboard),
        "leaderboard": leaderboard
    }


@router.post("/score", status_code=status.HTTP_201_CREATED)
async def update_leaderboard_score(
    score_data: ScoreUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user's score in both weekly and all-time leaderboards.
    
    Only updates if the new score is better than existing score.
    """
    try:
        lb_repo = LeaderboardRepository(db)
        
        # Update weekly leaderboard
        weekly_entry = lb_repo.update_weekly_score(
            user_id=score_data.user_id,
            game_id=score_data.game_id,
            score=score_data.score
        )
        
        # Update all-time leaderboard
        alltime_entry = lb_repo.update_all_time_score(
            user_id=score_data.user_id,
            game_id=score_data.game_id,
            score=score_data.score
        )
        
        return {
            "success": True,
            "message": "Leaderboard updated",
            "weekly_entry": weekly_entry.to_dict(),
            "alltime_entry": alltime_entry.to_dict()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update leaderboard: {str(e)}"
        )


@router.get("/winners", response_model=dict)
async def get_winners_history(
    limit: int = Query(50, ge=1, le=200),
    game_id: Optional[str] = Query(None, description="Filter by game ID"),
    db: Session = Depends(get_db)
):
    """
    Get historical weekly winners.
    
    - **limit**: Maximum number of entries (1-200)
    - **game_id**: Optional. Filter by specific game
    """
    lb_repo = LeaderboardRepository(db)
    history = lb_repo.get_winners_history(limit=limit, game_id=game_id)
    
    return {
        "success": True,
        "count": len(history),
        "winners": history
    }


@router.post("/manual-reset", status_code=status.HTTP_200_OK)
async def trigger_manual_reset(
    use_current_week: bool = Query(False, description="Process current week instead of previous (for testing)")
):
    """
    Manually trigger weekly reset (admin only - should add auth).
    
    Args:
        use_current_week: If True, processes current week (for testing). Default False processes previous week.
    
    WARNING: This will process rewards and reset the leaderboard!
    """
    scheduler = get_scheduler()
    results = scheduler.run_manual_reset(use_current_week=use_current_week)
    
    return {
        "success": results['success'],
        "message": "Manual reset completed",
        "results": results
    }


@router.get("/rewards-config")
async def get_rewards_configuration(
    game_id: Optional[str] = Query(None, description="Get rewards for specific game"),
    db: Session = Depends(get_db)
):
    """Get configured rewards for leaderboard rankings."""
    from app.models import LeaderboardReward, Game
    from sqlalchemy import or_
    
    # Check if game has STEEM rewards enabled
    steem_enabled = False
    if game_id:
        game = db.query(Game).filter(Game.game_id == game_id).first()
        if game:
            steem_enabled = bool(game.steem_rewards_enabled)
    
    query = db.query(LeaderboardReward).filter(
        LeaderboardReward.is_active == 1
    )
    
    if game_id:
        query = query.filter(
            or_(
                LeaderboardReward.game_id == game_id,
                LeaderboardReward.game_id.is_(None)
            )
        )
    
    rewards = query.order_by(LeaderboardReward.rank_start).all()
    
    return {
        "success": True,
        "game_id": game_id,
        "steem_rewards_enabled": steem_enabled,
        "count": len(rewards),
        "rewards": [r.to_dict() for r in rewards]
    }


@router.get("/user-weekly-standings/{user_id}")
async def get_user_weekly_standings(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a user's current weekly leaderboard standings across all games.
    Returns their rank, score, and projected rewards for each game.
    """
    lb_repo = LeaderboardRepository(db)
    week_start, week_end = lb_repo.get_current_week()
    standings = lb_repo.get_user_weekly_standings(user_id)

    # Calculate totals
    total_steem = sum(s['steem_reward'] for s in standings)
    total_coins = sum(s['coin_reward'] for s in standings)

    return {
        "success": True,
        "user_id": user_id,
        "week_start": week_start,
        "week_end": week_end,
        "games_count": len(standings),
        "total_projected_steem": total_steem,
        "total_projected_coins": total_coins,
        "standings": standings
    }
