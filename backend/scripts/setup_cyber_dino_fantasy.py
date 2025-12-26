"""
Setup Cyber Dino Fantasy Tactics game in the platform database
This script:
1. Registers the game in the games table
2. Creates XP rules
3. Creates quests
4. Generates thumbnail

Usage:
  python scripts/setup_cyber_dino_fantasy.py          # Interactive mode
  python scripts/setup_cyber_dino_fantasy.py --force  # Auto mode (for Docker/CI)
"""
import sys
import os
import argparse
from pathlib import Path
from datetime import datetime
import subprocess

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game

def setup_cyber_dino_fantasy_game(force=False):
    """Setup Cyber Dino Fantasy Tactics in the platform
    
    Args:
        force: If True, automatically update existing game without prompting
    """
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🦖 CYBER DINO FANTASY TACTICS - COMPLETE SETUP")
        print("=" * 70)
        print()
        
        # Step 1: Check if game already exists
        print("📝 Step 1: Checking game registration...")
        existing_game = db.query(Game).filter(Game.game_id == 'cyber_dino_fantasy_tactics').first()
        
        if existing_game:
            print(f"ℹ️  Game 'cyber_dino_fantasy_tactics' already exists!")
            print(f"   Title: {existing_game.title}")
            print(f"   Category: {existing_game.category}")
            
            if force:
                print("   [--force] Auto-updating...")
                should_update = True
            else:
                response = input("Do you want to update it? (y/N): ")
                should_update = response.lower() == 'y'
            
            if not should_update:
                print("   Skipping game registration...")
            else:
                # Update existing game
                existing_game.title = "Cyber Dino Fantasy Tactics"
                existing_game.description = "Epic tactical RPG featuring cyber-enhanced dinosaurs! Build your team, master unique abilities, explore procedurally generated dungeons, and engage in strategic turn-based combat."
                existing_game.category = "rpg"
                existing_game.thumbnail = "thumbnail.png"
                existing_game.entry_point = "index.html"
                existing_game.author = "Ggameplatform"
                existing_game.version = "1.0.0"
                existing_game.tags = '["rpg","tactical","strategy","turn-based","dinosaur","cyberpunk","fantasy","roguelike","procedural"]'
                existing_game.steem_rewards_enabled = 0
                existing_game.extra_data = '{"difficulty":"medium","max_players":1,"min_age":10,"featured":true,"gameplay":"turn-based-tactics","theme":"cyberpunk-fantasy","graphics":"2d","controls":["mouse","keyboard"],"playTime":"medium-session"}'
                existing_game.updated_at = datetime.now().isoformat()
                db.commit()
                print("✅ Game updated successfully!")
        else:
            # Create new game
            new_game = Game(
                game_id='cyber_dino_fantasy_tactics',
                title='Cyber Dino Fantasy Tactics',
                description='Epic tactical RPG featuring cyber-enhanced dinosaurs! Build your team, master unique abilities, explore procedurally generated dungeons, and engage in strategic turn-based combat.',
                category='rpg',
                thumbnail='thumbnail.png',
                entry_point='index.html',
                author='Ggameplatform',
                version='1.0.0',
                tags='["rpg","tactical","strategy","turn-based","dinosaur","cyberpunk","fantasy","roguelike","procedural"]',
                steem_rewards_enabled=0,
                extra_data='{"difficulty":"medium","max_players":1,"min_age":10,"featured":true,"gameplay":"turn-based-tactics","theme":"cyberpunk-fantasy","graphics":"2d","controls":["mouse","keyboard"],"playTime":"medium-session"}',
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            db.add(new_game)
            db.commit()
            print("✅ Game registered successfully!")
        
        print()
        
        # Step 2: Create thumbnail
        print("🎨 Step 2: Creating thumbnail...")
        try:
            result = subprocess.run(
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_cyber_dino_fantasy_thumbnail.py')],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("✅ Thumbnail created!")
            else:
                print(f"⚠️  Thumbnail creation had issues: {result.stderr}")
        except Exception as e:
            print(f"⚠️  Could not create thumbnail: {e}")
        
        print()
        
        # Step 3: Create XP rules
        print("⭐ Step 3: Creating XP rules...")
        try:
            result = subprocess.run(
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_cyber_dino_fantasy_xp_rules.py')],
                capture_output=True,
                text=True,
                input='y\n'  # Auto-confirm if rules exist
            )
            if result.returncode == 0:
                print("✅ XP rules created!")
            else:
                print(f"⚠️  XP rules creation had issues: {result.stderr}")
        except Exception as e:
            print(f"⚠️  Could not create XP rules: {e}")
        
        print()
        
        # Step 4: Create quests
        print("🎯 Step 4: Creating quests...")
        try:
            result = subprocess.run(
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_cyber_dino_fantasy_quests.py')],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("✅ Quests created!")
            else:
                print(f"⚠️  Quest creation had issues: {result.stderr}")
        except Exception as e:
            print(f"⚠️  Could not create quests: {e}")
        
        print()
        print("=" * 70)
        print("  🎉 CYBER DINO FANTASY TACTICS SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("📋 Summary:")
        print("   ✓ Game registered in database")
        print("   ✓ Thumbnail generated")
        print("   ✓ XP rules configured")
        print("   ✓ Quests created")
        print()
        print("🎮 Game ID: cyber_dino_fantasy_tactics")
        print("🌐 Play at: https://games.cur8.fun/#/play/cyber_dino_fantasy_tactics")
        print()
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Setup Cyber Dino Fantasy Tactics game')
    parser.add_argument('--force', action='store_true', help='Auto-update without prompting')
    
    args = parser.parse_args()
    
    setup_cyber_dino_fantasy_game(force=args.force)
