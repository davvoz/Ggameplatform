from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import json

Base = declarative_base()

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
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    extra_data = Column(Text, default='{}')  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    
    # Relationships
    sessions = relationship("GameSession", back_populates="game", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="game", cascade="all, delete-orphan")
    leaderboard_entries = relationship("Leaderboard", back_populates="game", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert game instance to dictionary."""
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
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
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


class UserAchievement(Base):
    """User achievement model using SQLAlchemy ORM."""
    __tablename__ = 'user_achievements'
    
    achievement_id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    achievement_type = Column(String, nullable=False)
    achievement_value = Column(String, nullable=True)
    earned_at = Column(String, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    game = relationship("Game", back_populates="achievements")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert achievement instance to dictionary."""
        return {
            "achievement_id": self.achievement_id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "achievement_type": self.achievement_type,
            "achievement_value": self.achievement_value,
            "earned_at": self.earned_at
        }
    
    def __repr__(self) -> str:
        return f"<Achievement {self.achievement_id}: {self.achievement_type}>"


class Leaderboard(Base):
    """Leaderboard model using SQLAlchemy ORM."""
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
