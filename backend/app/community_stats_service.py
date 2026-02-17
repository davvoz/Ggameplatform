"""
Community Stats Service
Business logic and orchestration for community analytics.
Following SOLID principles and existing service layer patterns.
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.community_stats_repository import CommunityStatsRepository


class CommunityStatsService:
    """
    Service layer for community analytics.
    Single Responsibility: Orchestrates analytics operations and applies business rules.
    Depends on CommunityStatsRepository for data access.
    """

    def __init__(self, repository: CommunityStatsRepository):
        self.repository = repository

    # =========================================================================
    # Game Activity
    # =========================================================================

    def get_games_daily_activity(
        self,
        days: int = 30,
        game_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get game activity trends day by day.
        
        Args:
            days: Number of past days (default 30, max 365)
            game_id: Optional filter for a specific game
            
        Returns:
            Response dict with success flag and data array
        """
        # Validate and cap days
        days = min(max(days, 1), 365)

        data = self.repository.get_daily_game_activity(days=days, game_id=game_id)

        return {
            "success": True,
            "days": days,
            "game_id": game_id,
            "total_records": len(data),
            "data": data,
        }

    # =========================================================================
    # Users Ranked
    # =========================================================================

    def get_users_ranked(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get registered users ranked by XP with details.
        
        Args:
            limit: Max users to return (default 50, max 200)
            offset: Pagination offset
            
        Returns:
            Response dict with success flag, total count, data array
        """
        # Validate and cap limit
        limit = min(max(limit, 1), 200)
        offset = max(offset, 0)

        users, total = self.repository.get_users_ranked(limit=limit, offset=offset)

        return {
            "success": True,
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": users,
        }

    # =========================================================================
    # Economy Stats
    # =========================================================================

    def get_economy_daily(
        self,
        days: int = 30,
        game_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get XP and coins distributed per day.
        If game_id is provided, gets per-game XP data.
        
        Args:
            days: Number of past days (default 30, max 365)
            game_id: Optional filter for a specific game
            
        Returns:
            Response dict with success flag and data array
        """
        days = min(max(days, 1), 365)

        if game_id:
            data = self.repository.get_daily_economy_per_game(game_id=game_id, days=days)
        else:
            data = self.repository.get_daily_economy_stats(days=days)

        return {
            "success": True,
            "period": "daily",
            "days": days,
            "game_id": game_id,
            "total_records": len(data),
            "data": data,
        }

    def get_economy_weekly(
        self,
        weeks: int = 12,
        game_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get XP and coins distributed per week.
        If game_id is provided, gets per-game XP data.
        
        Args:
            weeks: Number of past weeks (default 12, max 52)
            game_id: Optional filter for a specific game
            
        Returns:
            Response dict with success flag and data array
        """
        weeks = min(max(weeks, 1), 52)

        if game_id:
            data = self.repository.get_weekly_economy_per_game(game_id=game_id, weeks=weeks)
        else:
            data = self.repository.get_weekly_economy_stats(weeks=weeks)

        return {
            "success": True,
            "period": "weekly",
            "weeks": weeks,
            "game_id": game_id,
            "total_records": len(data),
            "data": data,
        }

    def get_economy_historical(
        self,
        game_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all-time economy totals with per-game breakdown.
        
        Args:
            game_id: Optional filter for a specific game
            
        Returns:
            Response dict with platform totals and games breakdown
        """
        data = self.repository.get_historical_economy_stats(game_id=game_id)

        return {
            "success": True,
            "period": "historical",
            "game_id": game_id,
            **data,
        }

    # =========================================================================
    # Top Achievers
    # =========================================================================

    def get_top_achievers(self) -> Dict[str, Any]:
        """
        Get the top XP and coins earners for today, this week, and all-time.
        Each includes user details and a breakdown of how they achieved it.

        Returns:
            Response dict with 6 achiever slots (some may be None)
        """
        data = self.repository.get_top_achievers()

        return {
            "success": True,
            **data,
        }
