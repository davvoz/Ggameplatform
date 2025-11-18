"""
Create XP rules for Space Clicker Phaser
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules

def create_space_clicker_phaser_xp_rules():
    """Create XP rules for Space Clicker Phaser"""
    game_id = "space-clicker-phaser"
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("   Skipping creation...")
        return
    
    print(f"\n📝 Creating XP rules for Space Clicker Phaser...")
    
    # Base score multiplier
    create_xp_rule(
        game_id=game_id,
        rule_name="Base Score Multiplier",
        rule_type="score_multiplier",
        parameters={
            "multiplier": 0.01,
            "max_xp": 100.0
        },
        priority=10
    )
    print("   ✅ Base Score Multiplier")
    
    # Time played bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Time Played Bonus",
        rule_type="time_bonus",
        parameters={
            "xp_per_minute": 0.1,
            "max_minutes": 10
        },
        priority=5
    )
    print("   ✅ Time Played Bonus")
    
    # High score bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="High Score Bonus",
        rule_type="high_score_bonus",
        parameters={
            "bonus_xp": 10.0
        },
        priority=15
    )
    print("   ✅ High Score Bonus")
    
    # Speed Clicker Bonus (high score in short time)
    create_xp_rule(
        game_id=game_id,
        rule_name="Speed Clicker Bonus",
        rule_type="combo",
        parameters={
            "min_score": 1000,
            "min_duration": 60,  # 1 minute
            "bonus_xp": 20.0
        },
        priority=20
    )
    print("   ✅ Speed Clicker Bonus")
    
    # Click milestones
    create_xp_rule(
        game_id=game_id,
        rule_name="Click Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 5000, "xp": 100},
                {"score": 2500, "xp": 50},
                {"score": 1000, "xp": 20},
                {"score": 500, "xp": 10},
                {"score": 100, "xp": 5}
            ]
        },
        priority=20
    )
    print("   ✅ Click Milestones")
    
    # Percentile improvement bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Improvement Bonus",
        rule_type="percentile_improvement",
        parameters={
            "xp_per_percent": 0.5,
            "max_xp": 50.0
        },
        priority=12
    )
    print("   ✅ Improvement Bonus")
    
    print("\n✅ All XP rules created successfully for Space Clicker Phaser!")

if __name__ == "__main__":
    print("=" * 60)
    print("Space Clicker Phaser - XP Rules Creation")
    print("=" * 60)
    create_space_clicker_phaser_xp_rules()
    print("=" * 60)
