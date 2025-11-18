"""
Unit tests for XP calculation system.
Tests all strategy patterns and validation logic.
"""

import unittest
from app.xp_calculator import (
    SessionContext,
    ScoreMultiplierStrategy,
    TimeBonusStrategy,
    ThresholdStrategy,
    HighScoreBonusStrategy,
    ComboStrategy,
    PercentileImprovementStrategy,
    StrategyFactory,
    XPCalculator
)


class TestSessionContext(unittest.TestCase):
    """Test SessionContext dataclass."""
    
    def test_valid_context(self):
        """Test creating valid session context."""
        context = SessionContext(
            score=1000,
            duration_seconds=120,
            is_new_high_score=True,
            user_multiplier=1.5,
            previous_high_score=500
        )
        
        self.assertEqual(context.score, 1000)
        self.assertEqual(context.duration_seconds, 120)
        self.assertTrue(context.is_new_high_score)
        self.assertEqual(context.user_multiplier, 1.5)
        self.assertEqual(context.previous_high_score, 500)
    
    def test_negative_score_raises_error(self):
        """Test that negative score raises ValueError."""
        with self.assertRaises(ValueError):
            SessionContext(
                score=-100,
                duration_seconds=120,
                is_new_high_score=False,
                user_multiplier=1.0
            )
    
    def test_negative_duration_raises_error(self):
        """Test that negative duration raises ValueError."""
        with self.assertRaises(ValueError):
            SessionContext(
                score=100,
                duration_seconds=-60,
                is_new_high_score=False,
                user_multiplier=1.0
            )
    
    def test_negative_multiplier_raises_error(self):
        """Test that negative multiplier raises ValueError."""
        with self.assertRaises(ValueError):
            SessionContext(
                score=100,
                duration_seconds=60,
                is_new_high_score=False,
                user_multiplier=-1.0
            )


class TestScoreMultiplierStrategy(unittest.TestCase):
    """Test ScoreMultiplierStrategy."""
    
    def setUp(self):
        self.strategy = ScoreMultiplierStrategy()
        self.context = SessionContext(
            score=1000,
            duration_seconds=120,
            is_new_high_score=False,
            user_multiplier=1.0
        )
    
    def test_basic_calculation(self):
        """Test basic score multiplication."""
        params = {"multiplier": 0.01}
        xp = self.strategy.calculate(self.context, params)
        self.assertEqual(xp, 10.0)  # 1000 * 0.01
    
    def test_calculation_with_max(self):
        """Test score multiplication with max cap."""
        params = {"multiplier": 0.1, "max_xp": 50.0}
        xp = self.strategy.calculate(self.context, params)
        self.assertEqual(xp, 50.0)  # capped at max_xp
    
    def test_calculation_under_max(self):
        """Test score multiplication under max cap."""
        params = {"multiplier": 0.01, "max_xp": 50.0}
        xp = self.strategy.calculate(self.context, params)
        self.assertEqual(xp, 10.0)  # 1000 * 0.01 < 50
    
    def test_valid_parameters(self):
        """Test parameter validation."""
        self.assertTrue(self.strategy.validate_parameters({"multiplier": 0.01}))
        self.assertTrue(self.strategy.validate_parameters({"multiplier": 0.01, "max_xp": 100}))
        self.assertTrue(self.strategy.validate_parameters({"multiplier": 0.01, "max_xp": None}))
    
    def test_invalid_parameters(self):
        """Test invalid parameter validation."""
        self.assertFalse(self.strategy.validate_parameters({"multiplier": -0.01}))
        self.assertFalse(self.strategy.validate_parameters({"multiplier": "invalid"}))
        self.assertFalse(self.strategy.validate_parameters({"max_xp": -100}))


class TestTimeBonusStrategy(unittest.TestCase):
    """Test TimeBonusStrategy."""
    
    def setUp(self):
        self.strategy = TimeBonusStrategy()
    
    def test_basic_calculation(self):
        """Test basic time bonus calculation."""
        context = SessionContext(
            score=100,
            duration_seconds=300,  # 5 minutes
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"xp_per_minute": 0.1, "max_minutes": 10}
        xp = self.strategy.calculate(context, params)
        self.assertAlmostEqual(xp, 0.5, places=2)  # 5 * 0.1
    
    def test_calculation_with_max(self):
        """Test time bonus with max cap."""
        context = SessionContext(
            score=100,
            duration_seconds=900,  # 15 minutes
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"xp_per_minute": 0.1, "max_minutes": 10}
        xp = self.strategy.calculate(context, params)
        self.assertAlmostEqual(xp, 1.0, places=2)  # capped at 10 minutes
    
    def test_valid_parameters(self):
        """Test parameter validation."""
        self.assertTrue(self.strategy.validate_parameters({"xp_per_minute": 0.1}))
        self.assertTrue(self.strategy.validate_parameters({"xp_per_minute": 0.1, "max_minutes": 10}))
    
    def test_invalid_parameters(self):
        """Test invalid parameter validation."""
        self.assertFalse(self.strategy.validate_parameters({"xp_per_minute": -0.1}))
        self.assertFalse(self.strategy.validate_parameters({"max_minutes": -10}))


class TestThresholdStrategy(unittest.TestCase):
    """Test ThresholdStrategy."""
    
    def setUp(self):
        self.strategy = ThresholdStrategy()
        self.params = {
            "thresholds": [
                {"score": 5000, "xp": 100},
                {"score": 2500, "xp": 50},
                {"score": 1000, "xp": 25},
                {"score": 500, "xp": 10}
            ]
        }
    
    def test_highest_threshold(self):
        """Test reaching highest threshold."""
        context = SessionContext(
            score=6000,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        xp = self.strategy.calculate(context, self.params)
        self.assertEqual(xp, 100.0)
    
    def test_middle_threshold(self):
        """Test reaching middle threshold."""
        context = SessionContext(
            score=1500,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        xp = self.strategy.calculate(context, self.params)
        self.assertEqual(xp, 25.0)
    
    def test_no_threshold(self):
        """Test not reaching any threshold."""
        context = SessionContext(
            score=100,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        xp = self.strategy.calculate(context, self.params)
        self.assertEqual(xp, 0.0)
    
    def test_valid_parameters(self):
        """Test parameter validation."""
        self.assertTrue(self.strategy.validate_parameters(self.params))
    
    def test_invalid_parameters(self):
        """Test invalid parameter validation."""
        self.assertFalse(self.strategy.validate_parameters({}))
        self.assertFalse(self.strategy.validate_parameters({"thresholds": "invalid"}))
        self.assertFalse(self.strategy.validate_parameters({"thresholds": [{"score": -100, "xp": 10}]}))
        self.assertFalse(self.strategy.validate_parameters({"thresholds": [{"score": 100}]}))


class TestHighScoreBonusStrategy(unittest.TestCase):
    """Test HighScoreBonusStrategy."""
    
    def setUp(self):
        self.strategy = HighScoreBonusStrategy()
    
    def test_new_high_score(self):
        """Test bonus for new high score."""
        context = SessionContext(
            score=1000,
            duration_seconds=60,
            is_new_high_score=True,
            user_multiplier=1.0
        )
        params = {"bonus_xp": 10.0}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 10.0)
    
    def test_no_high_score(self):
        """Test no bonus for non-high score."""
        context = SessionContext(
            score=1000,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"bonus_xp": 10.0}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 0.0)
    
    def test_valid_parameters(self):
        """Test parameter validation."""
        self.assertTrue(self.strategy.validate_parameters({"bonus_xp": 10.0}))
        self.assertTrue(self.strategy.validate_parameters({}))
    
    def test_invalid_parameters(self):
        """Test invalid parameter validation."""
        self.assertFalse(self.strategy.validate_parameters({"bonus_xp": -10}))


class TestComboStrategy(unittest.TestCase):
    """Test ComboStrategy."""
    
    def setUp(self):
        self.strategy = ComboStrategy()
    
    def test_combo_achieved(self):
        """Test bonus when both conditions met."""
        context = SessionContext(
            score=1500,
            duration_seconds=120,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"min_score": 1000, "min_duration": 60, "bonus_xp": 20.0}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 20.0)
    
    def test_combo_failed_score(self):
        """Test no bonus when score too low."""
        context = SessionContext(
            score=500,
            duration_seconds=120,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"min_score": 1000, "min_duration": 60, "bonus_xp": 20.0}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 0.0)
    
    def test_combo_failed_duration(self):
        """Test no bonus when duration too short."""
        context = SessionContext(
            score=1500,
            duration_seconds=30,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        params = {"min_score": 1000, "min_duration": 60, "bonus_xp": 20.0}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 0.0)


class TestPercentileImprovementStrategy(unittest.TestCase):
    """Test PercentileImprovementStrategy."""
    
    def setUp(self):
        self.strategy = PercentileImprovementStrategy()
    
    def test_improvement_calculation(self):
        """Test XP calculation for score improvement."""
        context = SessionContext(
            score=1500,
            duration_seconds=60,
            is_new_high_score=True,
            user_multiplier=1.0,
            previous_high_score=1000
        )
        params = {"xp_per_percent": 0.5}
        xp = self.strategy.calculate(context, params)
        # Improvement: 500/1000 = 50%
        # XP: 50 * 0.5 = 25
        self.assertEqual(xp, 25.0)
    
    def test_improvement_with_max(self):
        """Test improvement XP with max cap."""
        context = SessionContext(
            score=3000,
            duration_seconds=60,
            is_new_high_score=True,
            user_multiplier=1.0,
            previous_high_score=1000
        )
        params = {"xp_per_percent": 0.5, "max_xp": 50.0}
        xp = self.strategy.calculate(context, params)
        # Improvement: 2000/1000 = 200%
        # XP would be 100, capped at 50
        self.assertEqual(xp, 50.0)
    
    def test_no_improvement(self):
        """Test no XP when not a high score."""
        context = SessionContext(
            score=800,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0,
            previous_high_score=1000
        )
        params = {"xp_per_percent": 0.5}
        xp = self.strategy.calculate(context, params)
        self.assertEqual(xp, 0.0)


class TestXPCalculator(unittest.TestCase):
    """Test XPCalculator orchestration."""
    
    def setUp(self):
        self.calculator = XPCalculator()
    
    def test_single_rule_calculation(self):
        """Test calculation with single rule."""
        context = SessionContext(
            score=1000,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        
        rules = [
            {
                'rule_id': 'test1',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': {'multiplier': 0.01},
                'priority': 10,
                'is_active': True
            }
        ]
        
        result = self.calculator.calculate_total_xp(rules, context)
        
        self.assertEqual(result['total_xp'], 10.0)
        self.assertEqual(result['base_xp'], 10.0)
        self.assertEqual(result['user_multiplier'], 1.0)
        self.assertEqual(len(result['rule_breakdown']), 1)
    
    def test_multiple_rules_calculation(self):
        """Test calculation with multiple rules."""
        context = SessionContext(
            score=1000,
            duration_seconds=300,
            is_new_high_score=True,
            user_multiplier=2.0
        )
        
        rules = [
            {
                'rule_id': 'test1',
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': {'multiplier': 0.01},
                'priority': 10,
                'is_active': True
            },
            {
                'rule_id': 'test2',
                'rule_name': 'Time Bonus',
                'rule_type': 'time_bonus',
                'parameters': {'xp_per_minute': 0.1, 'max_minutes': 10},
                'priority': 5,
                'is_active': True
            },
            {
                'rule_id': 'test3',
                'rule_name': 'High Score Bonus',
                'rule_type': 'high_score_bonus',
                'parameters': {'bonus_xp': 10.0},
                'priority': 15,
                'is_active': True
            }
        ]
        
        result = self.calculator.calculate_total_xp(rules, context)
        
        # Base XP: 10 (score) + 0.5 (time) + 10 (high score) = 20.5
        # Total XP: 20.5 * 2.0 = 41.0
        self.assertEqual(result['base_xp'], 20.5)
        self.assertEqual(result['total_xp'], 41.0)
        self.assertEqual(len(result['rule_breakdown']), 3)
    
    def test_inactive_rule_skipped(self):
        """Test that inactive rules are skipped."""
        context = SessionContext(
            score=1000,
            duration_seconds=60,
            is_new_high_score=False,
            user_multiplier=1.0
        )
        
        rules = [
            {
                'rule_id': 'test1',
                'rule_name': 'Active Rule',
                'rule_type': 'score_multiplier',
                'parameters': {'multiplier': 0.01},
                'priority': 10,
                'is_active': True
            },
            {
                'rule_id': 'test2',
                'rule_name': 'Inactive Rule',
                'rule_type': 'high_score_bonus',
                'parameters': {'bonus_xp': 100.0},
                'priority': 15,
                'is_active': False
            }
        ]
        
        result = self.calculator.calculate_total_xp(rules, context)
        
        # Only active rule should be applied
        self.assertEqual(result['total_xp'], 10.0)
        self.assertEqual(len(result['rule_breakdown']), 1)
    
    def test_default_calculation_fallback(self):
        """Test fallback to default calculation when no rules."""
        context = SessionContext(
            score=1000,
            duration_seconds=300,
            is_new_high_score=True,
            user_multiplier=1.5
        )
        
        result = self.calculator.calculate_total_xp([], context)
        
        # Default: 10 (score) + 0.5 (time) + 10 (high score) = 20.5
        # Total: 20.5 * 1.5 = 30.75
        self.assertEqual(result['base_xp'], 20.5)
        self.assertEqual(result['total_xp'], 30.75)


if __name__ == '__main__':
    unittest.main()
