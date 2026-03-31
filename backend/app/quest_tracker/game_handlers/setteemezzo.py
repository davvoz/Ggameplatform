"""Sette e Mezzo game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SettemezzoHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "sette_e_mezzo": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        result = extra_data.get("result", "")
        if result == "win":
            cumulative["wins"] += 1
        elif result == "lose":
            cumulative["losses"] += 1

        if extra_data.get("sette_e_mezzo"):
            cumulative["sette_e_mezzo"] += 1

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
            "losses": cumulative["losses"],
            "sette_e_mezzo": cumulative["sette_e_mezzo"],
        }
        return mapping.get(tracking_type)
