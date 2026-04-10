"""Custom XP calculation strategy for game-specific logic."""

from typing import Dict, Any

from app.xp_calculator.base import XPCalculationStrategy
from app.xp_calculator.context import SessionContext


class CustomStrategy(XPCalculationStrategy):
    """Calculate XP using custom logic based on extra_data from session."""

    def calculate(self, context: SessionContext, parameters: Dict[str, Any]) -> float:
        """
        Calculate XP using custom logic defined in parameters.
        Uses extra_data from context for game-specific metrics.

        Supported custom calculations:
            - xp_per_wave: XP per wave completed
            - xp_per_10_kills: XP per 10 kills
            - xp_per_kill: XP per single kill
            - level_bonuses: XP bonuses for reaching specific levels
            - xp_per_merge: XP per tower merge
            - xp_per_100_coins: XP per 100 coins earned
            - xp_per_level: XP per player level
        """
        if not context.extra_data:
            return 0.0

        xp = 0.0
        xp += self._calc_wave_bonus(context, parameters)
        xp += self._calc_kills_per_10_bonus(context, parameters)
        xp += self._calc_kills_per_unit_bonus(context, parameters)
        xp += self._calc_level_bonuses(context, parameters)
        xp += self._calc_merge_bonus(context, parameters)
        xp += self._calc_coins_bonus(context, parameters)
        xp += self._calc_player_level_bonus(context, parameters)

        return xp

    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        validators = [
            self._validate_wave_params,
            self._validate_kills_per_10_params,
            self._validate_kills_per_unit_params,
            self._validate_level_bonuses_params,
            self._validate_player_level_params,
        ]
        return all(v(parameters) for v in validators)

    # --- Private calculation helpers ---

    @staticmethod
    def _calc_wave_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_wave' not in parameters:
            return 0.0
        wave = context.extra_data.get('wave', 0)
        max_waves = parameters.get('max_waves', 999)
        return min(wave, max_waves) * parameters['xp_per_wave']

    @staticmethod
    def _calc_kills_per_10_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_10_kills' not in parameters:
            return 0.0
        kills = context.extra_data.get('kills', 0)
        max_kills = parameters.get('max_kills', 999)
        effective_kills = min(kills, max_kills)
        return (effective_kills / 10.0) * parameters['xp_per_10_kills']

    @staticmethod
    def _calc_kills_per_unit_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_kill' not in parameters:
            return 0.0
        kills = context.extra_data.get('kills', 0)
        max_kills = parameters.get('max_kills', 999)
        return min(kills, max_kills) * parameters['xp_per_kill']

    @staticmethod
    def _calc_level_bonuses(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'level_bonuses' not in parameters:
            return 0.0
        highest_level = context.extra_data.get(
            'player_level',
            context.extra_data.get('highest_tower_level', 0),
        )
        for bonus in parameters['level_bonuses']:
            if highest_level >= bonus.get('level', 0):
                return bonus.get('xp', 0)
        return 0.0

    @staticmethod
    def _calc_merge_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_merge' not in parameters:
            return 0.0
        merges = context.extra_data.get('tower_merges', 0)
        max_merges = parameters.get('max_merges', 999)
        return min(merges, max_merges) * parameters['xp_per_merge']

    @staticmethod
    def _calc_coins_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_100_coins' not in parameters:
            return 0.0
        coins = context.extra_data.get('coins_earned', 0)
        max_coins = parameters.get('max_coins', 99999)
        return (min(coins, max_coins) / 100.0) * parameters['xp_per_100_coins']

    @staticmethod
    def _calc_player_level_bonus(context: SessionContext, parameters: Dict[str, Any]) -> float:
        if 'xp_per_level' not in parameters:
            return 0.0
        level = context.extra_data.get('player_level', 0)
        max_level = parameters.get('max_level', 999)
        return min(level, max_level) * parameters['xp_per_level']

    # --- Private validation helpers ---

    @staticmethod
    def _validate_wave_params(parameters: Dict[str, Any]) -> bool:
        if 'xp_per_wave' in parameters:
            if not isinstance(parameters['xp_per_wave'], (int, float)) or parameters['xp_per_wave'] < 0:
                return False
        return True

    @staticmethod
    def _validate_kills_per_10_params(parameters: Dict[str, Any]) -> bool:
        if 'xp_per_10_kills' in parameters:
            if not isinstance(parameters['xp_per_10_kills'], (int, float)) or parameters['xp_per_10_kills'] < 0:
                return False
        return True

    @staticmethod
    def _validate_kills_per_unit_params(parameters: Dict[str, Any]) -> bool:
        if 'xp_per_kill' in parameters:
            if not isinstance(parameters['xp_per_kill'], (int, float)) or parameters['xp_per_kill'] < 0:
                return False
        return True

    @staticmethod
    def _validate_player_level_params(parameters: Dict[str, Any]) -> bool:
        if 'xp_per_level' in parameters:
            if not isinstance(parameters['xp_per_level'], (int, float)) or parameters['xp_per_level'] < 0:
                return False
        return True

    @staticmethod
    def _validate_level_bonuses_params(parameters: Dict[str, Any]) -> bool:
        if 'level_bonuses' not in parameters:
            return True
        bonuses = parameters['level_bonuses']
        if not isinstance(bonuses, list):
            return False
        for bonus in bonuses:
            if not isinstance(bonus, dict):
                return False
            if 'level' not in bonus or 'xp' not in bonus:
                return False
            if not isinstance(bonus['level'], (int, float)) or bonus['level'] < 0:
                return False
            if not isinstance(bonus['xp'], (int, float)) or bonus['xp'] < 0:
                return False
        return True
