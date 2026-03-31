"""Rainbow Rush game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class RainbowRushHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "levels_completed": 0,
            "coins_collected": 0,
            "high_score": 0,
            "games_played": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        session_levels = extra_data.get("levels_completed", 0) or extra_data.get("level", 0)
        session_coins = extra_data.get("coins_collected", 0) or extra_data.get("collectibles", 0)

        cumulative["levels_completed"] += session_levels
        cumulative["coins_collected"] += session_coins

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
        direct = {
            "levels_completed": cumulative["levels_completed"],
            "coins_collected": cumulative["coins_collected"],
            "games_played": cumulative["games_played"],
        }

        if tracking_type in direct:
            return direct[tracking_type]

        if tracking_type == "high_score":
            threshold = quest_config.get("score_threshold", quest.target_value)
            return 1 if cumulative["high_score"] >= threshold else None

        return None
