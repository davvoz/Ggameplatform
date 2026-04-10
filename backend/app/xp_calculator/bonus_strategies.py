"""Bonus-based XP calculation strategies."""

from typing import Dict, Any

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.context import SessionContext


class FlatBonusStrategy(XPCalculationStrategy):
    """Award a flat XP amount regardless of score (participation bonus)."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        XP = base_xp (fixed amount per session).

        Expected parameters:
            - base_xp: float (default 1.0)
        """
        return parameters.get('base_xp', 1.0)

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'base_xp' in parameters:
            if not isinstance(parameters['base_xp'], (int, float)) or parameters['base_xp'] < 0:
                return False
        return True


class TimeBonusStrategy(XPCalculationStrategy):
    """Calculate XP based on time played."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        XP = minutes_played * xp_per_minute (capped at max_minutes).

        Expected parameters:
            - xp_per_minute: float (default 0.1)
            - max_minutes: float (default 10)
        """
        xp_per_minute = parameters.get('xp_per_minute', 0.1)
        max_minutes = parameters.get('max_minutes', 10.0)

        minutes_played = context.duration_seconds / 60.0
        capped_minutes = min(minutes_played, max_minutes)

        return capped_minutes * xp_per_minute

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'xp_per_minute' in parameters:
            if not isinstance(parameters['xp_per_minute'], (int, float)) or parameters['xp_per_minute'] < 0:
                return False

        if 'max_minutes' in parameters:
            if not isinstance(parameters['max_minutes'], (int, float)) or parameters['max_minutes'] < 0:
                return False

        return True


class HighScoreBonusStrategy(XPCalculationStrategy):
    """Award bonus XP for achieving a new high score."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award bonus XP if new high score is achieved.

        Expected parameters:
            - bonus_xp: float (default 10.0)
        """
        if context.is_new_high_score:
            return parameters.get('bonus_xp', 10.0)
        return 0.0

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'bonus_xp' in parameters:
            if not isinstance(parameters['bonus_xp'], (int, float)) or parameters['bonus_xp'] < 0:
                return False
        return True


class ComboStrategy(XPCalculationStrategy):
    """Award bonus XP for achieving multiple conditions simultaneously."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award bonus if score AND duration conditions are met.

        Expected parameters:
            - min_score: int (default 0)
            - min_duration: int in seconds (default 0)
            - bonus_xp: float (default 0)
        """
        min_score = parameters.get('min_score', 0)
        min_duration = parameters.get('min_duration', 0)
        bonus_xp = parameters.get('bonus_xp', 0.0)

        if context.score >= min_score and context.duration_seconds >= min_duration:
            return bonus_xp

        return 0.0

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        for key in ['min_score', 'min_duration']:
            if key in parameters:
                if not isinstance(parameters[key], (int, float)) or parameters[key] < 0:
                    return False

        if 'bonus_xp' in parameters:
            if not isinstance(parameters['bonus_xp'], (int, float)) or parameters['bonus_xp'] < 0:
                return False

        return True
