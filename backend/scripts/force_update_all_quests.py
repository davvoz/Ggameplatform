#!/usr/bin/env python3
"""
Script per forzare l'aggiornamento di TUTTE le quest problematiche
Aggiorna: login_after_24h, login_streak, leaderboard_top, play_games_weekly, 
         play_time_daily, xp_daily, xp_weekly, play_time_cumulative
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db
from app.models import User, Quest, UserQuest, GameSession, WeeklyLeaderboard
from app.level_system import LevelSystem
from sqlalchemy import func
from datetime import datetime, timedelta
import json

def force_update_all_quests():
    """Forza l'aggiornamento di tutte le quest."""
    
    print("\n" + "="*70)
    print("🔄 AGGIORNAMENTO FORZATO TUTTE LE QUEST")
    print("="*70)
    
    db = next(get_db())
    
    try:
        # Ottieni tutti gli utenti registrati
        users = db.query(User).filter(User.is_anonymous == 0).all()
        print(f"\n📊 Trovati {len(users)} utenti registrati")
        
        stats = {
            'users_processed': 0,
            'quests_updated': 0,
            'quests_completed': 0,
            'errors': 0
        }
        
        # Tipi di quest da aggiornare
        quest_types_to_update = [
            'login_after_24h', 
            'login_streak', 
            'leaderboard_top',
            'play_games_weekly',
            'play_time_daily',
            'xp_daily',
            'xp_weekly',
            'play_time_cumulative',
            'reach_level'
        ]
        
        # Ottieni le quest da aggiornare
        quests = db.query(Quest).filter(
            Quest.quest_type.in_(quest_types_to_update),
            Quest.is_active == 1
        ).all()
        
        print(f"📊 Trovate {len(quests)} quest da aggiornare")
        
        # Calcoli comuni per efficienza
        today = datetime.utcnow().date()
        today_str = today.isoformat()
        today_start = datetime.fromisoformat(today_str + 'T00:00:00')
        week_start_date = today - timedelta(days=today.weekday())
        week_start_str = week_start_date.isoformat()
        week_start_dt = datetime.fromisoformat(week_start_str + 'T00:00:00')
        
        for user in users:
            print(f"\n{'─'*70}")
            print(f"👤 {user.username} (Level {LevelSystem.calculate_level_from_xp(user.total_xp_earned or 0)})")
            
            try:
                for quest in quests:
                    # Ottieni o crea user_quest
                    user_quest = db.query(UserQuest).filter(
                        UserQuest.user_id == user.user_id,
                        UserQuest.quest_id == quest.quest_id
                    ).first()
                    
                    if not user_quest:
                        user_quest = UserQuest(
                            user_id=user.user_id,
                            quest_id=quest.quest_id,
                            current_progress=0,
                            is_completed=0,
                            is_claimed=0,
                            started_at=datetime.utcnow().isoformat(),
                            extra_data='{}'
                        )
                        db.add(user_quest)
                        db.flush()
                    
                    # Skip se già completata e reclamata
                    if user_quest.is_completed and user_quest.is_claimed:
                        continue
                    
                    old_progress = user_quest.current_progress
                    new_progress = 0
                    
                    # Calcola il progresso in base al tipo
                    if quest.quest_type == 'login_after_24h':
                        if user.created_at and user.last_login:
                            try:
                                created = datetime.fromisoformat(user.created_at.replace('Z', '+00:00').replace('+00:00', ''))
                                last_login = datetime.fromisoformat(user.last_login.replace('Z', '+00:00').replace('+00:00', ''))
                                time_diff = last_login - created
                                new_progress = 1 if time_diff >= timedelta(hours=24) else 0
                            except:
                                new_progress = 0
                    
                    elif quest.quest_type == 'login_streak':
                        new_progress = user.login_streak or 0
                    
                    elif quest.quest_type == 'leaderboard_top':
                        entry = db.query(WeeklyLeaderboard).filter(
                            WeeklyLeaderboard.user_id == user.user_id,
                            WeeklyLeaderboard.week_start == week_start_str
                        ).first()
                        new_progress = 1 if entry and entry.weekly_rank <= quest.target_value else 0
                    
                    elif quest.quest_type == 'play_games_weekly':
                        count = db.query(func.count(GameSession.session_id)).filter(
                            GameSession.user_id == user.user_id,
                            GameSession.started_at >= week_start_dt.isoformat()
                        ).scalar()
                        new_progress = count or 0
                        # Aggiorna extra_data
                        user_quest.extra_data = json.dumps({"last_reset_week": week_start_str})
                    
                    elif quest.quest_type == 'play_time_daily':
                        total = db.query(func.sum(GameSession.duration_seconds)).filter(
                            GameSession.user_id == user.user_id,
                            GameSession.started_at >= today_start.isoformat()
                        ).scalar()
                        new_progress = int(total or 0)
                        # Aggiorna extra_data
                        user_quest.extra_data = json.dumps({"last_reset_date": today_str})
                    
                    elif quest.quest_type == 'xp_daily':
                        total = db.query(func.sum(GameSession.xp_earned)).filter(
                            GameSession.user_id == user.user_id,
                            GameSession.started_at >= today_start.isoformat()
                        ).scalar()
                        new_progress = int(total or 0)
                        # Aggiorna extra_data
                        user_quest.extra_data = json.dumps({"last_reset_date": today_str})
                    
                    elif quest.quest_type == 'xp_weekly':
                        total = db.query(func.sum(GameSession.xp_earned)).filter(
                            GameSession.user_id == user.user_id,
                            GameSession.started_at >= week_start_dt.isoformat()
                        ).scalar()
                        new_progress = int(total or 0)
                        # Aggiorna extra_data
                        user_quest.extra_data = json.dumps({"last_reset_week": week_start_str})
                    
                    elif quest.quest_type == 'play_time_cumulative':
                        total = db.query(func.sum(GameSession.duration_seconds)).filter(
                            GameSession.user_id == user.user_id
                        ).scalar()
                        new_progress = int(total or 0)
                    
                    elif quest.quest_type == 'reach_level':
                        new_progress = LevelSystem.calculate_level_from_xp(user.total_xp_earned or 0)
                    
                    # Aggiorna il progresso
                    user_quest.current_progress = new_progress
                    
                    # Verifica completamento
                    was_completed = user_quest.is_completed
                    should_be_completed = new_progress >= quest.target_value
                    
                    if should_be_completed and not was_completed:
                        user_quest.is_completed = 1
                        user_quest.completed_at = datetime.utcnow().isoformat()
                        stats['quests_completed'] += 1
                        print(f"   ✅ {quest.title}: {old_progress} → {new_progress} COMPLETATA!")
                    elif not should_be_completed and was_completed:
                        user_quest.is_completed = 0
                        user_quest.completed_at = None
                        print(f"   🔄 {quest.title}: {old_progress} → {new_progress} RESET")
                    elif new_progress != old_progress:
                        print(f"   📝 {quest.title}: {old_progress} → {new_progress}")
                    
                    if new_progress != old_progress:
                        stats['quests_updated'] += 1
                
                stats['users_processed'] += 1
                db.commit()
                
            except Exception as e:
                print(f"   ❌ Errore: {e}")
                stats['errors'] += 1
                db.rollback()
        
        # Statistiche finali
        print(f"\n{'='*70}")
        print("📊 STATISTICHE FINALI")
        print(f"{'='*70}")
        print(f"  👥 Utenti processati:     {stats['users_processed']}/{len(users)}")
        print(f"  📝 Quest aggiornate:      {stats['quests_updated']}")
        print(f"  ✅ Quest completate:      {stats['quests_completed']}")
        print(f"  ❌ Errori:                {stats['errors']}")
        print(f"{'='*70}")
        
        if stats['errors'] == 0:
            print("\n✅ Aggiornamento completato con successo!")
        else:
            print(f"\n⚠️  Completato con {stats['errors']} errori")
        
    except Exception as e:
        print(f"\n❌ Errore generale: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n⚠️  Questo script aggiornerà TUTTE le quest problematiche!")
    response = input("\n❓ Vuoi procedere? (s/n): ")
    
    if response.lower() in ['s', 'si', 'y', 'yes']:
        force_update_all_quests()
    else:
        print("\n❌ Operazione annullata")
