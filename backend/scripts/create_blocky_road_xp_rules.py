"""
Create XP rules for Blocky Road
Balanced for infinite runner gameplay with progressive difficulty
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules

def create_blocky_road_xp_rules():
    """Create XP rules for Blocky Road infinite runner"""
    game_id = "blocky-road"
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("   Skipping creation...")
        return
    
    print()
    print("=" * 70)
    print("  📊 BLOCKY ROAD - XP RULES CREATION")
    print("=" * 70)
    print()
    print(f"Creating XP rules for {game_id}...")
    print()
    
    # Rule 1: Base score multiplier (distance traveled)
    create_xp_rule(
        game_id=game_id,
        rule_name="Distance Traveled",
        rule_type="score_multiplier",
        parameters={
            "multiplier": 0.02,  # Higher than average for infinite runners
            "max_xp": 150.0
        },
        priority=10
    )
    print("   ✅ Distance Traveled (0.02 XP per point, max 150)")
    
    # Rule 2: Time survival bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Survival Time Bonus",
        rule_type="time_bonus",
        parameters={
            "xp_per_minute": 0.2,  # Rewards longer survival
            "max_minutes": 15
        },
        priority=8
    )
    print("   ✅ Survival Time Bonus (0.2 XP/min, max 15min)")
    
    # Rule 3: High score bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="New Record Bonus",
        rule_type="high_score_bonus",
        parameters={
            "bonus_xp": 15.0
        },
        priority=15
    )
    print("   ✅ New Record Bonus (15 XP)")
    
    # Rule 4: Distance milestones
    create_xp_rule(
        game_id=game_id,
        rule_name="Distance Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 500, "xp": 200},   # Epic run
                {"score": 300, "xp": 100},   # Great run
                {"score": 200, "xp": 60},    # Good run
                {"score": 100, "xp": 30},    # Decent run
                {"score": 50, "xp": 15},     # Getting started
                {"score": 20, "xp": 5}       # First steps
            ]
        },
        priority=20
    )
    print("   ✅ Distance Milestones (20-500 points)")
    
    # Rule 5: Quick start bonus (high score in short time)
    create_xp_rule(
        game_id=game_id,
        rule_name="Speed Runner Bonus",
        rule_type="combo",
        parameters={
            "min_score": 100,
            "min_duration": 120,  # 2 minutes
            "bonus_xp": 25.0
        },
        priority=18
    )
    print("   ✅ Speed Runner Bonus (100+ score in 2min = 25 XP)")
    
    # Rule 6: Endurance bonus (survive long time with decent score)
    create_xp_rule(
        game_id=game_id,
        rule_name="Endurance Master",
        rule_type="combo",
        parameters={
            "min_score": 200,
            "min_duration": 300,  # 5 minutes
            "bonus_xp": 50.0
        },
        priority=19
    )
    print("   ✅ Endurance Master (200+ score in 5min = 50 XP)")
    
    # Rule 7: Improvement bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Personal Best Improvement",
        rule_type="percentile_improvement",
        parameters={
            "xp_per_percent": 0.8,
            "max_xp": 80.0
        },
        priority=12
    )
    print("   ✅ Personal Best Improvement (0.8 XP per %, max 80)")
    
    print()
    print("=" * 70)
    print("✅ All 7 XP rules created successfully for Blocky Road!")
    print("=" * 70)
    print()
    print("Rule Summary:")
    print("  • Distance-based scoring rewards progress")
    print("  • Time bonuses encourage longer survival")
    print("  • Milestones provide clear goals")
    print("  • Combo bonuses reward skilled play")
    print("  • Improvement tracking motivates returning players")
    print()

if __name__ == "__main__":
    create_blocky_road_xp_rules()
