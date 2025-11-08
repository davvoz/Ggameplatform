from typing import List, Optional, Dict, Any
from datetime import datetime

class Game:
    """Game model representing a game in the platform."""
    
    def __init__(
        self,
        game_id: str,
        title: str,
        entry_point: str,
        description: str = "",
        author: str = "",
        version: str = "1.0.0",
        thumbnail: str = "",
        category: str = "uncategorized",
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.game_id = game_id
        self.title = title
        self.entry_point = entry_point
        self.description = description
        self.author = author
        self.version = version
        self.thumbnail = thumbnail
        self.category = category
        self.tags = tags or []
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.utcnow().isoformat()
        self.updated_at = updated_at or datetime.utcnow().isoformat()

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
            "tags": self.tags,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Game':
        """Create game instance from dictionary."""
        return cls(
            game_id=data.get("game_id"),
            title=data.get("title"),
            entry_point=data.get("entry_point"),
            description=data.get("description", ""),
            author=data.get("author", ""),
            version=data.get("version", "1.0.0"),
            thumbnail=data.get("thumbnail", ""),
            category=data.get("category", "uncategorized"),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def __repr__(self) -> str:
        return f"<Game {self.game_id}: {self.title}>"

    def __str__(self) -> str:
        return f"{self.title} (v{self.version}) by {self.author}"
