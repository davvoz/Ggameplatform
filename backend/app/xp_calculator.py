"""
XP Calculation System using Strategy Pattern.
Follows SOLID principles and SonarQube best practices.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class SessionContext:
    """Context object containing all session data needed for XP calculation."""
    score: int
    duration_seconds: int
    is_new_high_score: bool
    user_multiplier: float
    previous_high_score: int = 0
    
    def __post_init__(self):
        """Validate session context data."""
        if self.score < 0:
            raise ValueError("Score cannot be negative")
        if self.duration_seconds < 0:
            raise ValueError("Duration cannot be negative")
        if self.user_multiplier < 0:
            raise ValueError("User multiplier cannot be negative")


class XPCalculationStrategy(ABC):
    """Abstract base class for XP calculation strategies (Strategy Pattern)."""
    
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
        pass
    
    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """
        Validate that parameters are correct for this strategy.
        
        Args:
            parameters: Rule parameters to validate
            
        Returns:
            True if parameters are valid, False otherwise
        """
        pass


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
        """Validate score multiplier parameters."""
        if 'multiplier' in parameters:
            if not isinstance(parameters['multiplier'], (int, float)) or parameters['multiplier'] < 0:
                return False
        
        if 'max_xp' in parameters:
            max_xp = parameters['max_xp']
            if max_xp is not None and (not isinstance(max_xp, (int, float)) or max_xp < 0):
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
        """Validate time bonus parameters."""
        if 'xp_per_minute' in parameters:
            if not isinstance(parameters['xp_per_minute'], (int, float)) or parameters['xp_per_minute'] < 0:
                return False
        
        if 'max_minutes' in parameters:
            if not isinstance(parameters['max_minutes'], (int, float)) or parameters['max_minutes'] < 0:
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
        
        # Sort thresholds by score descending to find highest match
        sorted_thresholds = sorted(thresholds, key=lambda x: x.get('score', 0), reverse=True)
        
        for threshold in sorted_thresholds:
            threshold_score = threshold.get('score', 0)
            threshold_xp = threshold.get('xp', 0)
            
            if context.score >= threshold_score:
                return float(threshold_xp)
        
        return 0.0
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate threshold parameters."""
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
        """Validate high score bonus parameters."""
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
        """Validate combo parameters."""
        for key in ['min_score', 'min_duration']:
            if key in parameters:
                if not isinstance(parameters[key], (int, float)) or parameters[key] < 0:
                    return False
        
        if 'bonus_xp' in parameters:
            if not isinstance(parameters['bonus_xp'], (int, float)) or parameters['bonus_xp'] < 0:
                return False
        
        return True


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
        """Validate percentile improvement parameters."""
        if 'xp_per_percent' in parameters:
            if not isinstance(parameters['xp_per_percent'], (int, float)) or parameters['xp_per_percent'] < 0:
                return False
        
        if 'max_xp' in parameters:
            max_xp = parameters['max_xp']
            if max_xp is not None and (not isinstance(max_xp, (int, float)) or max_xp < 0):
                return False
        
        return True


class StrategyFactory:
    """Factory for creating XP calculation strategies (Factory Pattern)."""
    
    _strategies: Dict[str, XPCalculationStrategy] = {
        'score_multiplier': ScoreMultiplierStrategy(),
        'time_bonus': TimeBonusStrategy(),
        'threshold': ThresholdStrategy(),
        'high_score_bonus': HighScoreBonusStrategy(),
        'combo': ComboStrategy(),
        'percentile_improvement': PercentileImprovementStrategy(),
    }
    
    @classmethod
    def get_strategy(cls, rule_type: str) -> Optional[XPCalculationStrategy]:
        """
        Get strategy instance for the given rule type.
        
        Args:
            rule_type: Type of XP calculation rule
            
        Returns:
            Strategy instance or None if not found
        """
        return cls._strategies.get(rule_type)
    
    @classmethod
    def get_available_strategies(cls) -> List[str]:
        """Get list of all available strategy types."""
        return list(cls._strategies.keys())
    
    @classmethod
    def register_strategy(cls, rule_type: str, strategy: XPCalculationStrategy) -> None:
        """
        Register a new custom strategy (Open/Closed Principle).
        
        Args:
            rule_type: Type identifier for the strategy
            strategy: Strategy instance to register
        """
        cls._strategies[rule_type] = strategy


class XPCalculator:
    """Main XP calculator that orchestrates multiple rules (Facade Pattern)."""
    
    def __init__(self):
        """Initialize the XP calculator."""
        self._factory = StrategyFactory()
    
    def calculate_total_xp(
        self, 
        rules: List[Dict[str, Any]], 
        context: SessionContext
    ) -> Dict[str, Any]:
        """
        Calculate total XP by applying all rules.
        
        Args:
            rules: List of rule dictionaries from database
            context: Session context with score, duration, etc.
            
        Returns:
            Dictionary with total_xp, base_xp, and breakdown by rule
        """
        if not rules:
            logger.warning("No XP rules provided, using default calculation")
            return self._default_calculation(context)
        
        base_xp = 0.0
        rule_breakdown = []
        
        # Sort rules by priority (highest first)
        sorted_rules = sorted(rules, key=lambda r: r.get('priority', 0), reverse=True)
        
        for rule in sorted_rules:
            if not rule.get('is_active', True):
                continue
            
            rule_type = rule.get('rule_type')
            parameters = rule.get('parameters', {})
            
            strategy = self._factory.get_strategy(rule_type)
            
            if strategy is None:
                logger.warning(f"Unknown strategy type: {rule_type}")
                continue
            
            if not strategy.validate_parameters(parameters):
                logger.error(f"Invalid parameters for rule {rule.get('rule_id')}: {parameters}")
                continue
            
            try:
                xp_from_rule = strategy.calculate(context, parameters)
                base_xp += xp_from_rule
                
                rule_breakdown.append({
                    'rule_id': rule.get('rule_id'),
                    'rule_name': rule.get('rule_name'),
                    'rule_type': rule_type,
                    'xp_earned': xp_from_rule
                })
                
            except Exception as e:
                logger.error(f"Error calculating XP for rule {rule.get('rule_id')}: {e}")
                continue
        
        # Apply user multiplier
        total_xp = base_xp * context.user_multiplier
        
        return {
            'total_xp': round(total_xp, 2),
            'base_xp': round(base_xp, 2),
            'user_multiplier': context.user_multiplier,
            'rule_breakdown': rule_breakdown
        }
    
    def _default_calculation(self, context: SessionContext) -> Dict[str, Any]:
        """
        Fallback calculation when no rules are defined.
        
        Uses legacy calculation method:
        - 0.01 XP per score point
        - 0.1 XP per minute (max 10 minutes)
        - 10 XP bonus for new high score
        """
        base_xp = 0.0
        
        # Score component
        score_xp = context.score * 0.01
        base_xp += score_xp
        
        # Time component
        minutes = min(context.duration_seconds / 60.0, 10.0)
        time_xp = minutes * 0.1
        base_xp += time_xp
        
        # High score bonus
        highscore_xp = 10.0 if context.is_new_high_score else 0.0
        base_xp += highscore_xp
        
        total_xp = base_xp * context.user_multiplier
        
        return {
            'total_xp': round(total_xp, 2),
            'base_xp': round(base_xp, 2),
            'user_multiplier': context.user_multiplier,
            'rule_breakdown': [
                {'rule_name': 'Default Score', 'xp_earned': score_xp},
                {'rule_name': 'Default Time', 'xp_earned': time_xp},
                {'rule_name': 'Default High Score', 'xp_earned': highscore_xp}
            ]
        }
