"""
Check leaderboard table records
"""
from app.database import get_db_session
from app.models import Leaderboard, GameSession, User

print("=" * 60)
print("  LEADERBOARD TABLE CHECK")
print("=" * 60)

with get_db_session() as session:
    # Count leaderboard entries
    count = session.query(Leaderboard).count()
    print(f"\n📊 Total leaderboard entries: {count}")
    
    if count > 0:
        print("\nLeaderboard entries:")
        entries = session.query(Leaderboard).all()
        for entry in entries:
            print(f"  - {entry.to_dict()}")
    else:
        print("\n⚠️  Leaderboard table is empty!")
    
    # Check game sessions (these could populate leaderboard)
    session_count = session.query(GameSession).filter(
        GameSession.ended_at != None
    ).count()
    print(f"\n🎮 Total completed game sessions: {session_count}")
    
    if session_count > 0:
        print("\nTop 5 game sessions by score:")
        from sqlalchemy import desc
        top_sessions = session.query(GameSession).filter(
            GameSession.ended_at != None
        ).order_by(desc(GameSession.score)).limit(5).all()
        
        for s in top_sessions:
            user = session.query(User).filter(User.user_id == s.user_id).first()
            username = user.username if user and user.username else f"anon_{s.user_id[-6:]}"
            print(f"  - Game: {s.game_id}, User: {username}, Score: {s.score}")

print("\n" + "=" * 60)
