"""
Test Completo di Tutte le Quest
Testa tutte le 8 quest riparate con l'utente user_421c14bf22e040f2
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db_session
from app.models import User, Quest, UserQuest, GameSession
from app.quest_tracker import track_quest_progress_for_login, track_quest_progress_for_session
import json

USER_ID = "user_421c14bf22e040f2"

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_login_streak(session):
    """Test login_streak quest"""
    print_section("TEST: Login 7 Consecutive Days")
    
    user = session.query(User).filter(User.user_id == USER_ID).first()
    quest = session.query(Quest).filter(Quest.quest_type == 'login_streak').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    print(f"   Streak attuale: {user.login_streak}")
    print(f"   Target: {quest.target_value} giorni")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")

def test_play_games_weekly(session):
    """Test play_games_weekly quest"""
    print_section("TEST: Complete 50 Games in a Week")
    
    quest = session.query(Quest).filter(Quest.quest_type == 'play_games_weekly').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    print(f"   Target: {quest.target_value} giochi")
    
    # Conta sessioni questa settimana
    from app.quest_tracker import QuestTracker
    tracker = QuestTracker(session)
    week_start = tracker._get_week_start_date()
    week_start_dt = datetime.strptime(week_start, '%Y-%m-%d')
    
    sessions_this_week = session.query(GameSession).filter(
        GameSession.user_id == USER_ID,
        GameSession.ended_at.isnot(None),
        GameSession.ended_at >= week_start_dt.isoformat()
    ).count()
    
    print(f"   Sessioni questa settimana: {sessions_this_week}")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")
        
        try:
            extra = json.loads(user_quest.extra_data) if user_quest.extra_data else {}
            if 'last_reset_week' in extra:
                print(f"   Ultimo reset: {extra['last_reset_week']}")
        except:
            pass

def test_play_time_daily(session):
    """Test play_time_daily quest"""
    print_section("TEST: Play 30 Minutes in One Day")
    
    quest = session.query(Quest).filter(Quest.quest_type == 'play_time_daily').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    print(f"   Target: {quest.target_value} secondi ({quest.target_value // 60} minuti)")
    
    # Conta tempo oggi
    from app.quest_tracker import QuestTracker
    from sqlalchemy import func
    tracker = QuestTracker(session)
    today = tracker._get_today_date()
    today_dt = datetime.strptime(today, '%Y-%m-%d')
    
    total_seconds_today = session.query(func.sum(GameSession.duration_seconds)).filter(
        GameSession.user_id == USER_ID,
        GameSession.ended_at.isnot(None),
        GameSession.ended_at >= today_dt.isoformat()
    ).scalar() or 0
    
    print(f"   Tempo giocato oggi: {int(total_seconds_today)} secondi ({int(total_seconds_today) // 60} minuti)")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")

def test_xp_daily(session):
    """Test xp_daily quest"""
    print_section("TEST: Earn 500 XP in One Day")
    
    quest = session.query(Quest).filter(Quest.quest_type == 'xp_daily').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    print(f"   Target: {quest.target_value} XP")
    
    # Conta XP oggi
    from app.quest_tracker import QuestTracker
    from sqlalchemy import func
    tracker = QuestTracker(session)
    today = tracker._get_today_date()
    today_dt = datetime.strptime(today, '%Y-%m-%d')
    
    total_xp_today = session.query(func.sum(GameSession.xp_earned)).filter(
        GameSession.user_id == USER_ID,
        GameSession.ended_at.isnot(None),
        GameSession.ended_at >= today_dt.isoformat()
    ).scalar() or 0
    
    print(f"   XP guadagnati oggi: {int(total_xp_today)}")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")

def test_xp_weekly(session):
    """Test xp_weekly quest"""
    print_section("TEST: Earn 2000 XP in One Week")
    
    quest = session.query(Quest).filter(Quest.quest_type == 'xp_weekly').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    print(f"   Target: {quest.target_value} XP")
    
    # Conta XP questa settimana
    from app.quest_tracker import QuestTracker
    from sqlalchemy import func
    tracker = QuestTracker(session)
    week_start = tracker._get_week_start_date()
    week_start_dt = datetime.strptime(week_start, '%Y-%m-%d')
    
    total_xp_week = session.query(func.sum(GameSession.xp_earned)).filter(
        GameSession.user_id == USER_ID,
        GameSession.ended_at.isnot(None),
        GameSession.ended_at >= week_start_dt.isoformat()
    ).scalar() or 0
    
    print(f"   XP guadagnati questa settimana: {int(total_xp_week)}")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")

def test_score_threshold(session):
    """Test score_threshold_per_game quest"""
    print_section("TEST: Complete 5 Games with Score ≥ X")
    
    quest = session.query(Quest).filter(Quest.quest_type == 'score_threshold_per_game').first()
    
    if not quest:
        print("❌ Quest non trovata")
        return
    
    print(f"✅ Quest: {quest.title}")
    
    try:
        config = json.loads(quest.config) if quest.config else {}
        min_score = config.get('min_score', 100)
        print(f"   Score minimo richiesto: {min_score}")
    except:
        min_score = 100
        print(f"   Score minimo richiesto: {min_score} (default)")
    
    print(f"   Target: {quest.target_value} giochi")
    
    user_quest = session.query(UserQuest).filter(
        UserQuest.user_id == USER_ID,
        UserQuest.quest_id == quest.quest_id
    ).first()
    
    if user_quest:
        print(f"   Progresso: {user_quest.current_progress}/{quest.target_value}")
        print(f"   Completata: {'✅' if user_quest.is_completed else '❌'}")

def main():
    print("=" * 70)
    print("  TEST COMPLETO SISTEMA QUEST")
    print("  Utente: user_421c14bf22e040f2")
    print("=" * 70)
    
    with get_db_session() as session:
        # Verifica utente
        user = session.query(User).filter(User.user_id == USER_ID).first()
        
        if not user:
            print(f"❌ Utente {USER_ID} non trovato!")
            return
        
        print(f"\n✅ Utente: {user.username or 'Anonymous'}")
        print(f"   Total XP: {user.total_xp_earned}")
        print(f"   Login streak: {user.login_streak}")
        
        # Test tutte le quest
        test_login_streak(session)
        test_play_games_weekly(session)
        test_play_time_daily(session)
        test_xp_daily(session)
        test_xp_weekly(session)
        test_score_threshold(session)
        
        # Riepilogo
        print_section("RIEPILOGO")
        
        user_quests = session.query(UserQuest).filter(
            UserQuest.user_id == USER_ID
        ).all()
        
        completed = sum(1 for uq in user_quests if uq.is_completed)
        in_progress = len(user_quests) - completed
        
        print(f"\n📊 Quest totali: {len(user_quests)}")
        print(f"   ✅ Completate: {completed}")
        print(f"   ⏳ In corso: {in_progress}")
        
        if completed > 0:
            print(f"\n🎉 Quest completate:")
            for uq in user_quests:
                if uq.is_completed:
                    quest = session.query(Quest).filter(Quest.quest_id == uq.quest_id).first()
                    if quest:
                        print(f"   • {quest.title}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
