"""Abstract base class for XP calculation strategies (Strategy Pattern)."""

from abc import ABC, abstractmethod
from typing import Dict, Any

from app.xp_calculator.context import SessionContext


class XPCalculationStrategy(ABC):
    """Abstract base class for XP calculation strategies."""

    @abstractmethod
    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Calculate XP based on session context and rule parameters.

        Args:
            context: Session context containing score, duration, etc.
            parameters: Rule-specific parameters from database

        Returns:
            XP amount (before user multiplier)
        """

    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """
        Validate that parameters are correct for this strategy.

        Args:
            parameters: Rule parameters to validate

        Returns:
            True if parameters are valid, False otherwise
        """
