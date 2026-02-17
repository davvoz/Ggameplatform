"""
Community Stats Router - API endpoints for community analytics.
Provides data for charts, infographics, and tables in the community section.

Endpoints:
- GET /api/community/stats/games/daily       → Game activity day by day
- GET /api/community/stats/users/ranked       → Users ranked list with details
- GET /api/community/stats/economy/daily      → XP & Coins per day
- GET /api/community/stats/economy/weekly     → XP & Coins per week
- GET /api/community/stats/economy/historical → All-time totals + per-game breakdown
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

from app.database import get_db
from app.community_stats_repository import CommunityStatsRepository
from app.community_stats_service import CommunityStatsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/community/stats", tags=["Community Stats"])


# =============================================================================
# Dependency Injection
# =============================================================================

def get_community_stats_service(db: Session = Depends(get_db)) -> CommunityStatsService:
    """Dependency to get CommunityStatsService instance following existing DI pattern."""
    repository = CommunityStatsRepository(db)
    return CommunityStatsService(repository)


# =============================================================================
# Response Schemas (Pydantic)
# =============================================================================

class GameDailyActivityItem(BaseModel):
    """Single day activity record for a game."""
    date: str
    game_id: str
    game_title: str
    sessions_count: int
    unique_players: int
    total_score: int
    avg_score: float
    total_xp_earned: float
    total_duration_seconds: int


class GameDailyActivityResponse(BaseModel):
    """Response for daily game activity endpoint."""
    success: bool
    days: int
    game_id: Optional[str]
    total_records: int
    data: List[GameDailyActivityItem]


class RankedUserItem(BaseModel):
    """Single user in the ranked list."""
    rank: int
    user_id: str
    username: Optional[str]
    avatar: Optional[str]
    steem_username: Optional[str]
    level: int
    level_title: str
    level_badge: str
    level_color: str
    total_xp_earned: float
    coin_balance: int
    coins_total_earned: int
    login_streak: int
    games_played: int
    unique_games: int
    created_at: Optional[str]
    last_login: Optional[str]


class RankedUsersResponse(BaseModel):
    """Response for ranked users endpoint."""
    success: bool
    total: int
    limit: int
    offset: int
    data: List[RankedUserItem]


class EconomyDailyItem(BaseModel):
    """Single day economy record (platform-wide)."""
    date: str
    total_xp: float
    coins_earned: int
    coins_spent: int
    sessions_count: int
    active_players: int


class EconomyDailyResponse(BaseModel):
    """Response for daily economy stats endpoint."""
    success: bool
    period: str
    days: int
    game_id: Optional[str]
    total_records: int
    data: List[dict]  # Can be EconomyDailyItem or per-game variant


class EconomyWeeklyItem(BaseModel):
    """Single week economy record."""
    year_week: str
    week_start: str
    week_end: str
    total_xp: float
    coins_earned: int
    coins_spent: int
    sessions_count: int
    active_players: int


class EconomyWeeklyResponse(BaseModel):
    """Response for weekly economy stats endpoint."""
    success: bool
    period: str
    weeks: int
    game_id: Optional[str]
    total_records: int
    data: List[dict]  # Can be EconomyWeeklyItem or per-game variant


class PlatformTotals(BaseModel):
    """Platform-wide totals."""
    total_xp_distributed: float
    total_sessions: int
    total_active_players: int
    total_coins_earned: int
    total_coins_spent: int
    total_coin_transactions: int
    total_registered_users: int
    total_games: int


class GameBreakdownItem(BaseModel):
    """Per-game breakdown record."""
    game_id: str
    game_title: str
    total_xp: float
    total_sessions: int
    unique_players: int
    total_score: int
    avg_score: float
    total_duration_seconds: int


class EconomyHistoricalResponse(BaseModel):
    """Response for historical economy stats endpoint."""
    success: bool
    period: str
    game_id: Optional[str]
    platform: PlatformTotals
    games: List[GameBreakdownItem]


class AchieverBreakdownItem(BaseModel):
    """Single breakdown entry for an achiever (game or source)."""
    game_title: Optional[str] = None
    source: Optional[str] = None
    value: float
    sessions: Optional[int] = None
    best_score: Optional[int] = None
    duration: Optional[int] = None
    count: Optional[int] = None


class AchieverItem(BaseModel):
    """A top achiever user with details and breakdown."""
    user_id: str
    username: Optional[str]
    steem_username: Optional[str]
    level: int
    level_title: str
    level_badge: str
    level_color: str
    total_xp_earned: float
    coin_balance: int
    login_streak: int
    metric_value: float
    sessions: int
    unique_games: int
    total_duration: int
    breakdown: List[AchieverBreakdownItem]


class TopAchieversResponse(BaseModel):
    """Response for top achievers endpoint."""
    success: bool
    xp_daily: Optional[AchieverItem] = None
    xp_weekly: Optional[AchieverItem] = None
    xp_alltime: Optional[AchieverItem] = None
    coins_daily: Optional[AchieverItem] = None
    coins_weekly: Optional[AchieverItem] = None
    coins_alltime: Optional[AchieverItem] = None


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/games/daily", response_model=GameDailyActivityResponse)
async def get_games_daily_activity(
    days: int = Query(30, ge=1, le=365, description="Number of past days to include"),
    game_id: Optional[str] = Query(None, description="Filter by specific game ID"),
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get game activity trends day by day.
    
    Returns sessions count, unique players, scores, XP earned, and play duration
    aggregated per day and per game. Ideal for line/bar charts showing game popularity trends.
    
    - **days**: Number of past days (1-365, default 30)
    - **game_id**: Optional filter for a specific game
    """
    try:
        result = service.get_games_daily_activity(days=days, game_id=game_id)
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching daily game activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch game activity: {str(e)}"
        )


@router.get("/users/ranked", response_model=RankedUsersResponse)
async def get_users_ranked(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of users to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get registered users ranked by total XP earned.
    
    Returns user details including level, badges, XP, coins, login streak,
    and games played. Ideal for leaderboard tables and user rankings.
    
    - **limit**: Max users per page (1-200, default 50)
    - **offset**: Pagination offset for scrolling through results
    """
    try:
        result = service.get_users_ranked(limit=limit, offset=offset)
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching ranked users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ranked users: {str(e)}"
        )


@router.get("/economy/daily", response_model=EconomyDailyResponse)
async def get_economy_daily(
    days: int = Query(30, ge=1, le=365, description="Number of past days to include"),
    game_id: Optional[str] = Query(None, description="Filter by specific game ID"),
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get XP and coins distributed per day.
    
    Shows daily economy flow: XP earned, coins earned/spent, active players.
    When game_id is provided, shows per-game XP data with scores.
    
    - **days**: Number of past days (1-365, default 30)
    - **game_id**: Optional filter for a specific game
    """
    try:
        result = service.get_economy_daily(days=days, game_id=game_id)
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching daily economy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch daily economy stats: {str(e)}"
        )


@router.get("/economy/weekly", response_model=EconomyWeeklyResponse)
async def get_economy_weekly(
    weeks: int = Query(12, ge=1, le=52, description="Number of past weeks to include"),
    game_id: Optional[str] = Query(None, description="Filter by specific game ID"),
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get XP and coins distributed per week.
    
    Shows weekly economy trends. When game_id is provided, shows per-game data.
    
    - **weeks**: Number of past weeks (1-52, default 12)
    - **game_id**: Optional filter for a specific game
    """
    try:
        result = service.get_economy_weekly(weeks=weeks, game_id=game_id)
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching weekly economy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch weekly economy stats: {str(e)}"
        )


@router.get("/economy/historical", response_model=EconomyHistoricalResponse)
async def get_economy_historical(
    game_id: Optional[str] = Query(None, description="Filter by specific game ID"),
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get all-time economy totals with per-game breakdown.
    
    Returns platform-wide totals (XP, coins, sessions, users, games count)
    plus a breakdown per game. Ideal for summary dashboards and pie charts.
    
    - **game_id**: Optional filter for a specific game
    """
    try:
        result = service.get_economy_historical(game_id=game_id)
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching historical economy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch historical economy stats: {str(e)}"
        )


@router.get("/top-achievers", response_model=TopAchieversResponse)
async def get_top_achievers(
    service: CommunityStatsService = Depends(get_community_stats_service)
):
    """
    Get the top XP and coins earners for today, this week, and all-time.

    Returns the champion user for each metric/period with details on how
    they reached that result (game breakdown for XP, source breakdown for coins).
    Ideal for "Hall of Fame" / "Top Achievers" infographic cards.
    """
    try:
        result = service.get_top_achievers()
        return result
    except Exception as e:
        logger.error(f"[CommunityStats] Error fetching top achievers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch top achievers: {str(e)}"
        )
