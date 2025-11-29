from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import json

Base = declarative_base()

class GameStatus(Base):
    """Game status model for configurable game states."""
    __tablename__ = 'game_statuses'
    
    status_id = Column(Integer, primary_key=True, autoincrement=True)
    status_name = Column(String(50), unique=True, nullable=False)
    status_code = Column(String(30), unique=True, nullable=False)  # developed, in_development, deprecated, experimental
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
    tags = Column(Text, default='[]')  # JSON string
    status_id = Column(Integer, ForeignKey('game_statuses.status_id'), nullable=True)  # New status column
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    extra_data = Column(Text, default='{}')  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    
    # Relationships
    status = relationship("GameStatus", back_populates="games")
    sessions = relationship("GameSession", back_populates="game", cascade="all, delete-orphan")
    leaderboard_entries = relationship("Leaderboard", back_populates="game", cascade="all, delete-orphan")
    xp_rules = relationship("XPRule", back_populates="game", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert game instance to dictionary."""
        # Safely get status object if loaded
        status_dict = None
        try:
            if self.status:
                status_dict = self.status.to_dict()
        except:
            # Status not loaded or error accessing it
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
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }
    
    def __repr__(self) -> str:
        return f"<Game {self.game_id}: {self.title}>"


class User(Base):
    """User model using SQLAlchemy ORM."""
    __tablename__ = 'users'
    
    user_id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)
    steem_username = Column(String, unique=True, nullable=True)
    is_anonymous = Column(Integer, default=0)
    cur8_multiplier = Column(Float, default=1.0)
    total_xp_earned = Column(Float, default=0.0)
    game_scores = Column(Text, default='{}')  # JSON string
    avatar = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    last_login = Column(String, nullable=True)
    extra_data = Column(Text, default='{}')  # Renamed from 'metadata'
    
    # Relationships
    sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entries = relationship("Leaderboard", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user instance to dictionary."""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "steem_username": self.steem_username,
            "is_anonymous": bool(self.is_anonymous),
            "cur8_multiplier": self.cur8_multiplier,
            "total_xp_earned": self.total_xp_earned,
            "game_scores": json.loads(self.game_scores) if self.game_scores else {},
            "avatar": self.avatar,
            "created_at": self.created_at,
            "last_login": self.last_login,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }
    
    def __repr__(self) -> str:
        return f"<User {self.user_id}: {self.username or 'Anonymous'}>"


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
    extra_data = Column(Text, default='{}')  # Renamed from 'metadata'
    
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


class Leaderboard(Base):
    """Leaderboard model using SQLAlchemy ORM.
    
    REGOLA FONDAMENTALE:
    - UN solo record per utente per gioco
    - Il record contiene il punteggio MIGLIORE (massimo)
    - Constraint UNIQUE(user_id, game_id) garantisce questa regola
    """
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
    
    # Constraints e Indici
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


class XPRule(Base):
    """XP Rule model for configurable XP calculation per game."""
    __tablename__ = 'xp_rules'
    
    rule_id = Column(String, primary_key=True)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    rule_name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)  # score_multiplier, time_bonus, threshold, etc.
    parameters = Column(Text, default='{}')  # JSON string for rule parameters
    priority = Column(Integer, default=0)  # Higher priority rules are applied first
    is_active = Column(Integer, default=1)  # 0=inactive, 1=active
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


class Quest(Base):
    """Quest model for platform challenges."""
    __tablename__ = 'quests'
    
    quest_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quest_type = Column(String, nullable=False)  # play_games, play_time, login, score, level, xp, complete_quests
    target_value = Column(Integer, nullable=False)  # Target to reach
    xp_reward = Column(Integer, nullable=False)
    sats_reward = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    
    # Relationships
    user_progress = relationship("UserQuest", back_populates="quest", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert quest instance to dictionary."""
        return {
            "quest_id": self.quest_id,
            "title": self.title,
            "description": self.description,
            "quest_type": self.quest_type,
            "target_value": self.target_value,
            "xp_reward": self.xp_reward,
            "sats_reward": self.sats_reward,
            "is_active": bool(self.is_active),
            "created_at": self.created_at
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
            "started_at": self.started_at
        }
    
    def __repr__(self) -> str:
        return f"<UserQuest User:{self.user_id} Quest:{self.quest_id} Progress:{self.current_progress}>"
