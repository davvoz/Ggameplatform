"""
Verifica la consistenza della leaderboard per TUTTI I GIOCHI
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models import GameSession, Leaderboard, User, Game
from sqlalchemy import func, desc

def check_game_leaderboard(session, game_id, game_name):
    print("\n" + "="*80)
    print(f"VERIFICA LEADERBOARD: {game_name} ({game_id})")
    print("="*80 + "\n")
    
    # 1. Ottieni punteggi massimi dalle sessioni
    print("📊 PUNTEGGI MASSIMI DALLE SESSIONI:")
    print("-" * 80)
    
    max_scores = session.query(
        GameSession.user_id,
        func.max(GameSession.score).label('max_score'),
        func.count(GameSession.session_id).label('total_games')
    ).filter(
        GameSession.game_id == game_id,
        GameSession.ended_at.isnot(None)
    ).group_by(GameSession.user_id).order_by(desc('max_score')).limit(10).all()
    
    if not max_scores:
        print("⚠️  Nessuna sessione completata trovata per questo gioco")
        return []
    
    for idx, (user_id, max_score, total_games) in enumerate(max_scores, 1):
        user = session.query(User).filter(User.user_id == user_id).first()
        username = user.username if user and user.username else f"Anon_{user_id[:8]}"
        print(f"{idx:2}. {username:20} | Max: {max_score:6} | Games: {total_games}")
    
    # 2. Ottieni leaderboard attuale
    print("\n📈 LEADERBOARD ATTUALE:")
    print("-" * 80)
    
    leaderboard = session.query(Leaderboard).filter(
        Leaderboard.game_id == game_id
    ).order_by(Leaderboard.rank).limit(10).all()
    
    if not leaderboard:
        print("⚠️  Leaderboard vuota!")
    else:
        for entry in leaderboard:
            user = session.query(User).filter(User.user_id == entry.user_id).first()
            username = user.username if user and user.username else f"Anon_{entry.user_id[:8]}"
            print(f"{entry.rank or 'N/A':2}. {username:20} | Score: {entry.score:6}")
    
    # 3. Verifica incongruenze
    print("\n🔍 VERIFICA INCONGRUENZE:")
    print("-" * 80)
    
    incongruenze = []
    for user_id, max_score, _ in max_scores:
        lb_entry = session.query(Leaderboard).filter(
            Leaderboard.game_id == game_id,
            Leaderboard.user_id == user_id
        ).first()
        
        if not lb_entry:
            user = session.query(User).filter(User.user_id == user_id).first()
            username = user.username if user and user.username else f"Anon_{user_id[:8]}"
            print(f"❌ {username}: NON in leaderboard (max score: {max_score})")
            incongruenze.append((game_id, 'missing', user_id, max_score, 0))
        elif lb_entry.score != max_score:
            user = session.query(User).filter(User.user_id == user_id).first()
            username = user.username if user and user.username else f"Anon_{user_id[:8]}"
            print(f"⚠️  {username}: Score diverso | Leaderboard: {lb_entry.score} | Reale: {max_score}")
            incongruenze.append((game_id, 'mismatch', user_id, max_score, lb_entry.score))
    
    if not incongruenze:
        print("✅ Nessuna incongruenza trovata!")
    
    # 4. Ultime 5 sessioni completate
    print("\n🎮 ULTIME 5 SESSIONI COMPLETATE:")
    print("-" * 80)
    
    recent_sessions = session.query(GameSession).filter(
        GameSession.game_id == game_id,
        GameSession.ended_at.isnot(None)
    ).order_by(desc(GameSession.ended_at)).limit(5).all()
    
    if recent_sessions:
        for sess in recent_sessions:
            user = session.query(User).filter(User.user_id == sess.user_id).first()
            username = user.username if user and user.username else f"Anon_{sess.user_id[:8]}"
            print(f"{username:20} | Score: {sess.score:6} | {sess.ended_at}")
    else:
        print("⚠️  Nessuna sessione recente")
    
    # 5. Verifica sessioni NON terminate
    print("\n⏱️  SESSIONI NON TERMINATE:")
    print("-" * 80)
    
    active_sessions = session.query(GameSession).filter(
        GameSession.game_id == game_id,
        GameSession.ended_at.is_(None)
    ).order_by(desc(GameSession.started_at)).limit(5).all()
    
    if active_sessions:
        for sess in active_sessions:
            user = session.query(User).filter(User.user_id == sess.user_id).first()
            username = user.username if user and user.username else f"Anon_{sess.user_id[:8]}"
            print(f"{username:20} | Score: {sess.score:6} | Started: {sess.started_at}")
    else:
        print("✅ Nessuna sessione attiva")
    
    return incongruenze

def check_all_leaderboards():
    all_incongruenze = []
    
    with get_db_session() as session:
        # Ottieni tutti i giochi
        games = session.query(Game).all()
        
        print("\n" + "="*80)
        print(f"VERIFICA LEADERBOARD PER {len(games)} GIOCHI")
        print("="*80)
        
        for game in games:
            incongruenze = check_game_leaderboard(session, game.game_id, game.title)
            all_incongruenze.extend(incongruenze)
        
        # Riepilogo finale
        print("\n\n" + "="*80)
        print("RIEPILOGO FINALE")
        print("="*80 + "\n")
        
        if all_incongruenze:
            print(f"❌ Trovate {len(all_incongruenze)} incongruenze totali:\n")
            
            by_game = {}
            for game_id, tipo, user_id, max_score, lb_score in all_incongruenze:
                if game_id not in by_game:
                    by_game[game_id] = []
                by_game[game_id].append((tipo, user_id, max_score, lb_score))
            
            for game_id, issues in by_game.items():
                game = session.query(Game).filter(Game.game_id == game_id).first()
                game_name = game.title if game else game_id
                print(f"\n{game_name} ({game_id}): {len(issues)} problemi")
                for tipo, user_id, max_score, lb_score in issues:
                    user = session.query(User).filter(User.user_id == user_id).first()
                    username = user.username if user and user.username else f"Anon_{user_id[:8]}"
                    if tipo == 'missing':
                        print(f"  - {username}: mancante (score: {max_score})")
                    else:
                        print(f"  - {username}: score diverso (reale: {max_score}, lb: {lb_score})")
        else:
            print("✅ TUTTE LE LEADERBOARD SONO CORRETTE!")
        
        return all_incongruenze

if __name__ == "__main__":
    incongruenze = check_all_leaderboards()
    
    if incongruenze:
        print("\n" + "="*80)
        print("FIX NECESSARIO")
        print("="*80)
        print(f"\nEsegui: python backend/scripts/fix_leaderboard_complete.py")
    else:
        print("\n" + "="*80)
        print("✅ TUTTO OK")
        print("="*80)
