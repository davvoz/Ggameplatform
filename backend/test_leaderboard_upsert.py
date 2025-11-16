"""
Script di test per verificare che il nuovo sistema di leaderboard funzioni correttamente.

Testa:
1. Creazione di una nuova sessione con punteggio basso
2. Verifica che la leaderboard NON venga aggiornata (punteggio non migliore)
3. Creazione di una nuova sessione con punteggio alto
4. Verifica che la leaderboard VENGA aggiornata (nuovo best score)
5. Verifica che non vengano creati duplicati
"""
from app.database import get_db_session
from app.models import GameSession, Leaderboard, User, Game
from datetime import datetime
import uuid


def test_leaderboard_upsert():
    """Test completo del sistema di leaderboard con UPSERT."""
    print("\n" + "="*80)
    print("TEST LEADERBOARD - UPSERT E UNIQUE CONSTRAINT")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Usa un utente e gioco esistente
        user = session.query(User).filter(User.username == "luciojolly").first()
        game = session.query(Game).filter(Game.game_id == "snake").first()
        
        if not user or not game:
            print("❌ Utente 'luciojolly' o gioco 'snake' non trovato!")
            return
        
        print(f"👤 Utente: {user.username} (ID: {user.user_id})")
        print(f"🎮 Gioco: {game.title} (ID: {game.game_id})")
        
        # Ottieni il punteggio attuale in leaderboard
        current_lb = session.query(Leaderboard).filter(
            Leaderboard.user_id == user.user_id,
            Leaderboard.game_id == game.game_id
        ).first()
        
        if current_lb:
            print(f"📊 Punteggio attuale in leaderboard: {current_lb.score}")
            current_best = current_lb.score
        else:
            print(f"📊 Nessun record in leaderboard per questo utente/gioco")
            current_best = 0
        
        print("\n" + "-"*80)
        print("TEST 1: Punteggio INFERIORE al best score")
        print("-"*80 + "\n")
        
        # Crea una sessione con punteggio basso (inferiore al best)
        low_score = max(0, current_best - 1)
        session_1 = GameSession(
            session_id=f"session_test_{uuid.uuid4().hex[:8]}",
            user_id=user.user_id,
            game_id=game.game_id,
            score=low_score,
            xp_earned=0.0,
            duration_seconds=10,
            started_at=datetime.utcnow().isoformat(),
            ended_at=datetime.utcnow().isoformat()
        )
        session.add(session_1)
        session.flush()  # Trigger the leaderboard update
        
        print(f"✅ Creata sessione con score={low_score} (inferiore a best={current_best})")
        
        # Verifica che la leaderboard NON sia cambiata
        lb_after_1 = session.query(Leaderboard).filter(
            Leaderboard.user_id == user.user_id,
            Leaderboard.game_id == game.game_id
        ).first()
        
        if lb_after_1 and lb_after_1.score == current_best:
            print(f"✅ Leaderboard NON aggiornata (score rimane {lb_after_1.score})")
            no_update_successful = True
        elif not lb_after_1 and current_best == 0:
            print(f"✅ Leaderboard NON aggiornata (nessun record esistente)")
            no_update_successful = True
        else:
            print(f"❌ ERRORE: Leaderboard aggiornata inaspettatamente! Score: {lb_after_1.score if lb_after_1 else 'None'}")
            no_update_successful = False
        
        # Conta quante entry ci sono per questo utente/gioco
        count_1 = session.query(Leaderboard).filter(
            Leaderboard.user_id == user.user_id,
            Leaderboard.game_id == game.game_id
        ).count()
        
        if count_1 <= 1:
            print(f"✅ Constraint UNIQUE rispettato: {count_1} entry per utente/gioco\n")
        else:
            print(f"❌ ERRORE: Trovate {count_1} entry per utente/gioco (dovrebbe essere 0 o 1)!\n")
        
        print("-"*80)
        print("TEST 2: Punteggio SUPERIORE al best score")
        print("-"*80 + "\n")
        
        # Crea una sessione con punteggio alto (superiore al best)
        high_score = current_best + 1000
        session_2 = GameSession(
            session_id=f"session_test_{uuid.uuid4().hex[:8]}",
            user_id=user.user_id,
            game_id=game.game_id,
            score=high_score,
            xp_earned=0.0,
            duration_seconds=30,
            started_at=datetime.utcnow().isoformat(),
            ended_at=datetime.utcnow().isoformat()
        )
        session.add(session_2)
        session.flush()  # Trigger the leaderboard update
        
        print(f"✅ Creata sessione con score={high_score} (superiore a best={current_best})")
        
        # Verifica che la leaderboard SIA stata aggiornata
        lb_after_2 = session.query(Leaderboard).filter(
            Leaderboard.user_id == user.user_id,
            Leaderboard.game_id == game.game_id
        ).first()
        
        if lb_after_2 and lb_after_2.score == high_score:
            print(f"✅ Leaderboard AGGIORNATA (nuovo best score: {lb_after_2.score})")
            update_successful = True
        else:
            print(f"❌ ERRORE: Leaderboard non aggiornata! Score: {lb_after_2.score if lb_after_2 else 'None'}")
            update_successful = False
        
        # Conta quante entry ci sono per questo utente/gioco
        count_2 = session.query(Leaderboard).filter(
            Leaderboard.user_id == user.user_id,
            Leaderboard.game_id == game.game_id
        ).count()
        
        if count_2 == 1:
            print(f"✅ Constraint UNIQUE rispettato: {count_2} entry per utente/gioco\n")
        else:
            print(f"❌ ERRORE: Trovate {count_2} entry per utente/gioco (dovrebbe essere 1)!\n")
        
        # Rollback per non modificare il database reale
        session.rollback()
        
        print("="*80)
        print("🔄 ROLLBACK eseguito (database non modificato)")
        print("="*80)
        
        print("\n" + "="*80)
        print("✅ TEST COMPLETATO!")
        print("="*80 + "\n")
        
        # Valutazione corretta basata sui risultati
        unique_ok = count_1 <= 1 and count_2 == 1
        
        print("Riepilogo:")
        print(f"  - Constraint UNIQUE funziona: {'✅' if unique_ok else '❌'}")
        print(f"  - Trigger aggiorna solo se score > best: {'✅' if update_successful else '❌'}")
        print(f"  - Trigger non aggiorna se score <= best: {'✅' if no_update_successful else '❌'}")
        
        if unique_ok and update_successful and no_update_successful:
            print(f"\n🎉 TUTTI I TEST PASSATI! Sistema funzionante correttamente.\n")
        else:
            print(f"\n⚠️  ALCUNI TEST FALLITI. Controllare il sistema.\n")
        print()


if __name__ == "__main__":
    test_leaderboard_upsert()
