"""Leaderboard models: Leaderboard, WeeklyLeaderboard, LeaderboardReward, WeeklyWinner."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.models.base import Base


class Leaderboard(Base):
    """Leaderboard model — one record per user per game (best score)."""
    __tablename__ = 'leaderboards'

    entry_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    score = Column(Integer, nullable=False)
    rank = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False)

    # Relationships
    user = relationship("User", back_populates="leaderboard_entries")
    game = relationship("Game", back_populates="leaderboard_entries")

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', name='uix_leaderboard_user_game'),
        Index('idx_leaderboard_game_score', 'game_id', 'score'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert leaderboard entry to dictionary."""
        return {
            "entry_id": self.entry_id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "score": self.score,
            "rank": self.rank,
            "created_at": self.created_at
        }

    def __repr__(self) -> str:
        return f"<Leaderboard {self.entry_id}: Rank {self.rank} - Score {self.score}>"


class WeeklyLeaderboard(Base):
    """Weekly leaderboard for game competitions with reset."""
    __tablename__ = 'weekly_leaderboards'

    entry_id = Column(String, primary_key=True)
    week_start = Column(String, nullable=False)
    week_end = Column(String, nullable=False)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    score = Column(Integer, nullable=False)
    rank = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    user = relationship("User")
    game = relationship("Game")

    __table_args__ = (
        UniqueConstraint('week_start', 'user_id', 'game_id', name='uix_weekly_lb_week_user_game'),
        Index('idx_weekly_lb_week', 'week_start', 'week_end'),
        Index('idx_weekly_lb_game_score', 'game_id', 'score'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert weekly leaderboard entry to dictionary."""
        return {
            "entry_id": self.entry_id,
            "week_start": self.week_start,
            "week_end": self.week_end,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "score": self.score,
            "rank": self.rank,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<WeeklyLeaderboard {self.week_start}: Rank {self.rank} - Score {self.score}>"


class LeaderboardReward(Base):
    """Configurable rewards for leaderboard rankings."""
    __tablename__ = 'leaderboard_rewards'

    reward_id = Column(String, primary_key=True)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=True)
    rank_start = Column(Integer, nullable=False)
    rank_end = Column(Integer, nullable=False)
    steem_reward = Column(Float, default=0.0)
    coin_reward = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    game = relationship("Game")

    __table_args__ = (
        Index('idx_lb_rewards_game_rank', 'game_id', 'rank_start', 'rank_end'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert reward config to dictionary."""
        return {
            "reward_id": self.reward_id,
            "game_id": self.game_id,
            "rank_start": self.rank_start,
            "rank_end": self.rank_end,
            "steem_reward": self.steem_reward,
            "coin_reward": self.coin_reward,
            "description": self.description,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<LeaderboardReward Rank {self.rank_start}-{self.rank_end}: {self.steem_reward} STEEM + {self.coin_reward} coins>"


class WeeklyWinner(Base):
    """Historical record of weekly leaderboard winners."""
    __tablename__ = 'weekly_winners'

    winner_id = Column(String, primary_key=True)
    week_start = Column(String, nullable=False)
    week_end = Column(String, nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    rank = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    steem_reward = Column(Float, default=0.0)
    coin_reward = Column(Integer, default=0)
    steem_tx_id = Column(String, nullable=True)
    reward_sent = Column(Integer, default=0)
    reward_sent_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False)

    # Relationships
    user = relationship("User")
    game = relationship("Game")

    __table_args__ = (
        Index('idx_winners_week', 'week_start', 'week_end'),
        Index('idx_winners_game', 'game_id', 'week_start'),
        Index('idx_winners_user', 'user_id'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert winner record to dictionary."""
        return {
            "winner_id": self.winner_id,
            "week_start": self.week_start,
            "week_end": self.week_end,
            "game_id": self.game_id,
            "user_id": self.user_id,
            "rank": self.rank,
            "score": self.score,
            "steem_reward": self.steem_reward,
            "coin_reward": self.coin_reward,
            "steem_tx_id": self.steem_tx_id,
            "reward_sent": bool(self.reward_sent),
            "reward_sent_at": self.reward_sent_at,
            "created_at": self.created_at
        }

    def __repr__(self) -> str:
        return f"<WeeklyWinner {self.week_start}: {self.user_id} - Rank {self.rank}>"
