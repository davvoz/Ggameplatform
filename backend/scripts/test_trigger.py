"""
Script per testare il funzionamento dei trigger della leaderboard
Crea una sessione di test e verifica che la leaderboard si aggiorni automaticamente
"""
from app.database import create_user, create_game_session, end_game_session, get_db_session
from app.models import Leaderboard
import time
import uuid

def test_trigger():
    """Testa il trigger della leaderboard con una nuova sessione."""
    print("\n" + "="*80)
    print("TEST TRIGGER LEADERBOARD")
    print("="*80 + "\n")
    
    # Crea un utente di test
    test_username = f"test_trigger_{int(time.time())}"
    print(f"1️⃣ Creazione utente di test: {test_username}")
    user = create_user(username=test_username, email=f"{test_username}@test.com", password="test123")
    user_id = user['user_id']
    print(f"   ✅ Utente creato: {user_id}\n")
    
    # Usa il gioco zombie-tower per il test
    game_id = "zombie-tower"
    
    # Controlla lo stato iniziale della leaderboard
    print(f"2️⃣ Stato iniziale leaderboard per {game_id}:")
    with get_db_session() as session:
        initial_entry = session.query(Leaderboard).filter(
            Leaderboard.game_id == game_id,
            Leaderboard.user_id == user_id
        ).first()
        
        if initial_entry:
            print(f"   ⚠️  Entry già esistente (non dovrebbe): {initial_entry.score}")
        else:
            print(f"   ✅ Nessuna entry esistente (corretto)\n")
    
    # Crea una sessione di gioco
    print(f"3️⃣ Creazione sessione di gioco...")
    session_data = create_game_session(user_id, game_id)
    session_id = session_data['session_id']
    print(f"   ✅ Sessione creata: {session_id}\n")
    
    # Termina la sessione con un punteggio
    test_score = 999999
    test_duration = 300
    print(f"4️⃣ Terminazione sessione con score={test_score}, duration={test_duration}s")
    result = end_game_session(session_id, test_score, test_duration)
    print(f"   ✅ Sessione terminata")
    print(f"   📊 Score registrato: {result.get('score')}")
    print(f"   💰 XP guadagnato: {result.get('xp_earned')}\n")
    
    # Verifica se la leaderboard è stata aggiornata
    print(f"5️⃣ Verifica aggiornamento leaderboard...")
    time.sleep(0.5)  # Piccola pausa per sicurezza
    
    with get_db_session() as session:
        updated_entry = session.query(Leaderboard).filter(
            Leaderboard.game_id == game_id,
            Leaderboard.user_id == user_id
        ).first()
        
        if updated_entry:
            if updated_entry.score == test_score:
                print(f"   ✅ TRIGGER FUNZIONA! Leaderboard aggiornata correttamente")
                print(f"      Rank: {updated_entry.rank}")
                print(f"      Score: {updated_entry.score}")
            else:
                print(f"   ❌ TRIGGER PARZIALE: Entry esiste ma score errato")
                print(f"      Score leaderboard: {updated_entry.score}")
                print(f"      Score atteso: {test_score}")
        else:
            print(f"   ❌ TRIGGER NON FUNZIONA: Nessuna entry creata in leaderboard")
            print(f"      Questo indica che il trigger 'after_flush' non sta funzionando correttamente")
    
    print("\n" + "="*80 + "\n")
    
    return user_id, session_id, test_score

if __name__ == "__main__":
    test_trigger()
