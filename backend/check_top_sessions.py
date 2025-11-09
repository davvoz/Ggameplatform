"""
Script per analizzare le sessioni dei giochi e trovare quelle con i punteggi più alti
"""
from app.database import get_db_session
from app.models import GameSession, Game, User
from sqlalchemy import desc

def check_top_sessions():
    """Trova le sessioni con i punteggi più alti per ciascun gioco."""
    with get_db_session() as session:
        # Prima otteniamo tutti i giochi
        games = session.query(Game).all()
        
        print("\n" + "="*80)
        print("TOP SESSIONS PER GIOCO - Punteggi più alti")
        print("="*80 + "\n")
        
        for game in games:
            print(f"\n🎮 GIOCO: {game.title} (ID: {game.game_id})")
            print("-" * 80)
            
            # Ottieni le top 5 sessioni per questo gioco ordinate per punteggio
            top_sessions = session.query(GameSession).filter(
                GameSession.game_id == game.game_id,
                GameSession.ended_at.isnot(None)  # Solo sessioni completate
            ).order_by(desc(GameSession.score)).limit(5).all()
            
            if not top_sessions:
                print("   Nessuna sessione completata trovata per questo gioco.\n")
                continue
            
            print(f"\n   Top 5 sessioni con punteggi più alti:\n")
            for idx, sess in enumerate(top_sessions, 1):
                # Ottieni info utente
                user = session.query(User).filter(User.user_id == sess.user_id).first()
                username = user.username if user and user.username else f"Anonymous ({sess.user_id[:8]})"
                
                print(f"   {idx}. Session ID: {sess.session_id}")
                print(f"      Utente: {username}")
                print(f"      Score: {sess.score}")
                print(f"      CUR8 guadagnato: {sess.cur8_earned:.2f}")
                print(f"      Durata: {sess.duration_seconds} secondi ({sess.duration_seconds // 60}m {sess.duration_seconds % 60}s)")
                print(f"      Iniziata: {sess.started_at}")
                print(f"      Terminata: {sess.ended_at}")
                print()
        
        # Statistiche generali
        print("\n" + "="*80)
        print("STATISTICHE GENERALI")
        print("="*80 + "\n")
        
        # Top session assoluta (tra tutti i giochi)
        top_session_overall = session.query(GameSession).filter(
            GameSession.ended_at.isnot(None)
        ).order_by(desc(GameSession.score)).first()
        
        if top_session_overall:
            game = session.query(Game).filter(Game.game_id == top_session_overall.game_id).first()
            user = session.query(User).filter(User.user_id == top_session_overall.user_id).first()
            username = user.username if user and user.username else f"Anonymous ({top_session_overall.user_id[:8]})"
            
            print(f"🏆 SESSIONE CON IL PUNTEGGIO PIÙ ALTO IN ASSOLUTO:")
            print(f"   Gioco: {game.title}")
            print(f"   Utente: {username}")
            print(f"   Score: {top_session_overall.score}")
            print(f"   CUR8 guadagnato: {top_session_overall.cur8_earned:.2f}")
            print(f"   Durata: {top_session_overall.duration_seconds // 60}m {top_session_overall.duration_seconds % 60}s")
            print()
        
        # Totale sessioni completate
        total_sessions = session.query(GameSession).filter(
            GameSession.ended_at.isnot(None)
        ).count()
        print(f"📊 Totale sessioni completate: {total_sessions}")
        
        # Sessioni per gioco
        print(f"\n📊 Sessioni per gioco:")
        for game in games:
            count = session.query(GameSession).filter(
                GameSession.game_id == game.game_id,
                GameSession.ended_at.isnot(None)
            ).count()
            print(f"   - {game.title}: {count} sessioni")
        
        print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    check_top_sessions()
