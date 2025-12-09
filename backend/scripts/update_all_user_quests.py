#!/usr/bin/env python3
"""
Script per aggiornare e correggere tutte le user quests
Ricalcola il progresso di tutte le quest attive per tutti gli utenti
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import get_db
from app.models import User, Quest, UserQuest
from datetime import datetime
import json

def update_all_user_quests():
    """Aggiorna tutte le user quests per tutti gli utenti."""
    
    print("\n" + "="*70)
    print("🔄 AGGIORNAMENTO MASSIVO USER QUESTS")
    print("="*70)
    
    db = next(get_db())
    
    try:
        # Ottieni tutti gli utenti registrati
        users = db.query(User).filter(User.is_anonymous == 0).all()
        
        print(f"\n📊 Trovati {len(users)} utenti registrati")
        
        # Ottieni tutte le quest attive
        active_quests = db.query(Quest).filter(Quest.is_active == 1).all()
        
        print(f"📊 Trovate {len(active_quests)} quest attive")
        
        # Statistiche
        stats = {
            'users_processed': 0,
            'quests_checked': 0,
            'quests_created': 0,
            'quests_updated': 0,
            'quests_completed': 0,
            'errors': 0
        }
        
        # Processa ogni utente
        for user in users:
            print(f"\n{'─'*70}")
            print(f"👤 Processando utente: {user.username} ({user.user_id})")
            
            try:
                # Controlla tutte le quest attive
                for quest in active_quests:
                    print(f"\n  🎯 Quest: {quest.title} (ID: {quest.quest_id}, Tipo: {quest.quest_type})")
                    stats['quests_checked'] += 1
                    
                    # Ottieni o crea la user_quest
                    user_quest = db.query(UserQuest).filter(
                        UserQuest.user_id == user.user_id,
                        UserQuest.quest_id == quest.quest_id
                    ).first()
                    
                    if not user_quest:
                        # Crea nuova user_quest
                        now = datetime.utcnow().isoformat()
                        user_quest = UserQuest(
                            user_id=user.user_id,
                            quest_id=quest.quest_id,
                            current_progress=0,
                            is_completed=0,
                            is_claimed=0,
                            started_at=now,
                            extra_data='{}'
                        )
                        db.add(user_quest)
                        stats['quests_created'] += 1
                        print(f"     ✨ CREATA nuova user_quest")
                    else:
                        # Parse extra_data
                        try:
                            extra_data = json.loads(user_quest.extra_data) if user_quest.extra_data else {}
                        except:
                            extra_data = {}
                        
                        old_progress = user_quest.current_progress
                        print(f"     📍 Stato attuale: Progresso={old_progress}/{quest.target_value}, Completato={bool(user_quest.is_completed)}, Reclamato={bool(user_quest.is_claimed)}")
                        
                        # Verifica se è già completata e reclamata
                        if user_quest.is_completed and user_quest.is_claimed:
                            print(f"     ✓ Già completata e reclamata, skip")
                            continue
                        
                        # Calcola il progresso basandosi sul tipo
                        new_progress = calculate_progress(db, user, quest, extra_data)
                        
                        # Verifica se è stata completata
                        newly_completed = False
                        if new_progress >= quest.target_value and not user_quest.is_completed:
                            user_quest.is_completed = 1
                            user_quest.completed_at = datetime.utcnow().isoformat()
                            newly_completed = True
                            stats['quests_completed'] += 1
                            print(f"     ✅ COMPLETATA! ({new_progress}/{quest.target_value})")
                        
                        # Aggiorna progresso
                        if new_progress != old_progress:
                            user_quest.current_progress = new_progress
                            stats['quests_updated'] += 1
                            print(f"     📝 AGGIORNATA: {old_progress} → {new_progress}")
                        elif newly_completed:
                            stats['quests_updated'] += 1
                        else:
                            print(f"     ✓ Già aggiornata")
                
                stats['users_processed'] += 1
                db.commit()
                
            except Exception as e:
                print(f"\n  ❌ Errore processando utente {user.username}: {e}")
                import traceback
                traceback.print_exc()
                stats['errors'] += 1
                db.rollback()
        
        # Stampa statistiche finali
        print(f"\n{'='*70}")
        print("📊 STATISTICHE FINALI")
        print(f"{'='*70}")
        print(f"  👥 Utenti processati:     {stats['users_processed']}/{len(users)}")
        print(f"  🔍 Quest controllate:     {stats['quests_checked']}")
        print(f"  ✨ Quest create:          {stats['quests_created']}")
        print(f"  📝 Quest aggiornate:      {stats['quests_updated']}")
        print(f"  ✅ Quest completate:      {stats['quests_completed']}")
        print(f"  ❌ Errori:                {stats['errors']}")
        print(f"{'='*70}")
        
        if stats['errors'] == 0:
            print("\n✅ Aggiornamento completato con successo!")
        else:
            print(f"\n⚠️  Aggiornamento completato con {stats['errors']} errori")
        
    except Exception as e:
        print(f"\n❌ Errore generale: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def calculate_progress(db, user, quest, extra_data):
    """Calcola il progresso corrente per una quest."""
    from app.models import GameSession
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    quest_type = quest.quest_type
    
    try:
        # Parse config per parametri aggiuntivi
        config = {}
        if quest.config:
            try:
                config = json.loads(quest.config) if isinstance(quest.config, str) else quest.config
            except:
                pass
        
        if quest_type == 'total_xp':
            # XP totale accumulato
            return int(user.total_xp_earned or 0)
        
        elif quest_type == 'reach_level':
            # Livello raggiunto
            from app.level_system import LevelSystem
            current_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned or 0)
            return current_level
        
        elif quest_type == 'play_games_count':
            # Numero totale di sessioni giocate
            count = db.query(func.count(GameSession.session_id)).filter(
                GameSession.user_id == user.user_id
            ).scalar()
            return count or 0
        
        elif quest_type == 'score_threshold_per_game':
            # Score minimo in un gioco specifico
            game_id = config.get('game_id')
            min_score = config.get('min_score', 0)
            
            if game_id:
                max_score = db.query(func.max(GameSession.score)).filter(
                    GameSession.user_id == user.user_id,
                    GameSession.game_id == game_id
                ).scalar()
                
                return 1 if (max_score or 0) >= min_score else 0
            return 0
        
        elif quest_type == 'login_after_24h':
            # Login dopo 24h dal primo login
            if not user.created_at:
                return 0
            
            try:
                created = datetime.fromisoformat(user.created_at.replace('Z', '+00:00'))
                last_login = datetime.fromisoformat(user.last_login.replace('Z', '+00:00')) if user.last_login else created
                
                time_diff = last_login - created
                return 1 if time_diff >= timedelta(hours=24) else 0
            except:
                return 0
        
        elif quest_type == 'login_streak':
            # Streak di login consecutivi
            return user.login_streak or 0
        
        elif quest_type == 'leaderboard_top':
            # Posizione in leaderboard (weekly)
            from app.models import WeeklyLeaderboard
            from datetime import date
            
            today = date.today()
            week_start = (today - timedelta(days=today.weekday())).isoformat()
            
            # Conta posizione nella classifica settimanale
            entry = db.query(WeeklyLeaderboard).filter(
                WeeklyLeaderboard.user_id == user.user_id,
                WeeklyLeaderboard.week_start == week_start
            ).first()
            
            return 1 if entry and entry.rank <= quest.target_value else 0
        
        elif quest_type == 'play_time_cumulative':
            # Tempo totale cumulativo in secondi
            total = db.query(func.sum(GameSession.duration_seconds)).filter(
                GameSession.user_id == user.user_id
            ).scalar()
            return int(total or 0)
        
        elif quest_type in ['play_games_weekly', 'xp_weekly']:
            # Quest settimanali
            today = datetime.utcnow().date()
            week_start = (today - timedelta(days=today.weekday())).isoformat()
            
            # Non fare il reset qui, calcola sempre il progresso corrente
            week_start_dt = datetime.fromisoformat(week_start + 'T00:00:00')
            
            if quest_type == 'play_games_weekly':
                count = db.query(func.count(GameSession.session_id)).filter(
                    GameSession.user_id == user.user_id,
                    GameSession.started_at >= week_start_dt.isoformat()
                ).scalar()
                return count or 0
            
            elif quest_type == 'xp_weekly':
                total = db.query(func.sum(GameSession.xp_earned)).filter(
                    GameSession.user_id == user.user_id,
                    GameSession.started_at >= week_start_dt.isoformat()
                ).scalar()
                return int(total or 0)
        
        elif quest_type in ['play_time_daily', 'xp_daily']:
            # Quest giornaliere
            today = datetime.utcnow().date().isoformat()
            
            # Non fare il reset qui, calcola sempre il progresso corrente
            today_start = datetime.fromisoformat(today + 'T00:00:00')
            
            if quest_type == 'play_time_daily':
                total = db.query(func.sum(GameSession.duration_seconds)).filter(
                    GameSession.user_id == user.user_id,
                    GameSession.started_at >= today_start.isoformat()
                ).scalar()
                return int(total or 0)  # In secondi, non minuti!
            
            elif quest_type == 'xp_daily':
                total = db.query(func.sum(GameSession.xp_earned)).filter(
                    GameSession.user_id == user.user_id,
                    GameSession.started_at >= today_start.isoformat()
                ).scalar()
                return int(total or 0)
        
        else:
            print(f"     ⚠️  Tipo quest sconosciuto: {quest_type}")
            return 0
            
    except Exception as e:
        print(f"     ⚠️  Errore calcolo progresso: {e}")
        return 0


def main():
    """Main function."""
    print("\n" + "="*70)
    print("🛠️  SCRIPT AGGIORNAMENTO USER QUESTS")
    print("="*70)
    print("\nQuesto script aggiornerà tutte le user quests per tutti gli utenti")
    print("ricalcolando i progressi in base ai dati attuali del database.")
    print("\n⚠️  ATTENZIONE: Questa operazione modificherà il database!")
    
    response = input("\n❓ Vuoi procedere? (s/n): ")
    
    if response.lower() in ['s', 'si', 'y', 'yes']:
        update_all_user_quests()
    else:
        print("\n❌ Operazione annullata dall'utente")


if __name__ == "__main__":
    main()
