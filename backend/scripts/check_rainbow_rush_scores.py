"""
Script to check Rainbow Rush scores in both game_sessions and rainbow_rush_game_sessions
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import GameSession
from app.games.rainbow_rush_be.models import RainbowRushGameSession
from sqlalchemy import desc

def check_scores():
    db = SessionLocal()
    try:
        print("\n" + "="*80)
        print("RAINBOW RUSH SCORES CHECK")
        print("="*80)
        
        # Get user_id from AuthManager or use default
        # For now, let's check the latest sessions
        
        # Check game_sessions table (platform sessions)
        print("\n📊 Platform Sessions (game_sessions table):")
        print("-" * 80)
        platform_sessions = db.query(GameSession).filter(
            GameSession.game_id == 'rainbow-rush'
        ).order_by(desc(GameSession.ended_at)).limit(10).all()
        
        if platform_sessions:
            for session in platform_sessions:
                print(f"Session ID: {session.session_id}")
                print(f"  User: {session.user_id}")
                print(f"  Score: {session.score}")
                print(f"  Started: {session.started_at}")
                print(f"  Ended: {session.ended_at}")
                print(f"  Duration: {session.duration_seconds}s")
                print(f"  XP Earned: {session.xp_earned}")
                print()
        else:
            print("  No platform sessions found")
        
        # Check rainbow_rush_game_sessions table (game-specific sessions)
        print("\n🎮 Rainbow Rush Sessions (rainbow_rush_game_sessions table):")
        print("-" * 80)
        rr_sessions = db.query(RainbowRushGameSession).order_by(
            desc(RainbowRushGameSession.ended_at)
        ).limit(10).all()
        
        if rr_sessions:
            for session in rr_sessions:
                # Parse current_stats
                import json
                stats = {}
                if session.current_stats:
                    try:
                        stats = json.loads(session.current_stats) if isinstance(session.current_stats, str) else session.current_stats
                    except:
                        pass
                
                score = stats.get('score', 0)
                
                print(f"Session ID: {session.session_id}")
                print(f"  User: {session.user_id}")
                print(f"  Score (from stats): {score}")
                print(f"  Current Stats: {stats}")
                print(f"  Started: {session.started_at}")
                print(f"  Ended: {session.ended_at}")
                print(f"  Level: {session.level_id}")
                print()
        else:
            print("  No Rainbow Rush sessions found")
        
        print("="*80)
        
    finally:
        db.close()

if __name__ == "__main__":
    check_scores()
