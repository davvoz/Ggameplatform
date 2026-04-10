"""Platform models: PlatformConfig, Campaign, UserLoginStreak, DailyLoginRewardConfig."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import Base


class PlatformConfig(Base):
    """Platform configuration — stores platform-wide settings like reset epoch."""
    __tablename__ = 'platform_config'

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(String, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert platform config to dictionary."""
        return {
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<PlatformConfig {self.key}={self.value}>"


class Campaign(Base):
    """Campaign model — associates games with XP bonus periods."""
    __tablename__ = 'campaigns'

    campaign_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default='')
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False, index=True)
    xp_multiplier = Column(Float, nullable=False, default=1.5)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    is_active = Column(Integer, default=1)
    badge_label = Column(String(30), default='CAMPAIGN')
    badge_color = Column(String(7), default='#ff6b00')
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    game = relationship("Game", backref="campaigns")

    def to_dict(self) -> Dict[str, Any]:
        """Convert campaign instance to dictionary."""
        return {
            "campaign_id": self.campaign_id,
            "name": self.name,
            "description": self.description,
            "game_id": self.game_id,
            "xp_multiplier": self.xp_multiplier,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "is_active": bool(self.is_active),
            "badge_label": self.badge_label,
            "badge_color": self.badge_color,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<Campaign {self.campaign_id}: {self.name} ({self.game_id})>"


class UserLoginStreak(Base):
    """Daily login reward tracking for 7-day cycle system."""
    __tablename__ = 'user_login_streak'

    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    current_day = Column(Integer, default=1)
    last_claim_date = Column(String, nullable=True)
    total_cycles_completed = Column(Integer, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index('idx_user_login_streak_user', 'user_id'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert daily login reward instance to dictionary."""
        return {
            "user_id": self.user_id,
            "current_day": self.current_day,
            "last_claim_date": self.last_claim_date,
            "total_cycles_completed": self.total_cycles_completed,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<UserLoginStreak {self.user_id}: Day {self.current_day}>"


class DailyLoginRewardConfig(Base):
    """Daily login reward configuration — defines rewards for each day of the 7-day cycle."""
    __tablename__ = 'daily_login_reward_config'

    day = Column(Integer, primary_key=True)
    coins_reward = Column(Integer, nullable=False)
    emoji = Column(Text, default='🪙')
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert daily login reward config instance to dictionary."""
        return {
            "day": self.day,
            "coins_reward": self.coins_reward,
            "emoji": self.emoji,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<DailyLoginRewardConfig Day {self.day}: {self.coins_reward} coins>"
