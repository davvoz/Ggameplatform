"""Space Shooter 2 game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SpaceShooter2Handler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "total_kills": 0,
            "max_level": 0,
            "high_score": 0,
            "max_combo": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        session_kills = extra_data.get("enemiesKilled", 0)
        session_level = extra_data.get("levelsCompleted", extra_data.get("level", 0))
        session_combo = extra_data.get("maxCombo", 0)

        cumulative["total_kills"] += session_kills

        if session_level > cumulative["max_level"]:
            cumulative["max_level"] = session_level
        if score > cumulative["high_score"]:
            cumulative["high_score"] = score
        if session_combo > cumulative["max_combo"]:
            cumulative["max_combo"] = session_combo

    def _map_tracking_type(
        self,
        tracking_type: str,
        cumulative: dict,
        extra_data: Dict,
        quest_config: Dict,
        user_quest: UserQuest,
        quest: Quest,
    ) -> Optional[int]:
        mapping = {
            "games_played": cumulative["games_played"],
            "total_kills": cumulative["total_kills"],
            "reach_level": cumulative["max_level"],
            "high_score": cumulative["high_score"],
            "max_combo": cumulative["max_combo"],
        }
        return mapping.get(tracking_type)
