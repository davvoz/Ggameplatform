"""Merge Tower Defense game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class MergeTDHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "total_kills": 0,
            "total_merges": 0,
            "max_wave": 0,
            "games_played": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        session_kills = extra_data.get("kills", 0)
        session_merges = extra_data.get("tower_merges", 0)
        session_wave = extra_data.get("wave", 0)

        cumulative["total_kills"] += session_kills
        cumulative["total_merges"] += session_merges

        if session_wave > cumulative["max_wave"]:
            cumulative["max_wave"] = session_wave

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
            "max_wave": cumulative["max_wave"],
            "tower_merges": cumulative["total_merges"],
            "total_kills": cumulative["total_kills"],
            "games_played": cumulative["games_played"],
        }
        return mapping.get(tracking_type)
