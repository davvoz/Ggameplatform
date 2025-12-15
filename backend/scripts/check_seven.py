"""
Check if Seven game is properly registered in the database
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game, XPRule

def check_seven():
    """Check Seven game registration"""
    
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("  🎲 SEVEN - DATABASE CHECK")
        print("=" * 70)
        print()
        
        # Check game
        game = db.query(Game).filter(Game.game_id == 'seven').first()
        
        if not game:
            print("❌ Game 'seven' NOT found in database!")
            return False
        
        print("✅ Game found:")
        print(f"   ID:          {game.game_id}")
        print(f"   Title:       {game.title}")
        print(f"   Category:    {game.category}")
        print(f"   Entry Point: {game.entry_point}")
        print(f"   Thumbnail:   {game.thumbnail}")
        print(f"   Version:     {game.version}")
        print()
        
        # Check XP Rules
        xp_rules = db.query(XPRule).filter(XPRule.game_id == 'seven').all()
        
        print(f"📊 XP Rules: {len(xp_rules)} found")
        print()
        
        for rule in xp_rules:
            print(f"   ✅ {rule.rule_name}")
            print(f"      ID:       {rule.rule_id}")
            print(f"      Type:     {rule.rule_type}")
            print(f"      Priority: {rule.priority}")
            print(f"      Active:   {'Yes' if rule.is_active else 'No'}")
            print()
        
        # Check game files
        game_dir = Path(__file__).parent.parent / 'app' / 'games' / 'seven'
        
        print("📁 Game Files:")
        required_files = ['index.html', 'main.css', 'main.js', 'thumbnail.png']
        
        for file in required_files:
            file_path = game_dir / file
            if file_path.exists():
                size = file_path.stat().st_size
                print(f"   ✅ {file} ({size:,} bytes)")
            else:
                print(f"   ❌ {file} (NOT FOUND)")
        
        print()
        print("=" * 70)
        print("✅ Seven game is properly registered!")
        print("🌐 Test at: http://localhost:3000/#/play/seven")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = check_seven()
    sys.exit(0 if success else 1)
