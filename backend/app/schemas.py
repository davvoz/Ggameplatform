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
