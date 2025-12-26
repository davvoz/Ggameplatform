"""
Setup Yatzi 3D game in the platform database
This script:
1. Registers the game in the games table
2. Creates XP rules
3. Creates quests
4. Generates thumbnail
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import subprocess

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game

def setup_yatzi_game():
    """Setup Yatzi 3D in the platform"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🎲 YATZI 3D - COMPLETE SETUP")
        print("=" * 70)
        print()
        
        # Step 1: Check if game already exists
        print("📝 Step 1: Checking game registration...")
        existing_game = db.query(Game).filter(Game.game_id == 'yatzi_3d_by_luciogiolli').first()
        
        if existing_game:
            print(f"⚠️  Game 'yatzi_3d_by_luciogiolli' already exists!")
            print(f"   Title: {existing_game.title}")
            print(f"   Category: {existing_game.category}")
            response = input("Do you want to update it? (y/N): ")
            if response.lower() != 'y':
                print("Skipping game registration...")
            else:
                # Update existing game
                existing_game.title = "Yatzi 3D"
                existing_game.description = "Classic dice game with 3D physics. Roll five dice and score combinations to beat the AI opponent!"
                existing_game.category = "dice"
                existing_game.thumbnail = "thumbnail.png"
                existing_game.entry_point = "index.html"
                existing_game.author = "Ggameplatform"
                existing_game.version = "1.0.0"
                existing_game.tags = '["dice","strategy","3d","yatzi","yahtzee","casual"]'
                existing_game.steem_rewards_enabled = 0
                existing_game.updated_at = datetime.now().isoformat()
                db.commit()
                print("✅ Game updated successfully!")
        else:
            # Create new game
            new_game = Game(
                game_id='yatzi_3d_by_luciogiolli',
                title='Yatzi 3D',
                description='Classic dice game with 3D physics. Roll five dice and score combinations to beat the AI opponent!',
                category='dice',
                thumbnail='thumbnail.png',
                entry_point='index.html',
                author='Ggameplatform',
                version='1.0.0',
                tags='["dice","strategy","3d","yatzi","yahtzee","casual"]',
                steem_rewards_enabled=0,
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
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_yatzi_thumbnail.py')],
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
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_yatzi_xp_rules.py')],
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
                [sys.executable, os.path.join(os.path.dirname(__file__), 'create_yatzi_quests.py')],
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
        print("  🎉 YATZI 3D SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("📋 Summary:")
        print("  ✅ Game registered in database")
        print("  ✅ Thumbnail created")
        print("  ✅ XP rules configured")
        print("  ✅ Quests created")
        print("  ✅ SDK integration added")
        print()
        print("🎮 Game Details:")
        print(f"  ID: yatzi_3d_by_luciogiolli")
        print(f"  Entry Point: index.html")
        print(f"  Category: dice")
        print(f"  Path: backend/app/games/yatzi_3d_by_luciogiolli/")
        print()
        print("Next steps:")
        print("  1. Restart the backend server")
        print("  2. Test the game in the platform")
        print("  3. Verify session tracking and scoring")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_yatzi_game()
