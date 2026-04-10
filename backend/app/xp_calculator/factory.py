"""Factory for creating XP calculation strategies (Factory Pattern)."""

from typing import Dict, List, Optional

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.score_strategies import (
    ScoreMultiplierStrategy,
    ScorePowerStrategy,
    ThresholdStrategy,
    LevelScoreStrategy,
)
from app.xp_calculator.bonus_strategies import (
    FlatBonusStrategy,
    TimeBonusStrategy,
    HighScoreBonusStrategy,
    ComboStrategy,
)
from app.xp_calculator.improvement_strategies import (
    PercentileImprovementStrategy,
    AbsoluteImprovementStrategy,
)
from app.xp_calculator.progression_strategies import (
    LevelProgressionStrategy,
    DistanceBonusStrategy,
)
from app.xp_calculator.custom_strategy import CustomStrategy


class StrategyFactory:
    """Factory for creating XP calculation strategies (Factory Pattern)."""

    _strategies: Dict[str, XPCalculationStrategy] = {
        'flat': FlatBonusStrategy(),
        'score_multiplier': ScoreMultiplierStrategy(),
        'score_power': ScorePowerStrategy(),
        'time_bonus': TimeBonusStrategy(),
        'threshold': ThresholdStrategy(),
        'high_score_bonus': HighScoreBonusStrategy(),
        'combo': ComboStrategy(),
        'percentile_improvement': PercentileImprovementStrategy(),
        'level_progression': LevelProgressionStrategy(),
        'distance_bonus': DistanceBonusStrategy(),
        'absolute_improvement': AbsoluteImprovementStrategy(),
        'level_score': LevelScoreStrategy(),
        'custom': CustomStrategy(),
    }

    @classmethod
    def get_strategy(cls, rule_type: str) -> Optional[XPCalculationStrategy]:
        """Get strategy instance for the given rule type."""
        return cls._strategies.get(rule_type)

    @classmethod
    def get_available_strategies(cls) -> List[str]:
        """Get list of all available strategy types."""
        return list(cls._strategies.keys())

    @classmethod
    def register_strategy(cls, rule_type: str, strategy: XPCalculationStrategy) -> None:
        """Register a new custom strategy (Open/Closed Principle)."""
        cls._strategies[rule_type] = strategy
