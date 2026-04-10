"""Score-based XP calculation strategies."""

import math
from typing import Dict, Any

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.context import SessionContext


class ScoreMultiplierStrategy(XPCalculationStrategy):
    """Calculate XP as a multiplier of the score."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        XP = score * multiplier (capped at max_xp if specified).

        Expected parameters:
            - multiplier: float (default 0.01)
            - max_xp: float or None (default None)
        """
        multiplier = parameters.get('multiplier', 0.01)
        max_xp = parameters.get('max_xp')

        xp = context.score * multiplier

        if max_xp is not None and xp > max_xp:
            xp = max_xp

        return xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'multiplier' in parameters:
            if not isinstance(parameters['multiplier'], (int, float)) or parameters['multiplier'] < 0:
                return False

        if 'max_xp' in parameters:
            max_xp = parameters['max_xp']
            if max_xp is not None and (not isinstance(max_xp, (int, float)) or max_xp < 0):
                return False

        return True


class ScorePowerStrategy(XPCalculationStrategy):
    """Calculate XP using a power function of the score (e.g. square root)."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        XP = multiplier * score^power (capped at max_xp if specified).

        Use power < 1 for diminishing returns (e.g. 0.5 = square root).

        Expected parameters:
            - multiplier: float (default 1.0)
            - power: float (default 0.5)
            - max_xp: float or None (default None)
        """
        multiplier = parameters.get('multiplier', 1.0)
        power = parameters.get('power', 0.5)
        max_xp = parameters.get('max_xp')

        if context.score <= 0:
            return 0.0

        xp = multiplier * math.pow(context.score, power)

        if max_xp is not None and xp > max_xp:
            xp = max_xp

        return xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'multiplier' in parameters:
            if not isinstance(parameters['multiplier'], (int, float)) or parameters['multiplier'] < 0:
                return False

        if 'power' in parameters:
            if not isinstance(parameters['power'], (int, float)) or parameters['power'] <= 0:
                return False

        if 'max_xp' in parameters:
            max_xp = parameters['max_xp']
            if max_xp is not None and (not isinstance(max_xp, (int, float)) or max_xp < 0):
                return False

        return True


class ThresholdStrategy(XPCalculationStrategy):
    """Award XP when score reaches certain thresholds."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award XP based on highest threshold reached.

        Expected parameters:
            - thresholds: List[Dict] with 'score' and 'xp' keys
              Example: [{"score": 1000, "xp": 50}, {"score": 500, "xp": 25}]
        """
        thresholds = parameters.get('thresholds', [])
        sorted_thresholds = sorted(thresholds, key=lambda x: x.get('score', 0), reverse=True)

        for threshold in sorted_thresholds:
            threshold_score = threshold.get('score', 0)
            threshold_xp = threshold.get('xp', 0)

            if context.score >= threshold_score:
                return float(threshold_xp)

        return 0.0

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'thresholds' not in parameters:
            return False

        thresholds = parameters['thresholds']
        if not isinstance(thresholds, list):
            return False

        for threshold in thresholds:
            if not isinstance(threshold, dict):
                return False
            if 'score' not in threshold or 'xp' not in threshold:
                return False
            if not isinstance(threshold['score'], (int, float)) or threshold['score'] < 0:
                return False
            if not isinstance(threshold['xp'], (int, float)) or threshold['xp'] < 0:
                return False

        return True


class LevelScoreStrategy(XPCalculationStrategy):
    """Calculate XP based on score and level with optional logarithmic scaling."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        XP = (score / score_divisor) * level_multiplier

        Expected parameters:
            - score_divisor: float (default 100000)
            - log_base: float or None (default None) - if set, uses logarithmic scaling
            - max_xp: float or None (default None)

        Level is taken from extra_data['level'] or defaults to 1.

        Linear mode (log_base=None):
            XP = (score / divisor) * level

        Logarithmic mode (log_base=6):
            XP = (score / divisor) * (1 + log_base(level))
        """
        score_divisor = parameters.get('score_divisor', 100000)
        log_base = parameters.get('log_base')
        max_xp = parameters.get('max_xp')

        level = 1
        if context.extra_data:
            level = max(1, context.extra_data.get('level', 1))

        if log_base and log_base > 1:
            level_multiplier = 1 + (math.log(level) / math.log(log_base))
        else:
            level_multiplier = level

        xp = (context.score / score_divisor) * level_multiplier

        if max_xp is not None and xp > max_xp:
            xp = max_xp

        return xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        if 'score_divisor' in parameters:
            if not isinstance(parameters['score_divisor'], (int, float)) or parameters['score_divisor'] <= 0:
                return False
        if 'log_base' in parameters and parameters['log_base'] is not None:
            if not isinstance(parameters['log_base'], (int, float)) or parameters['log_base'] <= 1:
                return False
        if 'max_xp' in parameters and parameters['max_xp'] is not None:
            if not isinstance(parameters['max_xp'], (int, float)) or parameters['max_xp'] < 0:
                return False
        return True
