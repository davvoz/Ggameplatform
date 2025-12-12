"""
Rainbow Rush Database Models
Isolated models for Rainbow Rush game data
Following SOLID principles and OOP best practices
"""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Float, Text, Index
from app.models import Base
import json


class RainbowRushProgress(Base):
    """
    Player progress model for Rainbow Rush game
    Single Responsibility: Manages player progression data only
    """
    __tablename__ = 'rainbow_rush_progress'
    
    # Primary key
    progress_id = Column(String, primary_key=True)  # Format: rr_prog_{user_id}
    
    # User ID from main platform (no FK because separate DB)
    user_id = Column(String, nullable=False, unique=True, index=True)
    
    # Game progress
    current_level = Column(Integer, default=1, nullable=False)
    max_level_unlocked = Column(Integer, default=1, nullable=False)
    total_coins = Column(Integer, default=0, nullable=False)
    total_stars = Column(Integer, default=0, nullable=False)
    high_score = Column(Integer, default=0, nullable=False)
    
    # Level completion data (JSON)
    # Format: {"1": {"stars": 3, "coins": 50, "best_time": 45.2, "completed": true}, "2": {...}}
    level_completions = Column(Text, default='{}', nullable=False)
    
    # Unlockables (JSON)
    # Format: {"skins": ["default"], "powerups": ["shield"], "abilities": ["double_jump"]}
    unlocked_items = Column(Text, default='{"skins": ["default"], "abilities": ["jump"]}', nullable=False)
    
    # Statistics (JSON)
    # Format: {"total_jumps": 1234, "total_deaths": 56, "total_enemies_killed": 789, "play_time_seconds": 3600}
    statistics = Column(Text, default='{}', nullable=False)
    
    # Timestamps
    created_at = Column(String, nullable=False)
    last_played = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    
    # Additional metadata (JSON) - renamed to avoid SQLAlchemy conflict
    extra_data = Column(Text, default='{}', nullable=False)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert progress instance to dictionary"""
        return {
            "progress_id": self.progress_id,
            "user_id": self.user_id,
            "current_level": self.current_level,
            "max_level_unlocked": self.max_level_unlocked,
            "total_coins": self.total_coins,
            "total_stars": self.total_stars,
            "high_score": self.high_score,
            "level_completions": json.loads(self.level_completions) if self.level_completions else {},
            "unlocked_items": json.loads(self.unlocked_items) if self.unlocked_items else {},
            "statistics": json.loads(self.statistics) if self.statistics else {},
            "created_at": self.created_at,
            "last_played": self.last_played,
            "updated_at": self.updated_at,
            "metadata": json.loads(self.extra_data) if self.extra_data else {}
        }
    
    def __repr__(self) -> str:
        return f"<RainbowRushProgress user={self.user_id} level={self.current_level}>"


class RainbowRushLevelCompletion(Base):
    """
    Individual level completion records for Rainbow Rush
    Single Responsibility: Tracks detailed level completion data
    Separate table for better querying and anti-cheat validation
    """
    __tablename__ = 'rainbow_rush_level_completions'
    
    # Primary key
    completion_id = Column(String, primary_key=True)  # Format: rr_comp_{uuid}
    
    # References (no FK because cross-DB for user_id)
    user_id = Column(String, nullable=False, index=True)
    progress_id = Column(String, nullable=False, index=True)
    
    # Level data
    level_id = Column(Integer, nullable=False)
    level_name = Column(String, nullable=False)
    
    # Completion metrics
    stars_earned = Column(Integer, default=0, nullable=False)  # 0-3 stars
    completion_time = Column(Float, default=0.0, nullable=False)  # Seconds
    score = Column(Integer, default=0, nullable=False)
    
    # Objectives completed (JSON array)
    # Format: ["collect_all_coins", "no_damage", "time_bonus"]
    objectives_completed = Column(Text, default='[]', nullable=False)
    
    # Level-specific stats (JSON)
    # Format: {"coins_collected": 50, "enemies_killed": 10, "damage_taken": 2, "max_combo": 15}
    level_stats = Column(Text, default='{}', nullable=False)
    
    # Anti-cheat validation
    is_validated = Column(Integer, default=0, nullable=False)  # Boolean as int
    validation_score = Column(Float, default=0.0, nullable=False)  # 0.0-1.0 trust score
    
    # Timestamps
    completed_at = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    
    # Session tracking for anti-cheat
    session_duration = Column(Float, default=0.0, nullable=False)  # Seconds
    client_timestamp = Column(String, nullable=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert completion instance to dictionary"""
        return {
            "completion_id": self.completion_id,
            "user_id": self.user_id,
            "progress_id": self.progress_id,
            "level_id": self.level_id,
            "level_name": self.level_name,
            "stars_earned": self.stars_earned,
            "completion_time": self.completion_time,
            "score": self.score,
            "objectives_completed": json.loads(self.objectives_completed) if self.objectives_completed else [],
            "level_stats": json.loads(self.level_stats) if self.level_stats else {},
            "is_validated": bool(self.is_validated),
            "validation_score": self.validation_score,
            "completed_at": self.completed_at,
            "created_at": self.created_at,
            "session_duration": self.session_duration,
            "client_timestamp": self.client_timestamp
        }
    
    def __repr__(self) -> str:
        return f"<RainbowRushLevelCompletion user={self.user_id} level={self.level_id} stars={self.stars_earned}>"


class RainbowRushGameSession(Base):
    """
    Active game session tracking for Rainbow Rush
    Single Responsibility: Manages active play sessions and real-time validation
    """
    __tablename__ = 'rainbow_rush_sessions'
    
    # Primary key
    session_id = Column(String, primary_key=True)  # Format: rr_sess_{uuid}
    
    # References (no FK because cross-DB for user_id)
    user_id = Column(String, nullable=False, index=True)
    progress_id = Column(String, nullable=False, index=True)
    
    # Session data
    level_id = Column(Integer, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)  # Boolean as int
    
    # Real-time tracking (JSON)
    # Format: [{"type": "checkpoint", "time": 12.5, "position": {"x": 100, "y": 200}}, ...]
    session_events = Column(Text, default='[]', nullable=False)
    
    # Current session stats (JSON)
    # Format: {"coins": 10, "enemies_killed": 5, "current_health": 3}
    current_stats = Column(Text, default='{}', nullable=False)
    
    # Timestamps
    started_at = Column(String, nullable=False)
    last_update = Column(String, nullable=False)
    ended_at = Column(String, nullable=True)
    
    # Anti-cheat metrics
    heartbeat_count = Column(Integer, default=0, nullable=False)
    anomaly_flags = Column(Integer, default=0, nullable=False)  # Bit flags
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert session instance to dictionary"""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "progress_id": self.progress_id,
            "level_id": self.level_id,
            "is_active": bool(self.is_active),
            "session_events": json.loads(self.session_events) if self.session_events else [],
            "current_stats": json.loads(self.current_stats) if self.current_stats else {},
            "started_at": self.started_at,
            "last_update": self.last_update,
            "ended_at": self.ended_at,
            "heartbeat_count": self.heartbeat_count,
            "anomaly_flags": self.anomaly_flags
        }
    
    def __repr__(self) -> str:
        return f"<RainbowRushGameSession session={self.session_id} active={bool(self.is_active)}>"


# Create indices for performance
Index('idx_rr_progress_user', RainbowRushProgress.user_id, unique=True)
Index('idx_rr_progress_level', RainbowRushProgress.max_level_unlocked)
Index('idx_rr_completion_user_level', RainbowRushLevelCompletion.user_id, RainbowRushLevelCompletion.level_id)
Index('idx_rr_completion_validated', RainbowRushLevelCompletion.is_validated)
Index('idx_rr_session_user_active', RainbowRushGameSession.user_id, RainbowRushGameSession.is_active)
Index('idx_rr_session_active', RainbowRushGameSession.is_active)
