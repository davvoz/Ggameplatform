"""Sky Tower game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SkyTowerHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "high_score": 0,
            "total_perfect_stacks": 0,
            "max_combo": 0,
            "total_blocks": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        cumulative["total_perfect_stacks"] += extra_data.get("perfect_stacks", 0)
        cumulative["total_blocks"] += extra_data.get("total_blocks", 0)

        session_combo = extra_data.get("max_combo", 0)
        if session_combo > cumulative["max_combo"]:
            cumulative["max_combo"] = session_combo

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
            "games_played": cumulative["games_played"],
            "total_perfect_stacks": cumulative["total_perfect_stacks"],
        }

        if tracking_type in direct:
            return direct[tracking_type]

        # "best in single game" tracking types
        if tracking_type == "score_in_game":
            session_score = extra_data.get("score", 0) or quest_config.get("score", 0)
            # Use the raw score from the process() call via kwargs or cumulative
            return max(user_quest.current_progress, cumulative["high_score"])

        if tracking_type == "perfect_stacks_in_game":
            session_perfect = extra_data.get("perfect_stacks", 0)
            return max(user_quest.current_progress, session_perfect)

        if tracking_type == "max_combo_in_game":
            session_combo = extra_data.get("max_combo", 0)
            return max(user_quest.current_progress, session_combo)

        if tracking_type == "high_score":
            return 1 if cumulative["high_score"] >= quest.target_value else None

        if tracking_type == "max_combo":
            return 1 if cumulative["max_combo"] >= quest.target_value else None

        return None
