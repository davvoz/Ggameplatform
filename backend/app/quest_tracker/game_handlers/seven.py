"""Seven (dice) game quest handler."""

import logging
from typing import Dict, Optional

from app.models import Quest, UserQuest
from app.quest_tracker.base_game_handler import BaseGameQuestHandler

logger = logging.getLogger(__name__)


class SevenHandler(BaseGameQuestHandler):

    def _default_cumulative(self) -> dict:
        return {
            "rolls_played": 0,
            "wins": 0,
            "losses": 0,
            "win_streak": 0,
            "max_win_streak": 0,
            "total_profit": 0,
            "roll_seven_count": 0,
            "wins_under": 0,
            "wins_over": 0,
            "max_bet_won": 0,
        }

    def _update_cumulative(
        self, cumulative: dict, extra_data: Dict, score: int, **kwargs
    ) -> None:
        cumulative["rolls_played"] += 1

        won = extra_data.get("won", False)
        net_profit = extra_data.get("net_profit", 0)
        bet_amount = extra_data.get("bet_amount", 0)
        bet_type = extra_data.get("bet_type", "")
        dice_sum = extra_data.get("sum", 0)

        if won:
            cumulative["wins"] += 1
            cumulative["win_streak"] += 1
            cumulative["max_win_streak"] = max(
                cumulative["max_win_streak"], cumulative["win_streak"]
            )
            if bet_type == "under":
                cumulative["wins_under"] += 1
            elif bet_type == "over":
                cumulative["wins_over"] += 1
            if bet_amount > cumulative["max_bet_won"]:
                cumulative["max_bet_won"] = bet_amount
        else:
            cumulative["losses"] += 1
            cumulative["win_streak"] = 0

        cumulative["total_profit"] += net_profit

        if dice_sum == 7:
            cumulative["roll_seven_count"] += 1

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
            "rolls_played": cumulative["rolls_played"],
            "win_streak": cumulative["max_win_streak"],
            "roll_seven": cumulative["roll_seven_count"],
            "win_under_bets": cumulative["wins_under"],
            "win_over_bets": cumulative["wins_over"],
        }

        if tracking_type in mapping:
            return mapping[tracking_type]

        if tracking_type == "total_profit":
            return cumulative["total_profit"] if cumulative["total_profit"] > 0 else None

        if tracking_type == "win_with_high_bet":
            return self._handle_high_bet_win(cumulative, extra_data, quest_config)

        return None

    # ------------------------------------------------------------------

    @staticmethod
    def _handle_high_bet_win(
        cumulative: dict, extra_data: Dict, quest_config: Dict
    ) -> Optional[int]:
        min_bet = quest_config.get("min_bet", 30)
        bet_amount = extra_data.get("bet_amount", 0)
        won = extra_data.get("won", False)

        if won and bet_amount >= min_bet:
            cumulative.setdefault("high_bet_wins", 0)
            cumulative["high_bet_wins"] += 1
            logger.debug(
                "High bet win — bet=%s >= min_bet=%s, count=%s",
                bet_amount,
                min_bet,
                cumulative["high_bet_wins"],
            )
            return cumulative["high_bet_wins"]
        return cumulative.get("high_bet_wins")
