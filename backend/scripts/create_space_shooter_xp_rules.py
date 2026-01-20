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

from app.database import create_game, get_game_by_id, create_xp_rule, get_game_xp_rules

def register_game():
    """Register Space Shooter game."""
    print("\n" + "=" * 70)
    print("🎮 REGISTERING SPACE SHOOTER")
    print("=" * 70)
    
    game_data = {
        'gameId': 'space-shooter',
        'title': 'Space Shooter',
        'description': 'Un emozionante sparatutto spaziale! Affronta ondate di nemici, raccogli power-up e sopravvivi il più a lungo possibile. Progredisci attraverso i livelli e ottieni punteggi sempre più alti!',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': 'thumbnail.png',
        'entryPoint': 'index.html',
        'category': 'action',
        'tags': ['shooter', 'space', 'action', 'arcade', '2d'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'medium',
            'rating': 4.5,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'WASD/Arrow Keys + Mouse/Touch',
                'gameType': 'Space Shooter',
                'playtime': '5-15 minutes',
                'features': [
                    'Particle effects',
                    'Post-processing',
                    'Power-ups system',
                    'Progressive difficulty',
                    'Level-based progression',
                    'High score tracking'
                ]
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('space-shooter')
    if existing:
        print('✅ Game "Space Shooter" already exists in database')
        print('    Game ID: space-shooter')
        print('    Title:', existing['title'])
        return existing
    
    # Register the game
    try:
        created = create_game(game_data)
        print('✅ Game "Space Shooter" registered successfully')
        print('    Game ID: space-shooter')
        print('    Title:', game_data['title'])
        return created
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        import traceback
        traceback.print_exc()
        return None

def create_space_shooter_xp_rules():
    """Create XP rules for Space Shooter"""
    game_id = "space-shooter"
    
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
    
    # Step 1: Register game
    game = register_game()
    if not game:
        print("\n❌ Setup failed: Could not register game")
        return
    
    # Step 2: Create XP rules
    create_space_shooter_xp_rules()
    
    print("\n" + "=" * 70)
    print("  ✅ SPACE SHOOTER SETUP COMPLETED")
    print("=" * 70)
    print()

if __name__ == "__main__":
    main()
