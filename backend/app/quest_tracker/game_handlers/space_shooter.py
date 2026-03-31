"""Space Shooter (original) game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SpaceShooterHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "max_level": 0,
            "max_wave": 0,
            "high_score": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        session_level = extra_data.get("level", 0)
        session_wave = extra_data.get("wave", 0)

        if session_level > cumulative["max_level"]:
            cumulative["max_level"] = session_level
        if session_wave > cumulative["max_wave"]:
            cumulative["max_wave"] = session_wave
        if score > cumulative["high_score"]:
            cumulative["high_score"] = score

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
            "reach_level": cumulative["max_level"],
            "reach_wave": cumulative["max_wave"],
            "high_score": cumulative["high_score"],
        }
        return mapping.get(tracking_type)
