"""
Leaderboard Repository
Handles weekly and all-time leaderboard operations
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
import uuid

from app.models import (
    WeeklyLeaderboard, 
    Leaderboard,  # All-time leaderboard (existing)
    LeaderboardReward,
    WeeklyWinner,
    User,
    Game
)


class LeaderboardRepository:
    """Repository for leaderboard operations."""
    
    def __init__(self, session: Session):
        self.session = session
    
    @staticmethod
    def get_current_week() -> Tuple[str, str]:
        """
        Get current week start (Monday) and end (Sunday).
        Returns ISO format dates: (week_start, week_end)
        """
        now = datetime.utcnow()
        # Get Monday of current week
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        # Get Sunday of current week
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        return week_start.date().isoformat(), week_end.date().isoformat()
    
    @staticmethod
    def get_previous_week() -> Tuple[str, str]:
        """Get previous week Monday-Sunday dates."""
        now = datetime.utcnow()
        current_monday = now - timedelta(days=now.weekday())
        previous_monday = current_monday - timedelta(days=7)
        previous_sunday = previous_monday + timedelta(days=6)
        
        return previous_monday.date().isoformat(), previous_sunday.date().isoformat()
    
    def update_weekly_score(self, user_id: str, game_id: str, score: int) -> WeeklyLeaderboard:
        """
        Update or create weekly leaderboard entry.
        Only keeps the best score for the week.
        
        IMPORTANTE: Esclude gli utenti anonimi (is_anonymous = 1)
        """
        # Check if user is anonymous - skip leaderboard update for anonymous users
        user = self.session.query(User).filter(User.user_id == user_id).first()
        if not user or user.is_anonymous:
            print(f"👤 User {user_id} is anonymous or not found, skipping weekly leaderboard update")
            return None
        
        week_start, week_end = self.get_current_week()
        now = datetime.utcnow().isoformat()
        
        # Check if entry exists for this week
        entry = self.session.query(WeeklyLeaderboard).filter(
            and_(
                WeeklyLeaderboard.week_start == week_start,
                WeeklyLeaderboard.user_id == user_id,
                WeeklyLeaderboard.game_id == game_id
            )
        ).first()
        
        if entry:
            # Update only if new score is better
            if score > entry.score:
                entry.score = score
                entry.updated_at = now
                self.session.commit()
        else:
            # Create new entry
            entry = WeeklyLeaderboard(
                entry_id=str(uuid.uuid4()),
                week_start=week_start,
                week_end=week_end,
                user_id=user_id,
                game_id=game_id,
                score=score,
                created_at=now,
                updated_at=now
            )
            self.session.add(entry)
            self.session.commit()
        
        return entry
    
    def update_all_time_score(self, user_id: str, game_id: str, score: int) -> Leaderboard:
        """
        Update or create all-time best score in existing leaderboards table.
        Only keeps the absolute best score ever.
        
        IMPORTANTE: Esclude gli utenti anonimi (is_anonymous = 1)
        """
        # Check if user is anonymous - skip leaderboard update for anonymous users
        user = self.session.query(User).filter(User.user_id == user_id).first()
        if not user or user.is_anonymous:
            print(f"👤 User {user_id} is anonymous or not found, skipping all-time leaderboard update")
            return None
        
        now = datetime.utcnow().isoformat()
        
        # Check if entry exists
        entry = self.session.query(Leaderboard).filter(
            and_(
                Leaderboard.user_id == user_id,
                Leaderboard.game_id == game_id
            )
        ).first()
        
        if entry:
            # Update only if new score is better
            if score > entry.score:
                entry.score = score
                # created_at represents when the record was first achieved
                self.session.commit()
        else:
            # Create new entry
            entry = Leaderboard(
                entry_id=str(uuid.uuid4()),
                user_id=user_id,
                game_id=game_id,
                score=score,
                created_at=now
            )
            self.session.add(entry)
            self.session.commit()
        
        return entry
    
    def get_weekly_leaderboard(self, game_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get current week's leaderboard.
        If game_id is provided, returns leaderboard for that game.
        Otherwise, returns global weekly leaderboard.
        """
        week_start, week_end = self.get_current_week()
        
        query = self.session.query(
            WeeklyLeaderboard,
            User.username,
            User.is_anonymous,
            Game.title,
            User.steem_username
        ).join(
            User, WeeklyLeaderboard.user_id == User.user_id
        ).join(
            Game, WeeklyLeaderboard.game_id == Game.game_id
        ).filter(
            WeeklyLeaderboard.week_start == week_start,
            User.is_anonymous == 0  # Exclude anonymous users
        )
        
        if game_id:
            query = query.filter(WeeklyLeaderboard.game_id == game_id)
            query = query.order_by(
                desc(WeeklyLeaderboard.score),
                WeeklyLeaderboard.created_at.asc()  # Tiebreaker: chi arriva prima vince
            )
        else:
            # Global: aggregate scores per user
            query = self.session.query(
                WeeklyLeaderboard.user_id,
                User.username,
                User.is_anonymous,
                func.sum(WeeklyLeaderboard.score).label('total_score'),
                func.count(WeeklyLeaderboard.game_id).label('games_played'),
                User.steem_username
            ).join(
                User, WeeklyLeaderboard.user_id == User.user_id
            ).filter(
                WeeklyLeaderboard.week_start == week_start,
                User.is_anonymous == 0  # Exclude anonymous users
            ).group_by(
                WeeklyLeaderboard.user_id
            ).order_by(
                desc('total_score')
            )
        
        results = query.limit(limit).all()
        
        leaderboard = []
        for idx, row in enumerate(results, 1):
            if game_id:
                # Single game leaderboard
                entry = row[0]
                username = row[1] if not row[2] else f"Anonymous #{row[0].user_id[-6:]}"
                steem_username = row[4] if not row[2] else None
                leaderboard.append({
                    'rank': idx,
                    'entry_id': entry.entry_id,
                    'user_id': entry.user_id,
                    'username': username,
                    'steem_username': steem_username,
                    'score': entry.score,
                    'game_title': row[3],
                    'created_at': entry.created_at
                })
            else:
                # Global leaderboard
                username = row[1] if not row[2] else f"Anonymous #{row[0][-6:]}"
                steem_username = row[5] if not row[2] else None
                leaderboard.append({
                    'rank': idx,
                    'user_id': row[0],
                    'username': username,
                    'steem_username': steem_username,
                    'total_score': int(row[3]),
                    'games_played': row[4]
                })
        
        return leaderboard
    
    def get_all_time_leaderboard(self, game_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all-time best scores leaderboard using existing leaderboards table.
        If game_id is provided, returns leaderboard for that game.
        Otherwise, returns global all-time leaderboard.
        """
        query = self.session.query(
            Leaderboard,
            User.username,
            User.is_anonymous,
            Game.title,
            User.steem_username
        ).join(
            User, Leaderboard.user_id == User.user_id
        ).join(
            Game, Leaderboard.game_id == Game.game_id
        ).filter(
            User.is_anonymous == 0  # Exclude anonymous users
        )
        
        if game_id:
            query = query.filter(Leaderboard.game_id == game_id)
            query = query.order_by(
                desc(Leaderboard.score),
                Leaderboard.created_at.asc()  # Tiebreaker: chi arriva prima vince
            )
        else:
            # Global: aggregate best scores per user
            query = self.session.query(
                Leaderboard.user_id,
                User.username,
                User.is_anonymous,
                func.sum(Leaderboard.score).label('total_score'),
                func.count(Leaderboard.game_id).label('games_played'),
                User.steem_username
            ).join(
                User, Leaderboard.user_id == User.user_id
            ).filter(
                User.is_anonymous == 0  # Exclude anonymous users
            ).group_by(
                Leaderboard.user_id
            ).order_by(
                desc('total_score')
            )
        
        results = query.limit(limit).all()
        
        leaderboard = []
        for idx, row in enumerate(results, 1):
            if game_id:
                # Single game leaderboard
                entry = row[0]
                username = row[1] if not row[2] else f"Anonymous #{row[0].user_id[-6:]}"
                steem_username = row[4] if not row[2] else None
                leaderboard.append({
                    'rank': idx,
                    'entry_id': entry.entry_id,
                    'user_id': entry.user_id,
                    'username': username,
                    'steem_username': steem_username,
                    'score': entry.score,
                    'game_title': row[3],
                    'achieved_at': entry.created_at  # created_at is when record was achieved
                })
            else:
                # Global leaderboard
                username = row[1] if not row[2] else f"Anonymous #{row[0][-6:]}"
                steem_username = row[5] if not row[2] else None
                leaderboard.append({
                    'rank': idx,
                    'user_id': row[0],
                    'username': username,
                    'steem_username': steem_username,
                    'total_score': int(row[3]),
                    'games_played': row[4]
                })
        
        return leaderboard
    
    def get_rewards_for_rank(self, game_id: Optional[str], rank: int) -> Optional[LeaderboardReward]:
        """Get reward configuration for a specific rank."""
        # Try game-specific reward first
        if game_id:
            reward = self.session.query(LeaderboardReward).filter(
                and_(
                    LeaderboardReward.game_id == game_id,
                    LeaderboardReward.rank_start <= rank,
                    LeaderboardReward.rank_end >= rank,
                    LeaderboardReward.is_active == 1
                )
            ).first()
            
            if reward:
                return reward
        
        # Fall back to global reward (game_id = NULL)
        reward = self.session.query(LeaderboardReward).filter(
            and_(
                LeaderboardReward.game_id.is_(None),
                LeaderboardReward.rank_start <= rank,
                LeaderboardReward.rank_end >= rank,
                LeaderboardReward.is_active == 1
            )
        ).first()
        
        return reward
    
    def save_weekly_winners(self, week_start: str, week_end: str) -> List[WeeklyWinner]:
        """
        Save weekly winners to history.
        Returns list of created winner records.
        """
        now = datetime.utcnow().isoformat()
        winners = []
        
        # Get all games with their steem_rewards_enabled flag
        games = self.session.query(Game.game_id, Game.steem_rewards_enabled).all()
        
        for game in games:
            game_id = game[0]
            steem_enabled = bool(game[1])  # Check if Steem rewards are enabled for this game
            
            # Get top players for this game
            top_players = self.session.query(
                WeeklyLeaderboard.user_id,
                WeeklyLeaderboard.score
            ).filter(
                and_(
                    WeeklyLeaderboard.week_start == week_start,
                    WeeklyLeaderboard.game_id == game_id
                )
            ).order_by(
                desc(WeeklyLeaderboard.score),
                WeeklyLeaderboard.created_at.asc()  # Tiebreaker: chi arriva prima vince
            ).limit(10).all()  # Top 10
            
            for rank, player in enumerate(top_players, 1):
                user_id, score = player
                
                # Get reward for this rank
                reward = self.get_rewards_for_rank(game_id, rank)
                # Only give Steem rewards if enabled for this game
                steem_reward = (reward.steem_reward if reward else 0.0) if steem_enabled else 0.0
                coin_reward = reward.coin_reward if reward else 0
                
                # Create winner record
                winner = WeeklyWinner(
                    winner_id=str(uuid.uuid4()),
                    week_start=week_start,
                    week_end=week_end,
                    game_id=game_id,
                    user_id=user_id,
                    rank=rank,
                    score=score,
                    steem_reward=steem_reward,
                    coin_reward=coin_reward,
                    reward_sent=0,
                    created_at=now
                )
                
                self.session.add(winner)
                winners.append(winner)
        
        self.session.commit()
        return winners
    
    def get_winners_history(self, limit: int = 50, game_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get historical weekly winners."""
        query = self.session.query(
            WeeklyWinner,
            User.username,
            User.steem_username,
            User.is_anonymous,
            Game.title
        ).join(
            User, WeeklyWinner.user_id == User.user_id
        ).join(
            Game, WeeklyWinner.game_id == Game.game_id
        )
        
        if game_id:
            query = query.filter(WeeklyWinner.game_id == game_id)
        
        query = query.order_by(
            desc(WeeklyWinner.week_start),
            WeeklyWinner.rank
        )
        
        results = query.limit(limit).all()
        
        history = []
        for row in results:
            winner = row[0]
            username = row[1] if not row[3] else f"Anonymous #{row[0].user_id[-6:]}"
            history.append({
                'winner_id': winner.winner_id,
                'week_start': winner.week_start,
                'week_end': winner.week_end,
                'game_id': winner.game_id,
                'game_title': row[4],
                'user_id': winner.user_id,
                'username': username,
                'steem_username': row[2],
                'rank': winner.rank,
                'score': winner.score,
                'steem_reward': winner.steem_reward,
                'coin_reward': winner.coin_reward,
                'reward_sent': bool(winner.reward_sent),
                'reward_sent_at': winner.reward_sent_at,
                'steem_tx_id': winner.steem_tx_id
            })
        
        return history
    
    def clear_weekly_leaderboard(self, week_start: str) -> int:
        """
        Clear weekly leaderboard for a specific week.
        Returns number of entries deleted.
        """
        deleted = self.session.query(WeeklyLeaderboard).filter(
            WeeklyLeaderboard.week_start == week_start
        ).delete()
        
        self.session.commit()
        return deleted
