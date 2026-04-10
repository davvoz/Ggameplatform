"""Quest models: Quest, UserQuest."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
import json

from app.models.base import Base


class Quest(Base):
    """Quest model for platform challenges."""
    __tablename__ = 'quests'

    quest_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quest_type = Column(String, nullable=False)
    target_value = Column(Integer, nullable=False)
    xp_reward = Column(Integer, nullable=False)
    reward_coins = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    config = Column(Text, default='{}')

    # Relationships
    user_progress = relationship("UserQuest", back_populates="quest", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        """Convert quest instance to dictionary."""
        try:
            config = json.loads(self.config) if self.config else {}
        except (json.JSONDecodeError, TypeError):
            config = {}

        return {
            "quest_id": self.quest_id,
            "title": self.title,
            "description": self.description,
            "quest_type": self.quest_type,
            "target_value": self.target_value,
            "xp_reward": self.xp_reward,
            "reward_coins": self.reward_coins,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "config": config
        }

    def __repr__(self) -> str:
        return f"<Quest {self.quest_id}: {self.title}>"


class UserQuest(Base):
    """User quest progress tracking."""
    __tablename__ = 'user_quests'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    quest_id = Column(Integer, ForeignKey('quests.quest_id'), nullable=False)
    current_progress = Column(Integer, default=0)
    is_completed = Column(Integer, default=0)
    is_claimed = Column(Integer, default=0)
    completed_at = Column(String, nullable=True)
    claimed_at = Column(String, nullable=True)
    started_at = Column(String, nullable=False)
    extra_data = Column(Text, default='{}')

    # Relationships
    user = relationship("User")
    quest = relationship("Quest", back_populates="user_progress")

    def to_dict(self) -> Dict[str, Any]:
        """Convert user quest progress to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "quest_id": self.quest_id,
            "current_progress": self.current_progress,
            "is_completed": bool(self.is_completed),
            "is_claimed": bool(self.is_claimed),
            "completed_at": self.completed_at,
            "claimed_at": self.claimed_at,
            "started_at": self.started_at,
            "extra_data": json.loads(self.extra_data) if self.extra_data else {}
        }

    def __repr__(self) -> str:
        return f"<UserQuest User:{self.user_id} Quest:{self.quest_id} Progress:{self.current_progress}>"
