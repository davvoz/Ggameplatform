"""Modern Pong game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class ModernPongHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "wins": 0,
            "powerups_collected": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        if extra_data.get("won", False):
            cumulative["wins"] += 1

        powerups = extra_data.get("powerups_collected", 0)
        if powerups:
            cumulative["powerups_collected"] += int(powerups)

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
            "wins": cumulative["wins"],
            "powerups_collected": cumulative["powerups_collected"],
        }
        return mapping.get(tracking_type)
