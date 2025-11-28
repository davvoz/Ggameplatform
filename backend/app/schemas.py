from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class GameMetadata(BaseModel):
    """Additional metadata for games."""
    minPlayers: Optional[int] = Field(None, ge=1, description="Minimum number of players")
    maxPlayers: Optional[int] = Field(None, ge=1, description="Maximum number of players")
    difficulty: Optional[str] = Field(None, description="Game difficulty level")
    rating: Optional[float] = Field(None, ge=0, le=5, description="Game rating")
    playCount: Optional[int] = Field(0, ge=0, description="Number of times played")
    featured: Optional[bool] = Field(False, description="Is this game featured")
    additionalData: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any additional metadata")

    class Config:
        schema_extra = {
            "example": {
                "minPlayers": 1,
                "maxPlayers": 4,
                "difficulty": "medium",
                "rating": 4.5,
                "playCount": 1250,
                "featured": True
            }
        }

class GameRegister(BaseModel):
    """Schema for registering a new game."""
    gameId: str = Field(..., min_length=1, max_length=100, description="Unique game identifier")
    title: str = Field(..., min_length=1, max_length=200, description="Game title")
    description: Optional[str] = Field("", max_length=1000, description="Game description")
    author: Optional[str] = Field("", max_length=100, description="Game author")
    version: Optional[str] = Field("1.0.0", description="Game version")
    thumbnail: Optional[str] = Field("", description="URL to game thumbnail")
    entryPoint: str = Field(..., description="Relative path to game entry HTML file")
    category: Optional[str] = Field("uncategorized", max_length=50, description="Game category")
    tags: Optional[List[str]] = Field(default_factory=list, description="Game tags")
    metadata: Optional[GameMetadata] = Field(default_factory=GameMetadata, description="Additional game metadata")

    @validator('gameId')
    def validate_game_id(cls, v):
        """Validate game ID format (alphanumeric, dashes, underscores only)."""
        if not all(c.isalnum() or c in '-_' for c in v):
            raise ValueError('gameId must contain only alphanumeric characters, dashes, and underscores')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags list."""
        if v and len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return v

    class Config:
        schema_extra = {
            "example": {
                "gameId": "space-shooter-v1",
                "title": "Space Shooter",
                "description": "An exciting space shooting game",
                "author": "Game Studio",
                "version": "1.0.0",
                "thumbnail": "/static/thumbnails/space-shooter.png",
                "entryPoint": "index.html",
                "category": "action",
                "tags": ["space", "shooter", "arcade"],
                "metadata": {
                    "minPlayers": 1,
                    "maxPlayers": 1,
                    "difficulty": "medium",
                    "rating": 4.5,
                    "featured": True
                }
            }
        }

class GameResponse(BaseModel):
    """Schema for game response."""
    game_id: str
    title: str
    description: str
    author: str
    version: str
    thumbnail: str
    entry_point: str
    category: str
    tags: List[str]
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "game_id": "space-shooter-v1",
                "title": "Space Shooter",
                "description": "An exciting space shooting game",
                "author": "Game Studio",
                "version": "1.0.0",
                "thumbnail": "/static/thumbnails/space-shooter.png",
                "entry_point": "index.html",
                "category": "action",
                "tags": ["space", "shooter", "arcade"],
                "created_at": "2025-01-15T10:30:00",
                "updated_at": "2025-01-15T10:30:00",
                "metadata": {
                    "minPlayers": 1,
                    "maxPlayers": 1,
                    "difficulty": "medium",
                    "rating": 4.5,
                    "playCount": 1250,
                    "featured": True
                }
            }
        }

class GameListResponse(BaseModel):
    """Schema for game list response."""
    total: int
    games: List[GameResponse]

class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool
    message: str
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    """Generic error response."""
    success: bool = False
    error: str
    detail: Optional[str] = None


class QuestBase(BaseModel):
    """Base schema for quest."""
    title: str = Field(..., min_length=1, max_length=200, description="Quest title")
    description: Optional[str] = Field(None, description="Quest description")
    quest_type: str = Field(..., description="Type of quest: play_games, play_time, login, score, level, xp, complete_quests")
    target_value: int = Field(..., ge=0, description="Target value to complete the quest")
    xp_reward: int = Field(..., ge=0, description="XP reward for completing the quest")
    sats_reward: int = Field(0, ge=0, description="Sats reward for completing the quest")
    is_active: bool = Field(True, description="Whether the quest is active")


class QuestCreate(QuestBase):
    """Schema for creating a new quest."""
    pass


class QuestResponse(BaseModel):
    """Schema for quest response."""
    quest_id: int
    title: str
    description: Optional[str]
    quest_type: str
    target_value: int
    xp_reward: int
    sats_reward: int
    is_active: bool
    created_at: str
    
    class Config:
        orm_mode = True


class UserQuestProgress(BaseModel):
    """Schema for user quest progress."""
    id: int
    user_id: str
    quest_id: int
    current_progress: int
    is_completed: bool
    is_claimed: bool
    completed_at: Optional[str]
    claimed_at: Optional[str]
    started_at: str
    
    class Config:
        orm_mode = True


class QuestWithProgress(QuestResponse):
    """Schema for quest with user progress."""
    progress: Optional[UserQuestProgress] = None


# ========== CRUD SCHEMAS ==========

# Game CRUD Schemas
class GameUpdate(BaseModel):
    """Schema for updating a game."""
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    version: Optional[str] = None
    thumbnail: Optional[str] = None
    entry_point: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


# User CRUD Schemas
class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    steem_username: Optional[str] = None
    is_anonymous: bool = False
    cur8_multiplier: float = 1.0
    total_xp_earned: float = 0.0
    avatar: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        """Basic email validation."""
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    username: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None
    steem_username: Optional[str] = None
    cur8_multiplier: Optional[float] = None
    total_xp_earned: Optional[float] = None
    avatar: Optional[str] = None


# GameSession CRUD Schemas
class GameSessionCreate(BaseModel):
    """Schema for creating a game session."""
    user_id: str
    game_id: str
    score: int = 0
    xp_earned: float = 0.0
    duration_seconds: int = 0
    metadata: Optional[Dict[str, Any]] = None


class GameSessionUpdate(BaseModel):
    """Schema for updating a game session."""
    score: Optional[int] = None
    xp_earned: Optional[float] = None
    duration_seconds: Optional[int] = None
    ended_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Leaderboard CRUD Schemas
class LeaderboardCreate(BaseModel):
    """Schema for creating a leaderboard entry."""
    user_id: str
    game_id: str
    score: int
    rank: Optional[int] = None


class LeaderboardUpdate(BaseModel):
    """Schema for updating a leaderboard entry."""
    score: Optional[int] = None
    rank: Optional[int] = None


# XPRule CRUD Schemas
class XPRuleCreate(BaseModel):
    """Schema for creating an XP rule."""
    game_id: str
    rule_name: str
    rule_type: str
    parameters: Optional[Dict[str, Any]] = None
    priority: int = 0
    is_active: bool = True


class XPRuleUpdate(BaseModel):
    """Schema for updating an XP rule."""
    rule_name: Optional[str] = None
    rule_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


# Quest CRUD Schemas
class QuestUpdate(BaseModel):
    """Schema for updating a quest."""
    title: Optional[str] = None
    description: Optional[str] = None
    quest_type: Optional[str] = None
    target_value: Optional[int] = None
    xp_reward: Optional[int] = None
    sats_reward: Optional[int] = None
    is_active: Optional[bool] = None


# UserQuest CRUD Schemas
class UserQuestCreate(BaseModel):
    """Schema for creating user quest progress."""
    user_id: str
    quest_id: int
    current_progress: int = 0


class UserQuestUpdate(BaseModel):
    """Schema for updating user quest progress."""
    current_progress: Optional[int] = None
    is_completed: Optional[bool] = None
    is_claimed: Optional[bool] = None
    completed_at: Optional[str] = None
    claimed_at: Optional[str] = None
