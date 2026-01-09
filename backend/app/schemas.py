from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# ========== GAME STATUS SCHEMAS ==========

class GameStatusBase(BaseModel):
    """Base schema for game status."""
    status_name: str = Field(..., min_length=1, max_length=50, description="Status name (e.g., 'Sviluppato', 'In Sviluppo')")
    status_code: str = Field(..., min_length=1, max_length=30, description="Status code (e.g., 'developed', 'in_development')")
    description: Optional[str] = Field(None, description="Status description")
    display_order: int = Field(0, description="Display order for sorting")
    is_active: bool = Field(True, description="Whether this status is active")


class GameStatusCreate(GameStatusBase):
    """Schema for creating a new game status."""
    pass


class GameStatusResponse(BaseModel):
    """Schema for game status response."""
    status_id: int
    status_name: str
    status_code: str
    description: Optional[str]
    display_order: int
    is_active: bool
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "status_id": 1,
                "status_name": "Sviluppato",
                "status_code": "developed",
                "description": "Gioco completamente sviluppato e pronto per la produzione",
                "display_order": 1,
                "is_active": True,
                "created_at": "2025-11-29T10:00:00",
                "updated_at": "2025-11-29T10:00:00"
            }
        }


class GameStatusUpdate(BaseModel):
    """Schema for updating a game status."""
    status_name: Optional[str] = None
    status_code: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


# ========== GAME SCHEMAS ==========

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
    statusId: Optional[int] = Field(None, description="Game status ID (FK to game_statuses)")
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
    status_id: Optional[int]
    status: Optional[GameStatusResponse]
    steem_rewards_enabled: bool = False
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
    reward_coins: int = Field(0, ge=0, description="Coin reward for completing the quest")
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
    reward_coins: int
    is_active: bool
    created_at: str
    config: Optional[dict] = None
    
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
    status_id: Optional[int] = None
    steem_rewards_enabled: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None


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
    is_anonymous: Optional[bool] = None
    cur8_multiplier: Optional[float] = None
    votes_cur8_witness: Optional[bool] = None
    delegation_amount: Optional[float] = None
    total_xp_earned: Optional[float] = None
    game_scores: Optional[Dict[str, Any]] = None
    avatar: Optional[str] = None
    last_login: Optional[str] = None
    login_streak: Optional[int] = None
    last_login_date: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


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
    reward_coins: Optional[int] = None
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


# ========== COIN SYSTEM SCHEMAS ==========

class UserCoinsBase(BaseModel):
    """Base schema for user coins."""
    user_id: str = Field(..., description="User ID reference")
    balance: int = Field(0, ge=0, description="Current coin balance")
    total_earned: int = Field(0, ge=0, description="Total coins earned")
    total_spent: int = Field(0, ge=0, description="Total coins spent")


class UserCoinsCreate(UserCoinsBase):
    """Schema for creating user coins record."""
    pass


class UserCoinsUpdate(BaseModel):
    """Schema for updating user coins."""
    balance: Optional[int] = Field(None, ge=0)
    total_earned: Optional[int] = Field(None, ge=0)
    total_spent: Optional[int] = Field(None, ge=0)


class UserCoinsResponse(BaseModel):
    """Schema for user coins response."""
    user_id: str
    balance: int
    total_earned: int
    total_spent: int
    last_updated: str
    created_at: str
    
    class Config:
        orm_mode = True


class CoinTransactionBase(BaseModel):
    """Base schema for coin transaction."""
    user_id: str = Field(..., description="User ID reference")
    amount: int = Field(..., description="Amount (positive for earn, negative for spend)")
    transaction_type: str = Field(..., description="Type of transaction")
    source_id: Optional[str] = Field(None, description="Source ID (quest_id, rank, etc.)")
    description: Optional[str] = Field(None, description="Transaction description")
    balance_after: int = Field(..., ge=0, description="Balance after transaction")


class CoinTransactionCreate(CoinTransactionBase):
    """Schema for creating coin transaction."""
    pass


class CoinTransactionUpdate(BaseModel):
    """Schema for updating coin transaction (minimal, transactions are immutable)."""
    description: Optional[str] = None


class CoinTransactionResponse(BaseModel):
    """Schema for coin transaction response."""
    transaction_id: str
    user_id: str
    amount: int
    transaction_type: str
    source_id: Optional[str]
    description: Optional[str]
    balance_after: int
    created_at: str
    extra_data: Optional[str]
    
    class Config:
        orm_mode = True


# ========== LEVEL MILESTONES SCHEMAS ==========

class LevelMilestoneBase(BaseModel):
    """Base schema for level milestone."""
    title: str = Field(..., description="Milestone title")
    badge: str = Field(..., description="Badge emoji")
    color: str = Field(..., description="Color hex code")
    description: Optional[str] = Field(None, description="Milestone description")
    is_active: bool = Field(True, description="Whether milestone is active")


class LevelMilestoneCreate(LevelMilestoneBase):
    """Schema for creating level milestone."""
    level: int = Field(..., ge=1, description="Level number")


class LevelMilestoneUpdate(BaseModel):
    """Schema for updating level milestone."""
    title: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LevelMilestoneResponse(BaseModel):
    """Schema for level milestone response."""
    level: int
    title: str
    badge: str
    color: str
    description: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True


# ========== LEVEL REWARDS SCHEMAS ==========

class LevelRewardBase(BaseModel):
    """Base schema for level reward."""
    level: int = Field(..., ge=1, description="Level number")
    reward_type: str = Field(..., description="Type of reward (coins, item, badge, multiplier)")
    reward_amount: int = Field(..., ge=0, description="Reward amount")
    description: Optional[str] = Field(None, description="Reward description")
    is_active: bool = Field(True, description="Whether reward is active")


class LevelRewardCreate(LevelRewardBase):
    """Schema for creating level reward."""
    pass


class LevelRewardUpdate(BaseModel):
    """Schema for updating level reward."""
    level: Optional[int] = Field(None, ge=1)
    reward_type: Optional[str] = None
    reward_amount: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LevelRewardResponse(BaseModel):
    """Schema for level reward response."""
    reward_id: str
    level: int
    reward_type: str
    reward_amount: int
    description: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True


# ========== WEEKLY LEADERBOARD SCHEMAS ==========

class WeeklyLeaderboardBase(BaseModel):
    """Base schema for weekly leaderboard."""
    week_start: str = Field(..., description="Week start date")
    week_end: str = Field(..., description="Week end date")
    user_id: str = Field(..., description="User ID")
    game_id: str = Field(..., description="Game ID")
    score: int = Field(..., ge=0, description="Score")
    rank: Optional[int] = Field(None, ge=1, description="Rank in leaderboard")


class WeeklyLeaderboardCreate(WeeklyLeaderboardBase):
    """Schema for creating weekly leaderboard entry."""
    pass


class WeeklyLeaderboardUpdate(BaseModel):
    """Schema for updating weekly leaderboard."""
    score: Optional[int] = Field(None, ge=0)
    rank: Optional[int] = Field(None, ge=1)


class WeeklyLeaderboardResponse(BaseModel):
    """Schema for weekly leaderboard response."""
    entry_id: str
    week_start: str
    week_end: str
    user_id: str
    game_id: str
    score: int
    rank: Optional[int]
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True


# ========== LEADERBOARD REWARDS SCHEMAS ==========

class LeaderboardRewardBase(BaseModel):
    """Base schema for leaderboard reward."""
    game_id: Optional[str] = Field(None, description="Game ID (null for global)")
    rank_start: int = Field(..., ge=1, description="Start rank")
    rank_end: int = Field(..., ge=1, description="End rank")
    steem_reward: Optional[float] = Field(None, ge=0, description="STEEM reward amount")
    coin_reward: Optional[int] = Field(None, ge=0, description="Coin reward amount")
    description: Optional[str] = Field(None, description="Reward description")
    is_active: bool = Field(True, description="Whether reward is active")


class LeaderboardRewardCreate(LeaderboardRewardBase):
    """Schema for creating leaderboard reward."""
    pass


class LeaderboardRewardUpdate(BaseModel):
    """Schema for updating leaderboard reward."""
    game_id: Optional[str] = None
    rank_start: Optional[int] = Field(None, ge=1)
    rank_end: Optional[int] = Field(None, ge=1)
    steem_reward: Optional[float] = Field(None, ge=0)
    coin_reward: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LeaderboardRewardResponse(BaseModel):
    """Schema for leaderboard reward response."""
    reward_id: str
    game_id: Optional[str]
    rank_start: int
    rank_end: int
    steem_reward: Optional[float]
    coin_reward: Optional[int]
    description: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str
    
    class Config:
        orm_mode = True


# ========== WEEKLY WINNERS SCHEMAS ==========

class WeeklyWinnerBase(BaseModel):
    """Base schema for weekly winner."""
    week_start: str = Field(..., description="Week start date")
    week_end: str = Field(..., description="Week end date")
    game_id: str = Field(..., description="Game ID")
    user_id: str = Field(..., description="User ID")
    rank: int = Field(..., ge=1, description="Winner rank")
    score: int = Field(..., ge=0, description="Winner score")
    steem_reward: Optional[float] = Field(None, ge=0, description="STEEM reward")
    coin_reward: Optional[int] = Field(None, ge=0, description="Coin reward")
    steem_tx_id: Optional[str] = Field(None, description="STEEM transaction ID")
    reward_sent: bool = Field(False, description="Whether reward was sent")
    reward_sent_at: Optional[str] = Field(None, description="Reward sent timestamp")


class WeeklyWinnerCreate(WeeklyWinnerBase):
    """Schema for creating weekly winner."""
    pass


class WeeklyWinnerUpdate(BaseModel):
    """Schema for updating weekly winner."""
    steem_reward: Optional[float] = Field(None, ge=0)
    coin_reward: Optional[int] = Field(None, ge=0)
    steem_tx_id: Optional[str] = None
    reward_sent: Optional[bool] = None
    reward_sent_at: Optional[str] = None


class WeeklyWinnerResponse(BaseModel):
    """Schema for weekly winner response."""
    winner_id: str
    week_start: str
    week_end: str
    game_id: str
    user_id: str
    rank: int
    score: int
    steem_reward: Optional[float]
    coin_reward: Optional[int]
    steem_tx_id: Optional[str]
    reward_sent: bool
    reward_sent_at: Optional[str]
    created_at: str
    
    class Config:
        orm_mode = True

