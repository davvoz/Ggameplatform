"""Survivor Arena game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SurvivorArenaHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "total_kills": 0,
            "total_time_survived": 0,
            "high_score": 0,
            "max_level": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1
        duration_seconds = kwargs.get("duration_seconds", 0)

        session_kills = extra_data.get("enemies_killed", 0) or extra_data.get("kills", 0)
        session_time = (
            extra_data.get("survival_time", 0)
            or extra_data.get("time", 0)
            or duration_seconds
        )
        session_level = extra_data.get("player_level", 0) or extra_data.get("level", 0)

        cumulative["total_kills"] += session_kills
        cumulative["total_time_survived"] += session_time

        if session_level > cumulative["max_level"]:
            cumulative["max_level"] = session_level
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
            "total_kills": cumulative["total_kills"],
            "total_time_survived": cumulative["total_time_survived"],
        }

        if tracking_type in direct:
            return direct[tracking_type]

        if tracking_type == "kills_in_game":
            session_kills = (
                extra_data.get("enemies_killed", 0) or extra_data.get("kills", 0)
            )
            return user_quest.current_progress + session_kills

        if tracking_type == "time_survived_in_game":
            session_time = (
                extra_data.get("survival_time", 0) or extra_data.get("time", 0)
            )
            return user_quest.current_progress + session_time

        if tracking_type == "high_score":
            return 1 if cumulative["high_score"] >= quest.target_value else None

        if tracking_type == "max_level":
            return 1 if cumulative["max_level"] >= quest.target_value else None

        return None
