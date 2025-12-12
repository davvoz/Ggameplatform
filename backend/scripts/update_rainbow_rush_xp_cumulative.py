"""
Update Rainbow Rush XP rules to use cumulative system without caps.
This script replaces old capped rules with new progressive cumulative rules.
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_db_session, create_xp_rule, get_game_xp_rules, update_xp_rule
from app.models import XPRule
import json

GAME_ID = 'rainbow-rush'

def disable_old_rules():
    """Disable all existing rules for rainbow-rush."""
    print("\n📋 Disabling old XP rules...")
    
    with get_db_session() as session:
        old_rules = session.query(XPRule).filter(
            XPRule.game_id == GAME_ID,
            XPRule.is_active == 1
        ).all()
        
        for rule in old_rules:
            rule.is_active = 0
            print(f"   ❌ Disabled: {rule.rule_name} ({rule.rule_type})")
        
        session.flush()
        print(f"   ✅ Disabled {len(old_rules)} rules")


def create_new_rules():
    """Create new cumulative XP rules (NO CAPS!)."""
    print("\n📝 Creating new cumulative XP rules...\n")
    
    rules = [
        {
            "rule_name": "Level Progression Bonus",
            "rule_type": "level_progression",
            "parameters": {
                "base_xp": 0.03,
                "increment": 0.0001
            },
            "priority": 100,
            "description": "Cumulative XP for each level. ~9 XP for 194 levels (excellent game). NO CAP!"
        },
        {
            "rule_name": "Score Performance",
            "rule_type": "score_multiplier",
            "parameters": {
                "multiplier": 0.0003  # 100k score = ~30 XP, balanced for excellent games
            },
            "priority": 80,
            "description": "Linear XP based on score: score × 0.0003. Higher scores = more XP. NO CAP!"
        },
        {
            "rule_name": "Survival Time",
            "rule_type": "time_bonus",
            "parameters": {
                "xp_per_minute": 0.15  # Reasonable bonus for time played
            },
            "priority": 60,
            "description": "XP for time survived: minutes × 0.15. Longer games = more XP. NO CAP!"
        },
        {
            "rule_name": "Personal Best Breakthrough",
            "rule_type": "absolute_improvement",
            "parameters": {
                "xp_per_point": 0.001
            },
            "priority": 70,
            "description": "Bonus for beating your record: (new_score - old_record) × 0.001. NO CAP!"
        },
        {
            "rule_name": "Distance Milestone",
            "rule_type": "distance_bonus",
            "parameters": {
                "milestone_distance": 500.0,
                "xp_per_milestone": 0.2
            },
            "priority": 50,
            "description": "Bonus XP for every 500m traveled. 0.2 XP per milestone. NO CAP!"
        }
    ]
    
    for rule_data in rules:
        create_xp_rule(
            game_id=GAME_ID,
            rule_name=rule_data["rule_name"],
            rule_type=rule_data["rule_type"],
            parameters=rule_data["parameters"],
            priority=rule_data["priority"]
        )
        print(f"   ✅ {rule_data['rule_name']}")
        print(f"      Type: {rule_data['rule_type']}")
        print(f"      Priority: {rule_data['priority']}")
        print(f"      {rule_data['description']}\n")


def verify_rules():
    """Verify the new rules are active."""
    print("\n" + "=" * 70)
    print("📊 VERIFICATION - Active Rainbow Rush XP Rules")
    print("=" * 70 + "\n")
    
    rules = get_game_xp_rules(GAME_ID, active_only=True)
    
    if not rules:
        print("❌ ERROR: No active rules found!")
        return False
    
    print(f"✅ Found {len(rules)} active rules:\n")
    
    for rule in rules:
        params = rule.get('parameters', {})
        print(f"🎯 {rule['rule_name']}")
        print(f"   Type: {rule['rule_type']}")
        print(f"   Priority: {rule['priority']}")
        print(f"   Parameters: {json.dumps(params, indent=6)}")
        print()
    
    return True


def show_example_calculation():
    """Show example XP calculations with the new system."""
    print("\n" + "=" * 70)
    print("💡 EXAMPLE CALCULATIONS")
    print("=" * 70 + "\n")
    
    examples = [
        {
            "name": "Quick Game (Beginner)",
            "score": 5000,
            "levels": 2,
            "distance": 600,
            "minutes": 3,
            "new_record": False
        },
        {
            "name": "Average Game",
            "score": 25000,
            "levels": 5,
            "distance": 2500,
            "minutes": 8,
            "new_record": False
        },
        {
            "name": "Great Game + New Record",
            "score": 100000,
            "levels": 10,
            "distance": 5000,
            "minutes": 15,
            "new_record": True,
            "improvement": 20000
        }
    ]
    
    for ex in examples:
        print(f"📊 {ex['name']}")
        print(f"   Score: {ex['score']:,} | Levels: {ex['levels']} | Distance: {ex['distance']}m | Time: {ex['minutes']}min")
        print()
        
        # Calculate each component
        level_xp = sum(0.03 + (i * 0.0001) for i in range(1, ex['levels'] + 1))
        score_xp = ex['score'] * 0.0003
        time_xp = ex['minutes'] * 0.15
        distance_xp = (ex['distance'] // 500) * 0.2
        improvement_xp = ex.get('improvement', 0) * 0.001 if ex['new_record'] else 0
        
        total_base = level_xp + score_xp + time_xp + distance_xp + improvement_xp
        total_with_multiplier = total_base * 1.1  # Example with 1.1x multiplier
        
        print(f"   ├─ Level Progression: +{level_xp:.2f} XP")
        print(f"   ├─ Score Performance: +{score_xp:.2f} XP")
        print(f"   ├─ Survival Time: +{time_xp:.2f} XP")
        print(f"   ├─ Distance Milestone: +{distance_xp:.2f} XP")
        if improvement_xp > 0:
            print(f"   ├─ Record Breakthrough: +{improvement_xp:.2f} XP")
        print(f"   ├─ BASE TOTAL: {total_base:.2f} XP")
        print(f"   └─ WITH 1.1x CUR8: {total_with_multiplier:.2f} XP ⭐")
        print()
    
    print("💡 NOTE: All rules are UNCAPPED - better performance = more XP!")
    print()


def main():
    """Main execution function."""
    print("\n" + "=" * 70)
    print("🌈 RAINBOW RUSH XP SYSTEM UPDATE")
    print("Cumulative Progressive System (NO CAPS)")
    print("=" * 70)
    
    try:
        # Step 1: Disable old rules
        disable_old_rules()
        
        # Step 2: Create new rules
        create_new_rules()
        
        # Step 3: Verify
        if not verify_rules():
            raise Exception("Verification failed")
        
        # Step 4: Show examples
        show_example_calculation()
        
        print("=" * 70)
        print("✅ RAINBOW RUSH XP RULES UPDATED SUCCESSFULLY!")
        print("=" * 70)
        print("\n🎮 The new system rewards:")
        print("   • Progressive level completion (more levels = exponentially more XP)")
        print("   • High scores without limits")
        print("   • Long survival times")
        print("   • Personal improvement")
        print("   • Distance traveled")
        print("\n💰 NO CAPS = Pro players get rewarded for excellence!")
        print()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
