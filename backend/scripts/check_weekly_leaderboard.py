"""
Verifica WEEKLY leaderboard
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import WeeklyLeaderboard, User
from sqlalchemy import desc

with get_db_session() as session:
    print("\n" + "="*80)
    print("VERIFICA WEEKLY LEADERBOARD - RAINBOW RUSH")
    print("="*80 + "\n")
    
    # Trova luciojolly
    user = session.query(User).filter(User.username.like('%lucio%')).first()
    
    print(f"👤 User: {user.username} ({user.user_id})\n")
    
    # Tutte le weekly entries per rainbow-rush
    weekly_entries = session.query(WeeklyLeaderboard).filter(
        WeeklyLeaderboard.user_id == user.user_id,
        WeeklyLeaderboard.game_id == 'rainbow-rush'
    ).order_by(desc(WeeklyLeaderboard.score)).all()
    
    print(f"📅 Weekly Leaderboard Entries: {len(weekly_entries)}\n")
    
    for entry in weekly_entries:
        print(f"Week: {entry.week_start} - {entry.week_end}")
        print(f"Score: {entry.score}")
        print(f"Rank: {entry.rank}")
        print(f"Created: {entry.created_at}")
        print(f"Updated: {entry.updated_at}")
        print("-" * 80)
    
    # Settimana corrente
    from app.leaderboard_repository import LeaderboardRepository
    lb_repo = LeaderboardRepository(session)
    week_start, week_end = lb_repo.get_current_week()
    
    print(f"\n🗓️  SETTIMANA CORRENTE: {week_start} - {week_end}\n")
    
    current_week = session.query(WeeklyLeaderboard).filter(
        WeeklyLeaderboard.user_id == user.user_id,
        WeeklyLeaderboard.game_id == 'rainbow-rush',
        WeeklyLeaderboard.week_start == week_start
    ).first()
    
    if current_week:
        print(f"✅ Entry settimana corrente trovata:")
        print(f"   Score: {current_week.score}")
        print(f"   Rank: {current_week.rank}")
    else:
        print("❌ Nessuna entry per la settimana corrente!")
