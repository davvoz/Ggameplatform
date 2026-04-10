"""Economy models: XPRule, UserCoins, CoinTransaction, LevelMilestone, LevelReward."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
import json

from app.models.base import Base


class XPRule(Base):
    """XP Rule model for configurable XP calculation per game."""
    __tablename__ = 'xp_rules'

    rule_id = Column(String, primary_key=True)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    rule_name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)
    parameters = Column(Text, default='{}')
    priority = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    game = relationship("Game", back_populates="xp_rules")

    def to_dict(self) -> Dict[str, Any]:
        """Convert XP rule instance to dictionary."""
        return {
            "rule_id": self.rule_id,
            "game_id": self.game_id,
            "rule_name": self.rule_name,
            "rule_type": self.rule_type,
            "parameters": json.loads(self.parameters) if self.parameters else {},
            "priority": self.priority,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<XPRule {self.rule_id}: {self.rule_name} ({self.rule_type})>"


class UserCoins(Base):
    """User coin balance tracking."""
    __tablename__ = 'user_coins'

    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    balance = Column(Integer, default=0, nullable=False)
    total_earned = Column(Integer, default=0, nullable=False)
    total_spent = Column(Integer, default=0, nullable=False)
    last_updated = Column(String, nullable=False)
    created_at = Column(String, nullable=False)

    # Relationships
    user = relationship("User")

    def to_dict(self) -> Dict[str, Any]:
        """Convert user coins to dictionary."""
        return {
            "user_id": self.user_id,
            "balance": self.balance,
            "total_earned": self.total_earned,
            "total_spent": self.total_spent,
            "last_updated": self.last_updated,
            "created_at": self.created_at
        }

    def __repr__(self) -> str:
        return f"<UserCoins User:{self.user_id} Balance:{self.balance}>"


class CoinTransaction(Base):
    """Coin transaction history."""
    __tablename__ = 'coin_transactions'

    transaction_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String, nullable=False)
    source_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    balance_after = Column(Integer, nullable=False)
    created_at = Column(String, nullable=False)
    extra_data = Column(Text, default='{}')

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index('idx_transactions_user_date', 'user_id', 'created_at'),
        Index('idx_transactions_type', 'transaction_type'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert transaction to dictionary."""
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "source_id": self.source_id,
            "description": self.description,
            "balance_after": self.balance_after,
            "created_at": self.created_at,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }

    def __repr__(self) -> str:
        return f"<CoinTransaction {self.transaction_id}: {self.amount} coins ({self.transaction_type})>"


class LevelMilestone(Base):
    """Level milestone model for game progression."""
    __tablename__ = 'level_milestones'

    level = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    badge = Column(String, nullable=False)
    color = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    rewards = relationship("LevelReward", back_populates="milestone")

    def to_dict(self) -> Dict[str, Any]:
        """Convert milestone to dictionary."""
        return {
            "level": self.level,
            "title": self.title,
            "badge": self.badge,
            "color": self.color,
            "description": self.description,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<LevelMilestone Lv{self.level}: {self.badge} {self.title}>"


class LevelReward(Base):
    """Level reward model for milestone rewards."""
    __tablename__ = 'level_rewards'

    reward_id = Column(String, primary_key=True)
    level = Column(Integer, ForeignKey('level_milestones.level'), nullable=False)
    reward_type = Column(String, nullable=False)
    reward_amount = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    milestone = relationship("LevelMilestone", back_populates="rewards")

    __table_args__ = (
        Index('idx_level_rewards', 'level', 'reward_type'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert reward to dictionary."""
        return {
            "reward_id": self.reward_id,
            "level": self.level,
            "reward_type": self.reward_type,
            "reward_amount": self.reward_amount,
            "description": self.description,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<LevelReward Lv{self.level}: {self.reward_amount} {self.reward_type}>"
