"""
Script to add XP rules for Rainbow Rush game
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules

def create_rainbow_rush_xp_rules():
    """Create XP rules for Rainbow Rush game."""
    game_id = 'rainbow-rush'
    
    print("=" * 60)
    print("🌈 CREATING XP RULES FOR RAINBOW RUSH")
    print("=" * 60)
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"\n⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("\nExisting rules:")
        for rule in existing_rules:
            print(f"  • {rule['rule_name']} ({rule['rule_type']}) - Priority: {rule['priority']}")
        return
    
    print(f"\n📝 Creating rules for Rainbow Rush...")
    
    # Base score multiplier rule
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
    
    # Rainbow Rush specific - Color Master bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Color Master Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 5000, "xp": 100},
                {"score": 2500, "xp": 50},
                {"score": 1000, "xp": 25},
                {"score": 500, "xp": 10},
                {"score": 200, "xp": 5}
            ]
        },
        priority=20
    )
    print("   ✅ Color Master Milestones")
    
    # Rainbow Rush specific - Combo streak bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Rainbow Combo Master",
        rule_type="combo",
        parameters={
            "min_score": 1000,
            "min_duration": 90,  # 1.5 minutes
            "bonus_xp": 20.0
        },
        priority=18
    )
    print("   ✅ Rainbow Combo Master")
    
    # Improvement bonus
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
    
    print("\n" + "=" * 60)
    print("✅ RAINBOW RUSH XP RULES CREATED!")
    print("=" * 60)
    
    # Verify
    rules = get_game_xp_rules(game_id, active_only=False)
    print(f"\n📊 Total rules created: {len(rules)}")
    print("\nRules summary:")
    for rule in rules:
        print(f"  • {rule['rule_name']} ({rule['rule_type']}) - Priority: {rule['priority']}")
    print()

if __name__ == "__main__":
    try:
        create_rainbow_rush_xp_rules()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
