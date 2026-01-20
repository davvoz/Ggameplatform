"""
Setup Space Shooter - Complete initialization script
This script:
1. Registers the game in the database
2. Creates XP rules
Formula: XP = (score / 100000) * level
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import create_xp_rule, get_game_xp_rules

    

def create_space_shooter_xp_rules():
    """Create XP rules for Space Shooter"""
    game_id = "space_shooter"
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("   Skipping creation...")
        return
    
    print()
    print("=" * 70)
    print("  🚀 SPACE SHOOTER - XP RULES CREATION")
    print("=" * 70)
    print()
    print(f"Creating XP rules for {game_id}...")
    print()
    
    # Rule: Level completion with score-based XP (logarithmic scaling)
    # Formula: (score / 10000) * (1 + log₆(level))
    create_xp_rule(
        game_id=game_id,
        rule_name="Level Completion Score",
        rule_type="level_score",
        parameters={
            "score_divisor": 10000,   # Divides score by 10000
            "log_base": 6             # Logarithmic scaling base 6
        },
        priority=10
    )
    print("   ✅ Level Completion Score (score/10000 * (1 + log₆(level)))")
    
    print()
    print("=" * 70)
    print("  ✅ XP RULES CREATED SUCCESSFULLY")
    print("=" * 70)
    print()
    print("Formula: XP = (score / 100000) * (1 + log₆(level))")
    print()
    print("Esempi:")
    print("  Level 1  → multiplier ≈ 1.0")
    print("  Level 6  → multiplier ≈ 2.0")
    print("  Level 36 → multiplier ≈ 3.0")
    print()

def main():
    """Main setup function."""
    print("\n" + "=" * 70)
    print("  🚀 SPACE SHOOTER - COMPLETE SETUP")
    print("=" * 70)
    
   
    
    # Step 2: Create XP rules
    create_space_shooter_xp_rules()
    
    print("\n" + "=" * 70)
    print("  ✅ SPACE SHOOTER SETUP COMPLETED")
    print("=" * 70)
    print()

if __name__ == "__main__":
    main()
