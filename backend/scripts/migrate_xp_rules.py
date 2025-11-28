"""
Migration script to initialize XP rules for all games.
This script creates default XP calculation rules for existing games.

Run this script once after adding the XPRule model to the database.
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import (
    init_db, 
    get_all_games, 
    create_xp_rule, 
    get_game_xp_rules
)


def create_default_rules_for_game(game_id: str, game_title: str) -> None:
    """
    Create default XP rules for a game.
    
    Args:
        game_id: Game identifier
        game_title: Game title for logging
    """
    print(f"\n📝 Creating rules for: {game_title} ({game_id})")
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"   ⚠️  Rules already exist ({len(existing_rules)} rules), skipping...")
        return
    
    # Base score multiplier rule (applies to all games)
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
    
    # Time played bonus (applies to all games)
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
    
    # High score bonus (applies to all games)
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
    
    # Game-specific rules
    if game_id == 'snake':
        create_snake_rules(game_id)
    elif game_id == 'space-clicker':
        create_space_clicker_rules(game_id)
    elif game_id == 'bouncing-balls':
        create_bouncing_balls_rules(game_id)
    elif game_id == 'zombie-tower':
        create_zombie_tower_rules(game_id)
    elif game_id == 'pong':
        create_pong_rules(game_id)


def create_snake_rules(game_id: str) -> None:
    """Create Snake-specific XP rules."""
    # Milestone rewards for Snake
    create_xp_rule(
        game_id=game_id,
        rule_name="Snake Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 10000, "xp": 200},
                {"score": 5000, "xp": 100},
                {"score": 2500, "xp": 50},
                {"score": 1000, "xp": 25},
                {"score": 500, "xp": 10}
            ]
        },
        priority=20
    )
    print("   ✅ Snake Milestones")
    
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


def create_space_clicker_rules(game_id: str) -> None:
    """Create Space Clicker-specific XP rules."""
    # Fast clicker bonus (high score in short time)
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
                {"score": 500, "xp": 10}
            ]
        },
        priority=18
    )
    print("   ✅ Click Milestones")


def create_bouncing_balls_rules(game_id: str) -> None:
    """Create Bouncing Balls-specific XP rules."""
    # Survival bonus (score + time combo)
    create_xp_rule(
        game_id=game_id,
        rule_name="Survival Master",
        rule_type="combo",
        parameters={
            "min_score": 500,
            "min_duration": 120,  # 2 minutes
            "bonus_xp": 25.0
        },
        priority=20
    )
    print("   ✅ Survival Master")
    
    # Score thresholds
    create_xp_rule(
        game_id=game_id,
        rule_name="Ball Master Tiers",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 3000, "xp": 75},
                {"score": 1500, "xp": 40},
                {"score": 750, "xp": 20},
                {"score": 300, "xp": 10}
            ]
        },
        priority=18
    )
    print("   ✅ Ball Master Tiers")


def create_zombie_tower_rules(game_id: str) -> None:
    """Create Zombie Tower-specific XP rules."""
    # Wave completion bonuses
    create_xp_rule(
        game_id=game_id,
        rule_name="Wave Completion Tiers",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 10000, "xp": 150},
                {"score": 5000, "xp": 80},
                {"score": 2500, "xp": 40},
                {"score": 1000, "xp": 20},
                {"score": 500, "xp": 10}
            ]
        },
        priority=20
    )
    print("   ✅ Wave Completion Tiers")
    
    # Endurance bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Zombie Endurance",
        rule_type="combo",
        parameters={
            "min_score": 1000,
            "min_duration": 180,  # 3 minutes
            "bonus_xp": 30.0
        },
        priority=18
    )
    print("   ✅ Zombie Endurance")


def create_pong_rules(game_id: str) -> None:
    """Create Pong-specific XP rules."""
    # Victory tiers (Pong usually goes to 10 points)
    create_xp_rule(
        game_id=game_id,
        rule_name="Pong Victory Tiers",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 10, "xp": 50},  # Complete victory
                {"score": 7, "xp": 30},
                {"score": 5, "xp": 15},
                {"score": 3, "xp": 5}
            ]
        },
        priority=20
    )
    print("   ✅ Pong Victory Tiers")


def initialize_xp_rules():
    """Initialize XP rules for all games in the database."""
    print("=" * 60)
    print("🎮 XP RULES MIGRATION")
    print("=" * 60)
    
    # Ensure database and tables exist
    print("\n📦 Initializing database...")
    init_db()
    print("   ✅ Database initialized")
    
    # Get all games
    print("\n🔍 Loading games...")
    games = get_all_games()
    print(f"   Found {len(games)} game(s)")
    
    if not games:
        print("\n⚠️  No games found in database!")
        print("   Please register games first using register_game.bat")
        return
    
    # Create rules for each game
    print("\n🎯 Creating XP rules...")
    for game in games:
        create_default_rules_for_game(game['game_id'], game['title'])
    
    print("\n" + "=" * 60)
    print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("\n📊 Summary:")
    print(f"   • Total games processed: {len(games)}")
    
    total_rules = 0
    for game in games:
        rules = get_game_xp_rules(game['game_id'], active_only=False)
        total_rules += len(rules)
        print(f"   • {game['title']}: {len(rules)} rules")
    
    print(f"\n   🎯 Total XP rules created: {total_rules}")
    print("\n💡 Next steps:")
    print("   1. Start the backend: .\\start.bat")
    print("   2. View rules in database viewer")
    print("   3. Test XP calculation by playing games")
    print()


if __name__ == "__main__":
    try:
        initialize_xp_rules()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
