"""Yatzi 3D game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class YatziHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "wins": 0,
            "win_streak": 0,
            "max_win_streak": 0,
            "high_score": 0,
            "roll_yatzi_count": 0,
            "full_houses": 0,
            "large_straights": 0,
            "upper_bonus_count": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        winner = extra_data.get("winner", "")
        if winner == "player":
            cumulative["wins"] += 1
            cumulative["win_streak"] += 1
            cumulative["max_win_streak"] = max(
                cumulative["max_win_streak"], cumulative["win_streak"]
            )
        else:
            cumulative["win_streak"] = 0

        if score > cumulative["high_score"]:
            cumulative["high_score"] = score

        if extra_data.get("roll_yatzi", False):
            cumulative["roll_yatzi_count"] += 1
        if extra_data.get("full_house", False):
            cumulative["full_houses"] += 1
        if extra_data.get("large_straight", False):
            cumulative["large_straights"] += 1
        if extra_data.get("upper_bonus", False):
            cumulative["upper_bonus_count"] += 1

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
            "wins": cumulative["wins"],
            "win_streak": cumulative["max_win_streak"],
            "roll_yatzi": cumulative["roll_yatzi_count"],
            "full_houses": cumulative["full_houses"],
            "large_straight": cumulative["large_straights"],
            "upper_section_bonus": cumulative["upper_bonus_count"],
        }

        if tracking_type in direct:
            return direct[tracking_type]

        if tracking_type == "high_score":
            return 1 if cumulative["high_score"] >= quest.target_value else None

        return None
