"""
Community Stats Repository
Provides data access for community analytics using SQLAlchemy ORM.
Cross-cutting repository that aggregates data from multiple models.
Following SOLID principles and existing repository patterns.
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, desc, asc, case

from app.models import (
    Game, User, GameSession, Leaderboard,
    UserCoins, CoinTransaction
)


class CommunityStatsRepository:
    """
    Repository for community analytics queries.
    Uses SQLAlchemy ORM for all data access - no raw SQL.
    Single Responsibility: Handles analytics data retrieval only.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session

    # =========================================================================
    # Game Activity - Day by Day
    # =========================================================================

    def get_daily_game_activity(
        self,
        days: int = 30,
        game_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get game activity aggregated by day.
        Groups sessions by date and game, returning counts and totals.
        
        Args:
            days: Number of past days to include
            game_id: Optional filter for a specific game
        """
        try:
            date_expr = func.substr(GameSession.started_at, 1, 10)

            query = self.db_session.query(
                date_expr.label("date"),
                GameSession.game_id,
                Game.title.label("game_title"),
                func.count(GameSession.session_id).label("sessions_count"),
                func.count(func.distinct(GameSession.user_id)).label("unique_players"),
                func.coalesce(func.sum(GameSession.score), 0).label("total_score"),
                func.coalesce(func.avg(GameSession.score), 0).label("avg_score"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp_earned"),
                func.coalesce(func.sum(GameSession.duration_seconds), 0).label("total_duration_seconds"),
            ).join(
                Game, GameSession.game_id == Game.game_id
            )

            if game_id:
                query = query.filter(GameSession.game_id == game_id)

            # Filter by date range using string comparison (ISO format)
            if days > 0:
                from datetime import datetime, timedelta
                cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
                query = query.filter(date_expr >= cutoff)

            results = query.group_by(
                date_expr, GameSession.game_id, Game.title
            ).order_by(
                asc(date_expr), asc(Game.title)
            ).all()

            return [
                {
                    "date": row.date,
                    "game_id": row.game_id,
                    "game_title": row.game_title,
                    "sessions_count": row.sessions_count,
                    "unique_players": row.unique_players,
                    "total_score": row.total_score,
                    "avg_score": round(float(row.avg_score), 1),
                    "total_xp_earned": round(float(row.total_xp_earned), 2),
                    "total_duration_seconds": row.total_duration_seconds,
                }
                for row in results
            ]
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching daily game activity: {str(e)}")

    # =========================================================================
    # Users Ranked List
    # =========================================================================

    def get_users_ranked(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get registered (non-anonymous) users ranked by total_xp_earned descending.
        Returns user details plus games played count.
        
        Returns:
            Tuple of (user list, total count)
        """
        try:
            # Count total non-anonymous users
            total = self.db_session.query(
                func.count(User.user_id)
            ).filter(
                User.is_anonymous == 0
            ).scalar() or 0

            # Subquery: count sessions per user
            sessions_sub = self.db_session.query(
                GameSession.user_id,
                func.count(GameSession.session_id).label("games_played"),
                func.count(func.distinct(GameSession.game_id)).label("unique_games")
            ).group_by(
                GameSession.user_id
            ).subquery()

            # Subquery: coin balance
            coins_sub = self.db_session.query(
                UserCoins.user_id,
                UserCoins.balance.label("coin_balance"),
                UserCoins.total_earned.label("coins_total_earned")
            ).subquery()

            # Main query
            query = self.db_session.query(
                User,
                func.coalesce(sessions_sub.c.games_played, 0).label("games_played"),
                func.coalesce(sessions_sub.c.unique_games, 0).label("unique_games"),
                func.coalesce(coins_sub.c.coin_balance, 0).label("coin_balance"),
                func.coalesce(coins_sub.c.coins_total_earned, 0).label("coins_total_earned"),
            ).outerjoin(
                sessions_sub, User.user_id == sessions_sub.c.user_id
            ).outerjoin(
                coins_sub, User.user_id == coins_sub.c.user_id
            ).filter(
                User.is_anonymous == 0
            ).order_by(
                desc(User.total_xp_earned)
            ).offset(offset).limit(limit)

            results = query.all()

            # Build ranked list
            from app.level_system import LevelSystem

            ranked_users = []
            for idx, row in enumerate(results):
                user = row[0]
                games_played = row.games_played
                unique_games = row.unique_games
                coin_balance = row.coin_balance
                coins_total_earned = row.coins_total_earned

                level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
                milestone = LevelSystem.get_level_info(level) if hasattr(LevelSystem, 'get_level_info') else None

                # Get milestone info manually from LEVEL_MILESTONES
                level_title = "Novizio"
                level_badge = "🌱"
                level_color = "#A0A0A0"
                for milestone_level in sorted(LevelSystem.LEVEL_MILESTONES.keys(), reverse=True):
                    if level >= milestone_level:
                        info = LevelSystem.LEVEL_MILESTONES[milestone_level]
                        level_title = info["title"]
                        level_badge = info["badge"]
                        level_color = info["color"]
                        break

                ranked_users.append({
                    "rank": offset + idx + 1,
                    "user_id": user.user_id,
                    "username": user.username,
                    "avatar": user.avatar,
                    "steem_username": user.steem_username,
                    "level": level,
                    "level_title": level_title,
                    "level_badge": level_badge,
                    "level_color": level_color,
                    "total_xp_earned": round(float(user.total_xp_earned or 0), 2),
                    "coin_balance": coin_balance,
                    "coins_total_earned": coins_total_earned,
                    "login_streak": user.login_streak or 0,
                    "games_played": games_played,
                    "unique_games": unique_games,
                    "created_at": user.created_at,
                    "last_login": user.last_login,
                })

            return ranked_users, total

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching ranked users: {str(e)}")

    # =========================================================================
    # Economy Stats - XP & Coins
    # =========================================================================

    def get_daily_economy_stats(
        self,
        days: int = 30,
        game_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get XP and coins distributed per day.
        XP comes from GameSession.xp_earned, coins from CoinTransaction.
        
        Args:
            days: Number of past days to include
            game_id: Optional filter for a specific game (XP only, coins are platform-wide)
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d") if days > 0 else None

            # --- XP per day (from sessions) ---
            xp_date_expr = func.substr(GameSession.started_at, 1, 10)
            xp_query = self.db_session.query(
                xp_date_expr.label("date"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("sessions_count"),
                func.count(func.distinct(GameSession.user_id)).label("active_players"),
            )

            if game_id:
                xp_query = xp_query.filter(GameSession.game_id == game_id)
            if cutoff:
                xp_query = xp_query.filter(xp_date_expr >= cutoff)

            xp_results = xp_query.group_by(xp_date_expr).all()
            xp_by_date = {
                row.date: {
                    "total_xp": round(float(row.total_xp), 2),
                    "sessions_count": row.sessions_count,
                    "active_players": row.active_players,
                }
                for row in xp_results
            }

            # --- Coins per day (from transactions, only positive earnings) ---
            coin_date_expr = func.substr(CoinTransaction.created_at, 1, 10)
            coins_query = self.db_session.query(
                coin_date_expr.label("date"),
                func.coalesce(
                    func.sum(case((CoinTransaction.amount > 0, CoinTransaction.amount), else_=0)),
                    0
                ).label("coins_earned"),
                func.coalesce(
                    func.sum(case((CoinTransaction.amount < 0, func.abs(CoinTransaction.amount)), else_=0)),
                    0
                ).label("coins_spent"),
            )

            if cutoff:
                coins_query = coins_query.filter(coin_date_expr >= cutoff)

            coins_results = coins_query.group_by(coin_date_expr).all()
            coins_by_date = {
                row.date: {
                    "coins_earned": int(row.coins_earned),
                    "coins_spent": int(row.coins_spent),
                }
                for row in coins_results
            }

            # --- Merge XP and Coins ---
            all_dates = sorted(set(list(xp_by_date.keys()) + list(coins_by_date.keys())))
            merged = []
            for date in all_dates:
                xp_data = xp_by_date.get(date, {"total_xp": 0, "sessions_count": 0, "active_players": 0})
                coin_data = coins_by_date.get(date, {"coins_earned": 0, "coins_spent": 0})
                merged.append({
                    "date": date,
                    "total_xp": xp_data["total_xp"],
                    "coins_earned": coin_data["coins_earned"],
                    "coins_spent": coin_data["coins_spent"],
                    "sessions_count": xp_data["sessions_count"],
                    "active_players": xp_data["active_players"],
                })

            return merged

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching daily economy stats: {str(e)}")

    def get_weekly_economy_stats(
        self,
        weeks: int = 12,
        game_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get XP and coins distributed per week.
        
        Args:
            weeks: Number of past weeks to include
            game_id: Optional filter for a specific game (XP only)
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(weeks=weeks)).strftime("%Y-%m-%d") if weeks > 0 else None

            # --- XP per week ---
            xp_date_expr = func.substr(GameSession.started_at, 1, 10)
            # SQLite: strftime('%Y-%W', date) gives year-week
            xp_week_expr = func.strftime('%Y-%W', GameSession.started_at)

            xp_query = self.db_session.query(
                xp_week_expr.label("year_week"),
                func.min(xp_date_expr).label("week_start"),
                func.max(xp_date_expr).label("week_end"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("sessions_count"),
                func.count(func.distinct(GameSession.user_id)).label("active_players"),
            )

            if game_id:
                xp_query = xp_query.filter(GameSession.game_id == game_id)
            if cutoff:
                xp_query = xp_query.filter(xp_date_expr >= cutoff)

            xp_results = xp_query.group_by(xp_week_expr).order_by(asc(xp_week_expr)).all()
            xp_by_week = {
                row.year_week: {
                    "week_start": row.week_start,
                    "week_end": row.week_end,
                    "total_xp": round(float(row.total_xp), 2),
                    "sessions_count": row.sessions_count,
                    "active_players": row.active_players,
                }
                for row in xp_results
            }

            # --- Coins per week ---
            coin_date_expr = func.substr(CoinTransaction.created_at, 1, 10)
            coin_week_expr = func.strftime('%Y-%W', CoinTransaction.created_at)

            coins_query = self.db_session.query(
                coin_week_expr.label("year_week"),
                func.min(coin_date_expr).label("week_start"),
                func.max(coin_date_expr).label("week_end"),
                func.coalesce(
                    func.sum(case((CoinTransaction.amount > 0, CoinTransaction.amount), else_=0)),
                    0
                ).label("coins_earned"),
                func.coalesce(
                    func.sum(case((CoinTransaction.amount < 0, func.abs(CoinTransaction.amount)), else_=0)),
                    0
                ).label("coins_spent"),
            )

            if cutoff:
                coins_query = coins_query.filter(coin_date_expr >= cutoff)

            coins_results = coins_query.group_by(coin_week_expr).all()
            coins_by_week = {
                row.year_week: {
                    "week_start": row.week_start,
                    "week_end": row.week_end,
                    "coins_earned": int(row.coins_earned),
                    "coins_spent": int(row.coins_spent),
                }
                for row in coins_results
            }

            # --- Merge ---
            all_weeks = sorted(set(list(xp_by_week.keys()) + list(coins_by_week.keys())))
            merged = []
            for week in all_weeks:
                xp_data = xp_by_week.get(week, {
                    "week_start": "", "week_end": "",
                    "total_xp": 0, "sessions_count": 0, "active_players": 0
                })
                coin_data = coins_by_week.get(week, {
                    "week_start": "", "week_end": "",
                    "coins_earned": 0, "coins_spent": 0
                })
                merged.append({
                    "year_week": week,
                    "week_start": xp_data["week_start"] or coin_data["week_start"],
                    "week_end": xp_data["week_end"] or coin_data["week_end"],
                    "total_xp": xp_data["total_xp"],
                    "coins_earned": coin_data["coins_earned"],
                    "coins_spent": coin_data["coins_spent"],
                    "sessions_count": xp_data["sessions_count"],
                    "active_players": xp_data["active_players"],
                })

            return merged

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching weekly economy stats: {str(e)}")

    def get_historical_economy_stats(
        self,
        game_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all-time economy totals: platform-wide and per-game breakdown.
        
        Args:
            game_id: Optional filter for a specific game
        """
        try:
            # --- Platform totals (XP) ---
            xp_query = self.db_session.query(
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("total_sessions"),
                func.count(func.distinct(GameSession.user_id)).label("total_players"),
            )
            if game_id:
                xp_query = xp_query.filter(GameSession.game_id == game_id)
            xp_totals = xp_query.first()

            # --- Platform totals (Coins) ---
            coins_totals = self.db_session.query(
                func.coalesce(
                    func.sum(case((CoinTransaction.amount > 0, CoinTransaction.amount), else_=0)),
                    0
                ).label("total_coins_earned"),
                func.coalesce(
                    func.sum(case((CoinTransaction.amount < 0, func.abs(CoinTransaction.amount)), else_=0)),
                    0
                ).label("total_coins_spent"),
                func.count(CoinTransaction.transaction_id).label("total_transactions"),
            ).first()

            # --- Per-game breakdown ---
            per_game_query = self.db_session.query(
                GameSession.game_id,
                Game.title.label("game_title"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("total_sessions"),
                func.count(func.distinct(GameSession.user_id)).label("unique_players"),
                func.coalesce(func.sum(GameSession.score), 0).label("total_score"),
                func.coalesce(func.avg(GameSession.score), 0).label("avg_score"),
                func.coalesce(func.sum(GameSession.duration_seconds), 0).label("total_duration"),
            ).join(
                Game, GameSession.game_id == Game.game_id
            )

            if game_id:
                per_game_query = per_game_query.filter(GameSession.game_id == game_id)

            per_game_results = per_game_query.group_by(
                GameSession.game_id, Game.title
            ).order_by(
                desc(func.sum(GameSession.xp_earned))
            ).all()

            games_breakdown = [
                {
                    "game_id": row.game_id,
                    "game_title": row.game_title,
                    "total_xp": round(float(row.total_xp), 2),
                    "total_sessions": row.total_sessions,
                    "unique_players": row.unique_players,
                    "total_score": row.total_score,
                    "avg_score": round(float(row.avg_score), 1),
                    "total_duration_seconds": row.total_duration,
                }
                for row in per_game_results
            ]

            # --- Total registered users ---
            total_users = self.db_session.query(
                func.count(User.user_id)
            ).filter(
                User.is_anonymous == 0
            ).scalar() or 0

            # --- Total games ---
            total_games = self.db_session.query(
                func.count(Game.game_id)
            ).scalar() or 0

            return {
                "platform": {
                    "total_xp_distributed": round(float(xp_totals.total_xp), 2),
                    "total_sessions": xp_totals.total_sessions,
                    "total_active_players": xp_totals.total_players,
                    "total_coins_earned": int(coins_totals.total_coins_earned),
                    "total_coins_spent": int(coins_totals.total_coins_spent),
                    "total_coin_transactions": coins_totals.total_transactions,
                    "total_registered_users": total_users,
                    "total_games": total_games,
                },
                "games": games_breakdown,
            }

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching historical economy stats: {str(e)}")

    # =========================================================================
    # Economy Stats - Per Game (XP & Coins daily/weekly)
    # =========================================================================

    def get_daily_economy_per_game(
        self,
        game_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get XP distributed per day for a specific game.
        Coins are tracked at user level, so we include coin transactions
        with source_id referencing the game.
        
        Args:
            game_id: Game identifier
            days: Number of past days to include
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d") if days > 0 else None

            date_expr = func.substr(GameSession.started_at, 1, 10)

            query = self.db_session.query(
                date_expr.label("date"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("sessions_count"),
                func.count(func.distinct(GameSession.user_id)).label("active_players"),
                func.coalesce(func.sum(GameSession.score), 0).label("total_score"),
                func.coalesce(func.avg(GameSession.score), 0).label("avg_score"),
            ).filter(
                GameSession.game_id == game_id
            )

            if cutoff:
                query = query.filter(date_expr >= cutoff)

            results = query.group_by(date_expr).order_by(asc(date_expr)).all()

            return [
                {
                    "date": row.date,
                    "game_id": game_id,
                    "total_xp": round(float(row.total_xp), 2),
                    "sessions_count": row.sessions_count,
                    "active_players": row.active_players,
                    "total_score": row.total_score,
                    "avg_score": round(float(row.avg_score), 1),
                }
                for row in results
            ]

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching daily economy for game {game_id}: {str(e)}")

    def get_weekly_economy_per_game(
        self,
        game_id: str,
        weeks: int = 12
    ) -> List[Dict[str, Any]]:
        """
        Get XP distributed per week for a specific game.
        
        Args:
            game_id: Game identifier
            weeks: Number of past weeks to include
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(weeks=weeks)).strftime("%Y-%m-%d") if weeks > 0 else None

            date_expr = func.substr(GameSession.started_at, 1, 10)
            week_expr = func.strftime('%Y-%W', GameSession.started_at)

            query = self.db_session.query(
                week_expr.label("year_week"),
                func.min(date_expr).label("week_start"),
                func.max(date_expr).label("week_end"),
                func.coalesce(func.sum(GameSession.xp_earned), 0).label("total_xp"),
                func.count(GameSession.session_id).label("sessions_count"),
                func.count(func.distinct(GameSession.user_id)).label("active_players"),
                func.coalesce(func.sum(GameSession.score), 0).label("total_score"),
                func.coalesce(func.avg(GameSession.score), 0).label("avg_score"),
            ).filter(
                GameSession.game_id == game_id
            )

            if cutoff:
                query = query.filter(date_expr >= cutoff)

            results = query.group_by(week_expr).order_by(asc(week_expr)).all()

            return [
                {
                    "year_week": row.year_week,
                    "week_start": row.week_start,
                    "week_end": row.week_end,
                    "game_id": game_id,
                    "total_xp": round(float(row.total_xp), 2),
                    "sessions_count": row.sessions_count,
                    "active_players": row.active_players,
                    "total_score": row.total_score,
                    "avg_score": round(float(row.avg_score), 1),
                }
                for row in results
            ]

        except SQLAlchemyError as e:
            raise Exception(f"Error fetching weekly economy for game {game_id}: {str(e)}")
