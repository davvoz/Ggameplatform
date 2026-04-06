"""Altitude game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class AltitudeHandler(BaseGameQuestHandler):
    """Quest handler for Altitude vertical jumping game."""

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "high_score": 0,
            "max_altitude": 0,
            "total_coins": 0,
            "total_enemies_defeated": 0,
            "total_powerups_collected": 0,
            "total_jumps": 0,
            "max_combo": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        # Session stats
        cumulative["total_coins"] += extra_data.get("coins_collected", 0)
        cumulative["total_enemies_defeated"] += extra_data.get("enemies_defeated", 0)
        cumulative["total_powerups_collected"] += extra_data.get("powerups_collected", 0)
        cumulative["total_jumps"] += extra_data.get("jumps", 0)

        # Best values
        session_altitude = extra_data.get("altitude", 0)
        if session_altitude > cumulative["max_altitude"]:
            cumulative["max_altitude"] = session_altitude

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
        # Direct cumulative mapping
        direct = {
            "games_played": cumulative["games_played"],
            "total_coins": cumulative["total_coins"],
            "total_enemies_defeated": cumulative["total_enemies_defeated"],
            "total_powerups_collected": cumulative["total_powerups_collected"],
            "total_jumps": cumulative["total_jumps"],
        }

        if tracking_type in direct:
            return direct[tracking_type]

        # Single session best tracking
        if tracking_type == "score_in_game":
            return max(user_quest.current_progress, cumulative["high_score"])

        if tracking_type == "altitude_in_game":
            session_altitude = extra_data.get("altitude", 0)
            return max(user_quest.current_progress, session_altitude)

        if tracking_type == "enemies_in_game":
            session_enemies = extra_data.get("enemies_defeated", 0)
            return max(user_quest.current_progress, session_enemies)

        if tracking_type == "combo_in_game":
            session_combo = extra_data.get("max_combo", 0)
            return max(user_quest.current_progress, session_combo)

        if tracking_type == "coins_in_game":
            session_coins = extra_data.get("coins_collected", 0)
            return max(user_quest.current_progress, session_coins)

        if tracking_type == "powerups_in_game":
            session_powerups = extra_data.get("powerups_collected", 0)
            return max(user_quest.current_progress, session_powerups)

        # Threshold checks (returns 1 if threshold reached)
        if tracking_type == "high_score":
            return 1 if cumulative["high_score"] >= quest.target_value else None

        if tracking_type == "max_altitude":
            return 1 if cumulative["max_altitude"] >= quest.target_value else None

        if tracking_type == "max_combo":
            return 1 if cumulative["max_combo"] >= quest.target_value else None

        return None
