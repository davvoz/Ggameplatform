"""Improvement-based XP calculation strategies."""

from typing import Dict, Any

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.context import SessionContext


class PercentileImprovementStrategy(XPCalculationStrategy):
    """Award XP based on percentage improvement over previous high score."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award XP proportional to score improvement percentage.

        Expected parameters:
            - xp_per_percent: float (default 0.5)
            - max_xp: float or None (default None)
        """
        if not context.is_new_high_score or context.previous_high_score == 0:
            return 0.0

        improvement = context.score - context.previous_high_score
        improvement_percent = (improvement / context.previous_high_score) * 100

        xp_per_percent = parameters.get('xp_per_percent', 0.5)
        xp = improvement_percent * xp_per_percent

        max_xp = parameters.get('max_xp')
        if max_xp is not None and xp > max_xp:
            xp = max_xp

        return xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'xp_per_percent' in parameters:
            if not isinstance(parameters['xp_per_percent'], (int, float)) or parameters['xp_per_percent'] < 0:
                return False

        if 'max_xp' in parameters:
            max_xp = parameters['max_xp']
            if max_xp is not None and (not isinstance(max_xp, (int, float)) or max_xp < 0):
                return False

        return True


class AbsoluteImprovementStrategy(XPCalculationStrategy):
    """Award XP based on absolute score improvement (no cap)."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award XP proportional to absolute score improvement.

        Expected parameters:
            - xp_per_point: float (default 0.001) - XP per point of improvement
        """
        if not context.is_new_high_score or context.previous_high_score == 0:
            return 0.0

        improvement = context.score - context.previous_high_score
        xp_per_point = parameters.get('xp_per_point', 0.001)

        return improvement * xp_per_point

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'xp_per_point' in parameters:
            if not isinstance(parameters['xp_per_point'], (int, float)) or parameters['xp_per_point'] < 0:
                return False
        return True
