"""Main XP calculator that orchestrates multiple rules (Facade Pattern)."""

from typing import Dict, Any, List, Optional
import logging

from app.xp_calculator.context import SessionContext
from app.xp_calculator.factory import StrategyFactory

logger = logging.getLogger(__name__)


class XPCalculator:
    """Main XP calculator that orchestrates multiple rules."""

    def __init__(self):
        self._factory = StrategyFactory()

    def calculate_total_xp(
        self,
        rules: List[Dict[str, Any]],
        context: SessionContext,
    ) -> Dict[str, Any]:
        """
        Calculate total XP by applying all rules.

        Args:
            rules: List of rule dictionaries from database
            context: Session context with score, duration, etc.

        Returns:
            Dictionary with total_xp, base_xp, and breakdown by rule
        """
        base_xp = 0.0
        rule_breakdown = []

        sorted_rules = sorted(rules, key=lambda r: r.get('priority', 0), reverse=True)

        for rule in sorted_rules:
            if not rule.get('is_active', True):
                continue

            xp_from_rule = self._apply_rule(rule, context)
            if xp_from_rule is None:
                continue

            base_xp += xp_from_rule
            rule_breakdown.append({
                'rule_id': rule.get('rule_id'),
                'rule_name': rule.get('rule_name'),
                'rule_type': rule.get('rule_type'),
                'xp_earned': xp_from_rule,
            })

        map_multiplier = float(context.extra_data.get('xp_multiplier', 1.0))
        total_xp = base_xp * context.user_multiplier * map_multiplier

        return {
            'total_xp': round(total_xp, 2),
            'base_xp': round(base_xp, 2),
            'user_multiplier': context.user_multiplier,
            'map_multiplier': map_multiplier,
            'rule_breakdown': rule_breakdown,
        }

    def _apply_rule(
        self,
        rule: Dict[str, Any],
        context: SessionContext,
    ) -> Optional[float]:
        """Apply a single rule and return XP or None on failure."""
        rule_type = rule.get('rule_type')
        parameters = rule.get('parameters', {})

        strategy = self._factory.get_strategy(rule_type)

        if strategy is None:
            logger.warning("Unknown strategy type: %s", rule_type)
            return None

        if not strategy.validate_parameters(parameters):
            logger.error("Invalid parameters for rule %s: %s", rule.get('rule_id'), parameters)
            return None

        try:
            return strategy.calculate(context, parameters)
        except Exception:
            logger.error("Error calculating XP for rule %s", rule.get('rule_id'), exc_info=True)
            return None

    @staticmethod
    def _default_calculation(context: SessionContext) -> Dict[str, Any]:
        """
        Fallback calculation when no rules are defined.

        Uses legacy calculation method:
        - 0.01 XP per score point
        - 0.1 XP per minute (max 10 minutes)
        - 10 XP bonus for new high score
        """
        score_xp = context.score * 0.01
        minutes = min(context.duration_seconds / 60.0, 10.0)
        time_xp = minutes * 0.1
        highscore_xp = 10.0 if context.is_new_high_score else 0.0

        base_xp = score_xp + time_xp + highscore_xp
        map_multiplier = float(context.extra_data.get('xp_multiplier', 1.0))
        total_xp = base_xp * context.user_multiplier * map_multiplier

        return {
            'total_xp': round(total_xp, 2),
            'base_xp': round(base_xp, 2),
            'user_multiplier': context.user_multiplier,
            'map_multiplier': map_multiplier,
            'rule_breakdown': [
                {'rule_name': 'Default Score', 'xp_earned': score_xp},
                {'rule_name': 'Default Time', 'xp_earned': time_xp},
                {'rule_name': 'Default High Score', 'xp_earned': highscore_xp},
            ],
        }
