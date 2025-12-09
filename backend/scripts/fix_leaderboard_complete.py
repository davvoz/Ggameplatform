"""
Script per fissare la leaderboard e verificare i trigger
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import GameSession, Game, User, Leaderboard
from app.leaderboard_triggers import update_leaderboard_for_session, recalculate_ranks_for_game
from sqlalchemy import desc, func
import uuid
from datetime import datetime

def fix_leaderboard():
    """Ricostruisce completamente la leaderboard basandosi sui punteggi reali delle sessioni."""
    print("\n" + "="*80)
    print("FIXING LEADERBOARD - Ricostruzione basata su punteggi reali")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        games = session.query(Game).all()
        
        for game in games:
            print(f"\n🎮 Processando: {game.title} (ID: {game.game_id})")
            print("-" * 80)
            
            # Ottieni i punteggi massimi reali per ogni utente in questo gioco
            max_scores = session.query(
                GameSession.user_id,
                func.max(GameSession.score).label('max_score'),
                func.max(GameSession.ended_at).label('last_played')
            ).filter(
                GameSession.game_id == game.game_id,
                GameSession.ended_at.isnot(None)
            ).group_by(GameSession.user_id).all()
            
            if not max_scores:
                print("   Nessuna sessione completata trovata.")
                continue
            
            print(f"   Trovati {len(max_scores)} utenti con sessioni completate\n")
            
            # Per ogni utente, aggiorna o crea l'entry nella leaderboard
            for user_id, max_score, last_played in max_scores:
                user = session.query(User).filter(User.user_id == user_id).first()
                username = user.username if user and user.username else f"Anon ({user_id[:8]})"
                
                # Cerca se esiste già un'entry
                existing_entry = session.query(Leaderboard).filter(
                    Leaderboard.game_id == game.game_id,
                    Leaderboard.user_id == user_id
                ).first()
                
                if existing_entry:
                    old_score = existing_entry.score
                    if old_score != max_score:
                        print(f"   📝 Aggiornamento {username}: {old_score} → {max_score}")
                        existing_entry.score = max_score
                        existing_entry.created_at = last_played
                    else:
                        print(f"   ✅ OK {username}: {max_score}")
                else:
                    print(f"   ➕ Creazione nuova entry {username}: {max_score}")
                    new_entry = Leaderboard(
                        entry_id=f"lb_{uuid.uuid4().hex[:16]}",
                        user_id=user_id,
                        game_id=game.game_id,
                        score=max_score,
                        rank=None,
                        created_at=last_played
                    )
                    session.add(new_entry)
            
            # Ricalcola i rank
            print(f"\n   🔄 Ricalcolo rank...")
            recalculate_ranks_for_game(session, game.game_id)
            
            session.flush()
            
            # Mostra la leaderboard aggiornata (top 5)
            print(f"\n   📊 Leaderboard aggiornata (Top 5):")
            top_entries = session.query(Leaderboard).filter(
                Leaderboard.game_id == game.game_id
            ).order_by(Leaderboard.rank).limit(5).all()
            
            for entry in top_entries:
                user = session.query(User).filter(User.user_id == entry.user_id).first()
                username = user.username if user and user.username else f"Anon ({entry.user_id[:8]})"
                print(f"      {entry.rank}. {username}: {entry.score}")
            
            print()
        
        print("\n" + "="*80)
        print("✅ LEADERBOARD FISSATA CON SUCCESSO!")
        print("="*80 + "\n")


def verify_trigger_system():
    """Verifica che il sistema di trigger funzioni correttamente."""
    print("\n" + "="*80)
    print("VERIFICA SISTEMA TRIGGER")
    print("="*80 + "\n")
    
    from sqlalchemy import event
    from sqlalchemy.orm import Session
    from app.models import GameSession
    
    # Verifica importazione moduli trigger
    try:
        from app.leaderboard_triggers import (
            update_leaderboard_for_session,
            recalculate_ranks_for_game,
            sessions_to_update,
            receive_after_flush,
            receive_before_update
        )
        print(f"✅ Modulo trigger importato correttamente")
        print(f"📋 Sessioni in coda per aggiornamento: {len(sessions_to_update)}")
        
        # Verifica se i listener sono stati registrati
        try:
            # Controlla manualmente se gli event listener esistono
            print(f"✅ Funzione 'receive_after_flush' disponibile: {callable(receive_after_flush)}")
            print(f"✅ Funzione 'receive_before_update' disponibile: {callable(receive_before_update)}")
            print(f"✅ Funzione 'update_leaderboard_for_session' disponibile: {callable(update_leaderboard_for_session)}")
        except Exception as e:
            print(f"⚠️  Verifica listener: {e}")
            
    except Exception as e:
        print(f"❌ Errore importazione trigger: {e}")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    print("\n🔧 FASE 1: Verifica Sistema Trigger")
    verify_trigger_system()
    
    print("\n🔧 FASE 2: Fix Leaderboard")
    fix_leaderboard()
    
    print("\n🔧 FASE 3: Verifica Finale")
    # Importa lo script di consistency check
    import check_leaderboard_consistency
    check_leaderboard_consistency.check_leaderboard_consistency()
