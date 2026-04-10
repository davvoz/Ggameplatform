"""Session context for XP calculation."""

from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class SessionContext:
    """Context object containing all session data needed for XP calculation."""

    score: int
    duration_seconds: int
    is_new_high_score: bool
    user_multiplier: float
    previous_high_score: int = 0
    levels_completed: int = 0
    distance: float = 0.0
    extra_data: Dict[str, Any] = None

    def __post_init__(self):
        """Validate session context data."""
        if self.score < 0:
            raise ValueError("Score cannot be negative")
        if self.duration_seconds < 0:
            raise ValueError("Duration cannot be negative")
        if self.user_multiplier < 0:
            raise ValueError("User multiplier cannot be negative")
        if self.levels_completed < 0:
            raise ValueError("Levels completed cannot be negative")
        if self.distance < 0:
            raise ValueError("Distance cannot be negative")
        if self.extra_data is None:
            self.extra_data = {}
