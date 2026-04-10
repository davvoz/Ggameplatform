"""Progression-based XP calculation strategies."""

from typing import Dict, Any

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.context import SessionContext


class LevelProgressionStrategy(XPCalculationStrategy):
    """Award cumulative XP for each level completed (no cap)."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award cumulative XP: Sum of (base_xp + level * increment) for each level.

        Expected parameters:
            - base_xp: float (default 0.03) - Base XP per level
            - increment: float (default 0.0001) - XP increment per level number

        Example: levels 1-5 with base=0.03, increment=0.0001
            Level 1: 0.0301, Level 2: 0.0302, ..., Level 5: 0.0305
            Total: 0.15 XP
        """
        if context.levels_completed <= 0:
            return 0.0

        base_xp = parameters.get('base_xp', 0.03)
        increment = parameters.get('increment', 0.0001)

        total_xp = 0.0
        for level in range(1, context.levels_completed + 1):
            total_xp += base_xp + (level * increment)

        return total_xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        for key in ['base_xp', 'increment']:
            if key in parameters:
                if not isinstance(parameters[key], (int, float)) or parameters[key] < 0:
                    return False
        return True


class DistanceBonusStrategy(XPCalculationStrategy):
    """Award XP for distance milestones (no cap)."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Award XP for every milestone_distance reached.

        Expected parameters:
            - milestone_distance: float (default 500.0) - Distance per milestone
            - xp_per_milestone: float (default 0.2) - XP awarded per milestone
        """
        if context.distance <= 0:
            return 0.0

        milestone_distance = parameters.get('milestone_distance', 500.0)
        xp_per_milestone = parameters.get('xp_per_milestone', 0.2)

        if milestone_distance <= 0:
            return 0.0

        milestones = int(context.distance / milestone_distance)
        return milestones * xp_per_milestone

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        for key in ['milestone_distance', 'xp_per_milestone']:
            if key in parameters:
                if not isinstance(parameters[key], (int, float)) or parameters[key] <= 0:
                    return False
        return True
