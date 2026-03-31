"""Briscola game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class BriscolaHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "win_streak": 0,
            "current_win_streak": 0,
            "hard_ai_wins": 0,
            "perfect_scores": 0,
            "domination_wins": 0,
            "multiplayer_games": 0,
            "multiplayer_wins": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["games_played"] += 1

        won = extra_data.get("won", False)
        player_score = extra_data.get("player_score", 0)
        opponent_score = extra_data.get("opponent_score", 0)
        is_ai = extra_data.get("is_ai", False)
        ai_difficulty = extra_data.get("ai_difficulty", "")
        is_multiplayer = extra_data.get("is_multiplayer", False)

        if won:
            cumulative["wins"] += 1
            cumulative["current_win_streak"] += 1
            cumulative["win_streak"] = max(
                cumulative["win_streak"], cumulative["current_win_streak"]
            )

            if is_ai and ai_difficulty == "hard":
                cumulative["hard_ai_wins"] += 1

            if player_score == 120:
                cumulative["perfect_scores"] += 1
                logger.debug("Briscola CAPPOTTO — perfect score")

            if player_score - opponent_score >= 40:
                cumulative["domination_wins"] += 1
                logger.debug("Briscola DOMINATION — margin %s", player_score - opponent_score)

            if is_multiplayer:
                cumulative["multiplayer_wins"] += 1
        else:
            cumulative["losses"] += 1
            cumulative["current_win_streak"] = 0

        if is_multiplayer:
            cumulative["multiplayer_games"] += 1

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
            "win_streak": cumulative["win_streak"],
            "hard_ai_wins": cumulative["hard_ai_wins"],
            "perfect_score": cumulative["perfect_scores"],
            "domination_win": cumulative["domination_wins"],
            "multiplayer_wins": cumulative["multiplayer_wins"],
        }
        return mapping.get(tracking_type)
