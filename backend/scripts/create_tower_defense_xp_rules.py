"""
Script to add XP rules for Tower Defense 3D game
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_xp_rule, get_game_xp_rules

def create_tower_defense_xp_rules():
    """Create XP rules for Tower Defense 3D game."""
    game_id = 'tower-defense'
    
    print("=" * 60)
    print("🗼 CREATING XP RULES FOR TOWER DEFENSE 3D")
    print("=" * 60)
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"\n⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("\nExisting rules:")
        for rule in existing_rules:
            print(f"  • {rule['rule_name']} ({rule['rule_type']}) - Priority: {rule['priority']}")
        return
    
    print(f"\n📝 Creating rules for Tower Defense 3D...")
    
    # Base score multiplier rule
    create_xp_rule(
        game_id=game_id,
        rule_name="Base Score Multiplier",
        rule_type="score_multiplier",
        parameters={
            "multiplier": 0.02,
            "max_xp": 150.0
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
            "xp_per_minute": 0.2,
            "max_minutes": 15
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
            "bonus_xp": 15.0
        },
        priority=15
    )
    print("   ✅ High Score Bonus")
    
    # Wave Survivor Milestones
    create_xp_rule(
        game_id=game_id,
        rule_name="Wave Survivor Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 10000, "xp": 150},
                {"score": 7500, "xp": 100},
                {"score": 5000, "xp": 75},
                {"score": 3000, "xp": 50},
                {"score": 1500, "xp": 30},
                {"score": 750, "xp": 15},
                {"score": 300, "xp": 5}
            ]
        },
        priority=20
    )
    print("   ✅ Wave Survivor Milestones")
    
    # Strategic Defense Bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Strategic Defense Bonus",
        rule_type="achievement",
        parameters={
            "achievement_key": "strategic_defense",
            "bonus_xp": 25.0
        },
        priority=12
    )
    print("   ✅ Strategic Defense Bonus")
    
    # Win streak bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Win Streak Bonus",
        rule_type="win_streak",
        parameters={
            "base_xp": 5.0,
            "max_streak": 10,
            "xp_per_streak": 2.0
        },
        priority=8
    )
    print("   ✅ Win Streak Bonus")
    
    print("\n" + "=" * 60)
    print("✅ ALL XP RULES CREATED SUCCESSFULLY!")
    print("=" * 60)
    
    # Verify rules were created
    final_rules = get_game_xp_rules(game_id, active_only=True)
    print(f"\n📊 Total active rules: {len(final_rules)}")
    print("\nActive rules summary:")
    for rule in final_rules:
        print(f"  • {rule['rule_name']} (Priority: {rule['priority']})")

if __name__ == '__main__':
    try:
        create_tower_defense_xp_rules()
    except Exception as e:
        print(f"\n❌ Error creating XP rules: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
