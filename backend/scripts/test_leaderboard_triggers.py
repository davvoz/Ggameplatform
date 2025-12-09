"""
Test per verificare se i trigger della leaderboard funzionano correttamente
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import GameSession, User, Leaderboard
from datetime import datetime
import uuid

def test_trigger():
    print("\n" + "="*80)
    print("TEST TRIGGER LEADERBOARD")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Trova una sessione esistente non completata
        incomplete_session = session.query(GameSession).filter(
            GameSession.ended_at.is_(None)
        ).first()
        
        if not incomplete_session:
            print("⚠️  Nessuna sessione incompleta trovata. Creo una sessione di test...")
            
            # Trova un utente esistente
            user = session.query(User).filter(User.is_anonymous == 0).first()
            if not user:
                print("❌ Nessun utente non-anonimo trovato!")
                return
            
            # Crea una nuova sessione
            test_session = GameSession(
                session_id=f"test_{uuid.uuid4().hex[:16]}",
                user_id=user.user_id,
                game_id="blocky-road",
                score=0,
                started_at=datetime.utcnow().isoformat(),
                ended_at=None
            )
            session.add(test_session)
            session.flush()  # Forza il flush per creare la sessione
            
            incomplete_session = test_session
            print(f"✅ Sessione di test creata: {incomplete_session.session_id}")
        
        print(f"\n📝 Sessione trovata:")
        print(f"   - ID: {incomplete_session.session_id}")
        print(f"   - User: {incomplete_session.user_id}")
        print(f"   - Game: {incomplete_session.game_id}")
        print(f"   - Score attuale: {incomplete_session.score}")
        print(f"   - ended_at: {incomplete_session.ended_at}")
        
        # Verifica leaderboard PRIMA dell'update
        user = session.query(User).filter(User.user_id == incomplete_session.user_id).first()
        print(f"\n👤 Utente: {user.username if user.username else 'Anonimo'}")
        print(f"   - is_anonymous: {user.is_anonymous}")
        
        lb_before = session.query(Leaderboard).filter(
            Leaderboard.user_id == incomplete_session.user_id,
            Leaderboard.game_id == incomplete_session.game_id
        ).first()
        
        print(f"\n📊 Leaderboard PRIMA:")
        if lb_before:
            print(f"   - Score: {lb_before.score}")
            print(f"   - Rank: {lb_before.rank}")
        else:
            print("   - Nessun entry esistente")
        
        # Completa la sessione
        test_score = 9999
        print(f"\n🎮 Completo la sessione con score: {test_score}")
        
        incomplete_session.score = test_score
        incomplete_session.ended_at = datetime.utcnow().isoformat()
        incomplete_session.xp_earned = 100
        
        # IMPORTANTE: Forza il flush per attivare i trigger
        print("   - Flushing...")
        session.flush()
        
        print("   - Commit...")
        # Il commit avviene automaticamente con il context manager
        
        # Salva gli ID per la verifica successiva
        test_user_id = incomplete_session.user_id
        test_game_id = incomplete_session.game_id
    
    # Riapri la sessione per verificare il risultato
    print("\n🔍 Verifico risultato...")
    with get_db_session() as session:
        user = session.query(User).filter(User.user_id == test_user_id).first()
        
        lb_after = session.query(Leaderboard).filter(
            Leaderboard.user_id == test_user_id,
            Leaderboard.game_id == test_game_id
        ).first()
        
        print(f"\n📊 Leaderboard DOPO:")
        if lb_after:
            print(f"   - Score: {lb_after.score}")
            print(f"   - Rank: {lb_after.rank}")
            
            if lb_after.score == test_score or (lb_before and lb_after.score > lb_before.score):
                print("\n✅ TRIGGER FUNZIONA CORRETTAMENTE!")
            else:
                print(f"\n⚠️  Score non aggiornato. Atteso: {test_score}, Trovato: {lb_after.score}")
        else:
            if user.is_anonymous:
                print("   - Nessun entry (utente anonimo - normale)")
                print("\n✅ TRIGGER FUNZIONA CORRETTAMENTE (escluso utente anonimo)")
            else:
                print("   - ❌ Nessun entry creato! IL TRIGGER NON HA FUNZIONATO!")

if __name__ == "__main__":
    test_trigger()
