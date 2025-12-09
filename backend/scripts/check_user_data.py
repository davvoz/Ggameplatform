#!/usr/bin/env python3
"""
Script per verificare i dati di un utente specifico
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db
from app.models import User, GameSession, UserQuest, Quest
from sqlalchemy import func
from datetime import datetime, timedelta

def check_user_data(username):
    """Verifica i dati di un utente."""
    
    db = next(get_db())
    
    try:
        # Trova l'utente
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            print(f"❌ Utente '{username}' non trovato!")
            return
        
        print(f"\n{'='*70}")
        print(f"👤 DATI UTENTE: {user.username}")
        print(f"{'='*70}")
        print(f"  User ID: {user.user_id}")
        print(f"  Level: {user.total_xp_earned or 0} XP")
        print(f"  Login Streak: {user.login_streak or 0}")
        print(f"  Last Login: {user.last_login}")
        print(f"  Created: {user.created_at}")
        
        # Conta sessioni totali
        total_sessions = db.query(func.count(GameSession.session_id)).filter(
            GameSession.user_id == user.user_id
        ).scalar()
        
        print(f"\n📊 SESSIONI DI GIOCO:")
        print(f"  Totale sessioni: {total_sessions}")
        
        if total_sessions > 0:
            # Sessioni per gioco
            sessions_by_game = db.query(
                GameSession.game_id,
                func.count(GameSession.session_id).label('count'),
                func.max(GameSession.score).label('max_score'),
                func.sum(GameSession.duration_seconds).label('total_time'),
                func.sum(GameSession.xp_earned).label('total_xp')
            ).filter(
                GameSession.user_id == user.user_id
            ).group_by(GameSession.game_id).all()
            
            for game_id, count, max_score, total_time, total_xp in sessions_by_game:
                print(f"\n  🎮 {game_id}:")
                print(f"     Sessioni: {count}")
                print(f"     Max Score: {max_score}")
                print(f"     Tempo totale: {(total_time or 0) / 60:.1f} minuti")
                print(f"     XP totale: {total_xp}")
            
            # Sessioni oggi
            today = datetime.utcnow().date().isoformat()
            today_start = datetime.fromisoformat(today + 'T00:00:00')
            
            today_sessions = db.query(func.count(GameSession.session_id)).filter(
                GameSession.user_id == user.user_id,
                GameSession.started_at >= today_start.isoformat()
            ).scalar()
            
            today_xp = db.query(func.sum(GameSession.xp_earned)).filter(
                GameSession.user_id == user.user_id,
                GameSession.started_at >= today_start.isoformat()
            ).scalar()
            
            today_time = db.query(func.sum(GameSession.duration_seconds)).filter(
                GameSession.user_id == user.user_id,
                GameSession.started_at >= today_start.isoformat()
            ).scalar()
            
            print(f"\n  📅 OGGI ({today}):")
            print(f"     Sessioni: {today_sessions}")
            print(f"     XP guadagnato: {today_xp or 0}")
            print(f"     Tempo giocato: {(today_time or 0) / 60:.1f} minuti")
            
            # Sessioni questa settimana
            today_date = datetime.utcnow().date()
            week_start = (today_date - timedelta(days=today_date.weekday())).isoformat()
            week_start_dt = datetime.fromisoformat(week_start + 'T00:00:00')
            
            week_sessions = db.query(func.count(GameSession.session_id)).filter(
                GameSession.user_id == user.user_id,
                GameSession.started_at >= week_start_dt.isoformat()
            ).scalar()
            
            week_xp = db.query(func.sum(GameSession.xp_earned)).filter(
                GameSession.user_id == user.user_id,
                GameSession.started_at >= week_start_dt.isoformat()
            ).scalar()
            
            print(f"\n  📆 QUESTA SETTIMANA (da {week_start}):")
            print(f"     Sessioni: {week_sessions}")
            print(f"     XP guadagnato: {week_xp or 0}")
        
        # Quest dell'utente
        user_quests = db.query(UserQuest, Quest).join(Quest).filter(
            UserQuest.user_id == user.user_id
        ).all()
        
        print(f"\n🎯 USER QUESTS ({len(user_quests)} totali):")
        
        for uq, quest in user_quests:
            status = "✅ Completata" if uq.is_completed else "🔄 In corso"
            claimed = " (Reclamata)" if uq.is_claimed else ""
            print(f"\n  {status}{claimed}: {quest.title}")
            print(f"     Tipo: {quest.quest_type}")
            print(f"     Progresso: {uq.current_progress}/{quest.target_value}")
            print(f"     Extra data: {uq.extra_data}")
        
    except Exception as e:
        print(f"❌ Errore: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = input("Inserisci username: ")
    
    check_user_data(username)
