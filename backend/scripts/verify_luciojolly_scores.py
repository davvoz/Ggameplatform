"""
Verifica dettagliata degli score di luciojolly
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import GameSession, Leaderboard, User, Game
from sqlalchemy import func, desc

def verify_scores():
    print("\n" + "="*80)
    print("VERIFICA DETTAGLIATA SCORE LUCIOJOLLY")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Trova l'utente luciojolly
        user = session.query(User).filter(
            User.username.like('%lucio%')
        ).first()
        
        if not user:
            print("❌ Utente luciojolly non trovato!")
            return
        
        print(f"👤 Utente trovato:")
        print(f"   - Username: {user.username}")
        print(f"   - User ID: {user.user_id}")
        print(f"   - Is Anonymous: {user.is_anonymous}")
        print(f"   - Total XP: {user.total_xp_earned}")
        
        # Ottieni tutti i giochi
        games = session.query(Game).all()
        
        for game in games:
            print(f"\n{'='*80}")
            print(f"🎮 GIOCO: {game.title} ({game.game_id})")
            print('='*80)
            
            # Sessioni completate per questo gioco
            sessions = session.query(GameSession).filter(
                GameSession.user_id == user.user_id,
                GameSession.game_id == game.game_id,
                GameSession.ended_at.isnot(None)
            ).order_by(desc(GameSession.score)).all()
            
            if not sessions:
                print("   ⚠️  Nessuna sessione completata")
                continue
            
            print(f"\n📊 SESSIONI COMPLETATE: {len(sessions)}")
            print("-" * 80)
            
            # Top 5 sessioni
            print("\nTop 5 Score:")
            for idx, sess in enumerate(sessions[:5], 1):
                print(f"   {idx}. Score: {sess.score:>8} | Started: {sess.started_at} | Ended: {sess.ended_at}")
            
            # Score massimo
            max_score = sessions[0].score if sessions else 0
            print(f"\n🏆 SCORE MASSIMO REALE: {max_score}")
            
            # Verifica leaderboard
            lb_entry = session.query(Leaderboard).filter(
                Leaderboard.user_id == user.user_id,
                Leaderboard.game_id == game.game_id
            ).first()
            
            print(f"\n📈 LEADERBOARD:")
            if lb_entry:
                print(f"   - Score: {lb_entry.score}")
                print(f"   - Rank: {lb_entry.rank}")
                print(f"   - Created: {lb_entry.created_at}")
                
                # Confronto
                if lb_entry.score == max_score:
                    print(f"   ✅ CORRETTO!")
                else:
                    print(f"   ❌ ERRORE! Differenza: {max_score - lb_entry.score}")
                    print(f"   📝 Dovrebbe essere {max_score} invece di {lb_entry.score}")
            else:
                print(f"   ❌ NON PRESENTE IN LEADERBOARD!")
                if max_score > 0:
                    print(f"   📝 Dovrebbe avere score: {max_score}")
        
        # Riepilogo globale
        print(f"\n\n{'='*80}")
        print("RIEPILOGO GLOBALE")
        print('='*80)
        
        # Tutti gli score massimi
        max_scores = session.query(
            GameSession.game_id,
            func.max(GameSession.score).label('max_score')
        ).filter(
            GameSession.user_id == user.user_id,
            GameSession.ended_at.isnot(None)
        ).group_by(GameSession.game_id).all()
        
        print(f"\n📊 Score massimi per gioco (dalle sessioni):")
        for game_id, max_score in max_scores:
            game = session.query(Game).filter(Game.game_id == game_id).first()
            game_name = game.title if game else game_id
            
            lb = session.query(Leaderboard).filter(
                Leaderboard.user_id == user.user_id,
                Leaderboard.game_id == game_id
            ).first()
            
            lb_score = lb.score if lb else "N/A"
            status = "✅" if (lb and lb.score == max_score) else "❌"
            
            print(f"   {status} {game_name:30} | Reale: {max_score:>8} | Leaderboard: {lb_score}")

if __name__ == "__main__":
    verify_scores()
