"""
Script per verificare la consistenza tra leaderboard e sessioni
"""
from app.database import get_db_session
from app.models import GameSession, Game, User, Leaderboard
from sqlalchemy import desc

def check_leaderboard_consistency():
    """Verifica la consistenza tra leaderboard e punteggi reali."""
    with get_db_session() as session:
        games = session.query(Game).all()
        
        print("\n" + "="*80)
        print("VERIFICA CONSISTENZA LEADERBOARD vs SESSIONI REALI")
        print("="*80 + "\n")
        
        for game in games:
            print(f"\n🎮 GIOCO: {game.title} (ID: {game.game_id})")
            print("-" * 80)
            
            # Ottieni la leaderboard per questo gioco
            leaderboard_entries = session.query(Leaderboard).filter(
                Leaderboard.game_id == game.game_id
            ).order_by(Leaderboard.rank).all()
            
            # Ottieni i punteggi MASSIMI reali dalle sessioni per ogni utente
            from sqlalchemy import func
            real_high_scores = session.query(
                GameSession.user_id,
                func.max(GameSession.score).label('max_score')
            ).filter(
                GameSession.game_id == game.game_id,
                GameSession.ended_at.isnot(None)
            ).group_by(GameSession.user_id).all()
            
            # Crea un dizionario user_id -> max_score reale
            real_scores_dict = {row.user_id: row.max_score for row in real_high_scores}
            
            print(f"\n📊 LEADERBOARD (Top 10):")
            print(f"{'Rank':<6} {'Utente':<25} {'Score Leaderboard':<20} {'Score Reale':<20} {'Status':<15}")
            print("-" * 80)
            
            inconsistencies = []
            
            for entry in leaderboard_entries[:10]:
                user = session.query(User).filter(User.user_id == entry.user_id).first()
                username = user.username if user and user.username else f"Anon ({entry.user_id[:8]})"
                
                real_score = real_scores_dict.get(entry.user_id, 0)
                leaderboard_score = entry.score
                
                if real_score != leaderboard_score:
                    status = "⚠️ INCONGRUENZA"
                    inconsistencies.append({
                        'user_id': entry.user_id,
                        'username': username,
                        'leaderboard_score': leaderboard_score,
                        'real_score': real_score,
                        'game_id': game.game_id
                    })
                else:
                    status = "✅ OK"
                
                print(f"{entry.rank or 'N/A':<6} {username:<25} {leaderboard_score:<20} {real_score:<20} {status:<15}")
            
            # Verifica se ci sono utenti con sessioni che non sono in leaderboard
            leaderboard_users = {e.user_id for e in leaderboard_entries}
            real_users = set(real_scores_dict.keys())
            missing_users = real_users - leaderboard_users
            
            if missing_users:
                print(f"\n⚠️ UTENTI CON SESSIONI MA NON IN LEADERBOARD:")
                for user_id in missing_users:
                    user = session.query(User).filter(User.user_id == user_id).first()
                    username = user.username if user and user.username else f"Anon ({user_id[:8]})"
                    print(f"   - {username}: score reale = {real_scores_dict[user_id]}")
            
            if inconsistencies:
                print(f"\n⚠️ TROVATE {len(inconsistencies)} INCONGRUENZE PER QUESTO GIOCO!")
            else:
                print(f"\n✅ Nessuna incongruenza trovata per questo gioco")
            
            print()
        
        print("\n" + "="*80)
        print("RIEPILOGO DETTAGLIATO INCONGRUENZE")
        print("="*80 + "\n")
        
        # Mostra dettagli per ogni incongruenza
        for game in games:
            leaderboard_entries = session.query(Leaderboard).filter(
                Leaderboard.game_id == game.game_id
            ).all()
            
            found_issues = False
            
            for entry in leaderboard_entries:
                # Trova la sessione con il punteggio massimo per questo utente
                max_session = session.query(GameSession).filter(
                    GameSession.user_id == entry.user_id,
                    GameSession.game_id == game.game_id,
                    GameSession.ended_at.isnot(None)
                ).order_by(desc(GameSession.score)).first()
                
                if max_session and max_session.score != entry.score:
                    if not found_issues:
                        print(f"\n🎮 {game.title}:")
                        found_issues = True
                    
                    user = session.query(User).filter(User.user_id == entry.user_id).first()
                    username = user.username if user and user.username else f"Anonymous ({entry.user_id[:8]})"
                    
                    print(f"\n   Utente: {username}")
                    print(f"   ❌ Leaderboard score: {entry.score}")
                    print(f"   ✅ Score reale (max sessione): {max_session.score}")
                    print(f"   📝 Session ID con max score: {max_session.session_id}")
                    print(f"   🕐 Data sessione: {max_session.ended_at}")
                    print(f"   🔢 Differenza: {max_session.score - entry.score}")

if __name__ == "__main__":
    check_leaderboard_consistency()
