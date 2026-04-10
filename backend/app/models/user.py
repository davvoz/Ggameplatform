"""User-related models: User, AdminUser."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text
from sqlalchemy.orm import relationship
import json

from app.models.base import Base


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
    votes_cur8_witness = Column(Integer, default=0)
    delegation_amount = Column(Float, default=0.0)
    last_multiplier_check = Column(String, nullable=True)
    total_xp_earned = Column(Float, default=0.0)
    game_scores = Column(Text, default='{}')
    avatar = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    last_login = Column(String, nullable=True)
    login_streak = Column(Integer, default=0)
    last_login_date = Column(String, nullable=True)
    last_steem_post = Column(String, nullable=True)
    extra_data = Column(Text, default='{}')

    # Relationships
    sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entries = relationship("Leaderboard", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        """Convert user instance to dictionary."""
        game_scores = self._parse_json_field(self.game_scores, "game_scores")
        metadata = self._parse_json_field(self.extra_data, "extra_data")

        created_at = self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else self.created_at
        last_login = self.last_login.isoformat() if hasattr(self.last_login, 'isoformat') else self.last_login
        last_multiplier_check = (
            self.last_multiplier_check.isoformat()
            if hasattr(self.last_multiplier_check, 'isoformat')
            else self.last_multiplier_check
        )

        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "steem_username": self.steem_username,
            "is_anonymous": bool(self.is_anonymous),
            "cur8_multiplier": self.cur8_multiplier,
            "votes_cur8_witness": bool(self.votes_cur8_witness),
            "delegation_amount": self.delegation_amount,
            "last_multiplier_check": last_multiplier_check,
            "total_xp_earned": self.total_xp_earned,
            "game_scores": game_scores,
            "avatar": self.avatar,
            "created_at": created_at,
            "last_login": last_login,
            "login_streak": self.login_streak,
            "last_login_date": self.last_login_date,
            "metadata": metadata
        }

    @staticmethod
    def _parse_json_field(value: str, field_name: str) -> Any:
        """Safely parse a JSON text field."""
        try:
            if value:
                return json.loads(value) if isinstance(value, str) else value
        except (json.JSONDecodeError, TypeError):
            pass
        return {}

    def __repr__(self) -> str:
        return f"<User {self.user_id}: {self.username or 'Anonymous'}>"


class AdminUser(Base):
    """Admin user model for DB Viewer and admin access."""
    __tablename__ = 'admin_users'

    admin_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    last_login = Column(String, nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        """Convert admin user instance to dictionary."""
        return {
            "admin_id": self.admin_id,
            "username": self.username,
            "email": self.email,
            "is_active": bool(self.is_active),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login
        }

    def __repr__(self) -> str:
        return f"<AdminUser {self.username}>"
