"""
Test completo per simulare un utente che gioca a vari giochi.
Crea un utente, avvia sessioni di gioco in diversi giochi, e traccia i progressi.
"""
import time
import random
import uuid
from datetime import datetime
from app.database import (
    get_db_session,
    create_user,
    create_game_session,
    end_game_session,
    get_user_by_id,
    get_user_sessions
)
from app.models import Game, User, GameSession, Leaderboard, UserQuest, Quest


def print_separator(title=""):
    """Stampa un separatore visivo."""
    print("\n" + "=" * 80)
    if title:
        print(f"  {title}")
        print("=" * 80)
    print()


def print_user_info(user_id: str):
    """Stampa le informazioni dell'utente."""
    user_data = get_user_by_id(user_id)
    if user_data:
        print(f"👤 Utente: {user_data['username']} (ID: {user_data['user_id']})")
        print(f"   📧 Email: {user_data['email']}")
        print(f"   ⭐ XP Totale: {user_data['total_xp_earned']:.2f}")
        print(f"   🔥 Moltiplicatore: {user_data['cur8_multiplier']}x")
        print(f"   📅 Creato il: {user_data['created_at']}")
    else:
        print(f"❌ Utente {user_id} non trovato")


def get_available_games():
    """Recupera tutti i giochi disponibili dal database."""
    with get_db_session() as session:
        games = session.query(Game).all()
        return [game.to_dict() for game in games]


def simulate_game_session(user_id: str, game_id: str, game_title: str, session_num: int):
    """Simula una sessione di gioco completa."""
    print(f"\n🎮 Sessione #{session_num} - Gioco: {game_title}")
    print(f"   Game ID: {game_id}")
    
    # Avvia la sessione
    session_start = create_game_session(user_id=user_id, game_id=game_id)
    session_id = session_start['session_id']
    print(f"   ▶️  Sessione avviata: {session_id}")
    print(f"   🕒 Inizio: {session_start['started_at']}")
    
    # Simula il tempo di gioco (1-10 secondi per velocità test)
    play_time = random.randint(1, 10)
    print(f"   ⏱️  Giocando per {play_time} secondi...")
    time.sleep(play_time)
    
    # Genera un punteggio casuale (100-10000)
    score = random.randint(100, 10000)
    
    # Termina la sessione
    session_end = end_game_session(
        session_id=session_id,
        score=score,
        duration_seconds=play_time
    )
    
    if session_end:
        print(f"   ⏹️  Sessione terminata")
        print(f"   🎯 Punteggio: {session_end['score']}")
        print(f"   ⭐ XP Guadagnati: {session_end['xp_earned']:.2f}")
        print(f"   ⏱️  Durata: {session_end['duration_seconds']} secondi")
        return session_end
    else:
        print(f"   ❌ Errore nel terminare la sessione")
        return None


def print_leaderboard_stats(user_id: str):
    """Stampa le statistiche della leaderboard per l'utente."""
    with get_db_session() as session:
        entries = session.query(Leaderboard).filter(
            Leaderboard.user_id == user_id
        ).all()
        
        if entries:
            print(f"\n📊 Posizioni in Leaderboard:")
            for entry in entries:
                game = session.query(Game).filter(Game.game_id == entry.game_id).first()
                game_title = game.title if game else entry.game_id
                print(f"   🏆 {game_title}: Rank #{entry.rank if entry.rank else '?'} - Score: {entry.score}")
        else:
            print(f"\n📊 Nessuna entry in leaderboard trovata")


def print_quest_progress(user_id: str):
    """Stampa il progresso delle quest dell'utente."""
    with get_db_session() as session:
        user_quests = session.query(UserQuest).filter(
            UserQuest.user_id == user_id
        ).all()
        
        if user_quests:
            print(f"\n🎯 Progresso Quest:")
            for uq in user_quests:
                quest = session.query(Quest).filter(Quest.quest_id == uq.quest_id).first()
                if quest:
                    progress_pct = (uq.current_progress / quest.target_value * 100) if quest.target_value > 0 else 0
                    status = "✅ COMPLETATA" if uq.is_completed else f"🔄 {progress_pct:.1f}%"
                    claimed = " 🎁 RIVENDICATA" if uq.is_claimed else ""
                    print(f"   {status} - {quest.title} ({uq.current_progress}/{quest.target_value}){claimed}")
        else:
            print(f"\n🎯 Nessuna quest in corso")


def print_session_history(user_id: str, limit: int = 5):
    """Stampa lo storico delle sessioni dell'utente."""
    sessions = get_user_sessions(user_id, limit=limit)
    
    if sessions:
        print(f"\n📜 Ultime {len(sessions)} Sessioni:")
        for sess in sessions:
            with get_db_session() as session:
                game = session.query(Game).filter(Game.game_id == sess['game_id']).first()
                game_title = game.title if game else sess['game_id']
            
            print(f"   🎮 {game_title}")
            print(f"      Session ID: {sess['session_id']}")
            print(f"      Score: {sess['score']} | XP: {sess['xp_earned']:.2f} | Durata: {sess['duration_seconds']}s")
            print(f"      Inizio: {sess['started_at']} | Fine: {sess['ended_at']}")
    else:
        print(f"\n📜 Nessuna sessione trovata")


def main():
    """Funzione principale del test."""
    print_separator("TEST SIMULAZIONE UTENTE CON SESSIONI DI GIOCO")
    
    # Step 1: Crea un nuovo utente
    print("📝 STEP 1: Creazione utente")
    print("-" * 80)
    
    username = f"test_player_{int(time.time())}"
    email = f"{username}@test.com"
    password = uuid.uuid4().hex
    
    try:
        user = create_user(
            username=username,
            email=email,
            password=password,
            cur8_multiplier=1.5  # Moltiplicatore bonus per il test
        )
        user_id = user['user_id']
        print(f"✅ Utente creato con successo!")
        print_user_info(user_id)
    except Exception as e:
        print(f"❌ Errore nella creazione utente: {e}")
        return
    
    # Step 2: Recupera i giochi disponibili
    print_separator("STEP 2: Recupero giochi disponibili")
    
    games = get_available_games()
    if not games:
        print("❌ Nessun gioco disponibile nel database!")
        print("💡 Suggerimento: Esegui gli script register_*.py per registrare i giochi")
        return
    
    print(f"✅ Trovati {len(games)} giochi:")
    for i, game in enumerate(games, 1):
        print(f"   {i}. {game['title']} (ID: {game['game_id']})")
    
    # Step 3: Gioca a vari giochi
    print_separator("STEP 3: Simulazione sessioni di gioco")
    
    # Numero di sessioni da simulare per ciascun gioco
    sessions_per_game = 3
    total_sessions = 0
    
    for game in games:
        print(f"\n🎯 Giocando a: {game['title']}")
        print("-" * 80)
        
        for session_num in range(1, sessions_per_game + 1):
            result = simulate_game_session(
                user_id=user_id,
                game_id=game['game_id'],
                game_title=game['title'],
                session_num=session_num
            )
            if result:
                total_sessions += 1
            
            # Piccola pausa tra le sessioni
            if session_num < sessions_per_game:
                time.sleep(0.5)
    
    # Step 4: Mostra statistiche finali
    print_separator("STEP 4: Statistiche finali")
    
    # Informazioni utente aggiornate
    print_user_info(user_id)
    
    # Statistiche leaderboard
    print_leaderboard_stats(user_id)
    
    # Progresso quest
    print_quest_progress(user_id)
    
    # Storico sessioni
    print_session_history(user_id, limit=10)
    
    # Riepilogo finale
    print_separator("RIEPILOGO FINALE")
    user_final = get_user_by_id(user_id)
    print(f"👤 Utente: {user_final['username']}")
    print(f"🎮 Giochi giocati: {len(games)}")
    print(f"📊 Sessioni totali: {total_sessions}")
    print(f"⭐ XP Totale guadagnato: {user_final['total_xp_earned']:.2f}")
    print(f"🎯 Media XP per sessione: {user_final['total_xp_earned'] / total_sessions:.2f}" if total_sessions > 0 else "N/A")
    
    print_separator()
    print("✅ Test completato con successo!")
    print(f"🔍 User ID per riferimenti futuri: {user_id}")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrotto dall'utente")
    except Exception as e:
        print(f"\n\n❌ Errore durante l'esecuzione del test: {e}")
        import traceback
        traceback.print_exc()
