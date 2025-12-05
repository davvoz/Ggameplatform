"""
Fix Tower Defense game_id to match directory name
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import Game, XPRule, Leaderboard, GameSession
from sqlalchemy import text

def fix_tower_defense_id():
    """Update tower-defense to tower_defense to match directory name"""
    
    print("\n" + "=" * 60)
    print("🔧 FIXING TOWER DEFENSE GAME ID")
    print("=" * 60)
    
    with get_db_session() as session:
        try:
            # Use raw SQL to update
            print("\n🔄 Updating game_id in games table...")
            session.execute(text("UPDATE games SET game_id = 'tower_defense' WHERE game_id = 'tower-defense'"))
            
            print("🔄 Updating game_id in xp_rules table...")
            session.execute(text("UPDATE xp_rules SET game_id = 'tower_defense' WHERE game_id = 'tower-defense'"))
            
            print("🔄 Updating game_id in leaderboard table...")
            session.execute(text("UPDATE leaderboard SET game_id = 'tower_defense' WHERE game_id = 'tower-defense'"))
            
            print("🔄 Updating game_id in game_sessions table...")
            session.execute(text("UPDATE game_sessions SET game_id = 'tower_defense' WHERE game_id = 'tower-defense'"))
            
            session.commit()
            
            print("\n✅ Game ID updated successfully!")
            print(f"   New game_id: tower_defense")
            print("\n🎮 Play the game at:")
            print("   http://localhost:3000/#/play/tower_defense")
            
        except Exception as e:
            session.rollback()
            print(f"\n❌ Error during update: {e}")
            raise

if __name__ == '__main__':
    try:
        fix_tower_defense_id()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
