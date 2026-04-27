"""Game-related models: Game, GameStatus, GameSession, GameProgress."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
import json

from app.models.base import Base

_CASCADE_ALL_DELETE_ORPHAN = "all, delete-orphan"


class GameStatus(Base):
    """Game status model for configurable game states."""
    __tablename__ = 'game_statuses'

    status_id = Column(Integer, primary_key=True, autoincrement=True)
    status_name = Column(String(50), unique=True, nullable=False)
    status_code = Column(String(30), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    # Relationships
    games = relationship("Game", back_populates="status")

    def to_dict(self) -> Dict[str, Any]:
        """Convert game status instance to dictionary."""
        return {
            "status_id": self.status_id,
            "status_name": self.status_name,
            "status_code": self.status_code,
            "description": self.description,
            "display_order": self.display_order,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<GameStatus {self.status_code}: {self.status_name}>"


class Game(Base):
    """Game model using SQLAlchemy ORM."""
    __tablename__ = 'games'

    game_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default='')
    author = Column(String, default='')
    version = Column(String, default='1.0.0')
    thumbnail = Column(String, default='')
    entry_point = Column(String, nullable=False)
    category = Column(String, default='uncategorized')
    tags = Column(Text, default='[]')
    status_id = Column(Integer, ForeignKey('game_statuses.status_id'), nullable=True)
    steem_rewards_enabled = Column(Integer, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    extra_data = Column(Text, default='{}')

    # Relationships
    status = relationship("GameStatus", back_populates="games")
    sessions = relationship("GameSession", back_populates="game", cascade=_CASCADE_ALL_DELETE_ORPHAN)
    leaderboard_entries = relationship("Leaderboard", back_populates="game", cascade=_CASCADE_ALL_DELETE_ORPHAN)
    xp_rules = relationship("XPRule", back_populates="game", cascade=_CASCADE_ALL_DELETE_ORPHAN)

    def to_dict(self) -> Dict[str, Any]:
        """Convert game instance to dictionary."""
        status_dict = None
        try:
            if self.status:
                status_dict = self.status.to_dict()
        except Exception:
            pass

        return {
            "game_id": self.game_id,
            "title": self.title,
            "description": self.description,
            "author": self.author,
            "version": self.version,
            "thumbnail": self.thumbnail,
            "entry_point": self.entry_point,
            "category": self.category,
            "tags": json.loads(self.tags) if self.tags else [],
            "status_id": self.status_id,
            "status": status_dict,
            "steem_rewards_enabled": bool(self.steem_rewards_enabled),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }

    def __repr__(self) -> str:
        return f"<Game {self.game_id}: {self.title}>"


class GameSession(Base):
    """Game session model using SQLAlchemy ORM."""
    __tablename__ = 'game_sessions'

    session_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    score = Column(Integer, default=0)
    xp_earned = Column(Float, default=0.0)
    duration_seconds = Column(Integer, default=0)
    started_at = Column(String, nullable=False)
    ended_at = Column(String, nullable=True)
    extra_data = Column(Text, default='{}')

    # Relationships
    user = relationship("User", back_populates="sessions")
    game = relationship("Game", back_populates="sessions")

    def to_dict(self) -> Dict[str, Any]:
        """Convert session instance to dictionary."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "score": self.score,
            "xp_earned": self.xp_earned,
            "duration_seconds": self.duration_seconds,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }

    def __repr__(self) -> str:
        return f"<GameSession {self.session_id}: User {self.user_id} - Game {self.game_id}>"


class GameProgress(Base):
    """Per-user per-game progress data (world unlocks, save state, etc.)."""
    __tablename__ = 'game_progress'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    progress_data = Column(Text, default='{}')
    updated_at = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', name='uq_user_game_progress'),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "progress_data": json.loads(self.progress_data) if self.progress_data else {},
            "updated_at": self.updated_at
        }

    def __repr__(self) -> str:
        return f"<GameProgress user={self.user_id} game={self.game_id}>"
