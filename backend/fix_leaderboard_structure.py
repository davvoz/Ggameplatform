"""
Script per correggere la struttura della tabella leaderboard.

PROBLEMA:
- Attualmente la tabella permette multipli record per utente per gioco
- entry_id è la PK, ma dovrebbe essere (user_id, game_id) UNIQUE

SOLUZIONE:
1. Aggiungi constraint UNIQUE(user_id, game_id) al modello
2. Aggiorna il trigger per fare UPSERT invece di INSERT
3. Pulisci i dati esistenti mantenendo solo il punteggio migliore per utente/gioco
"""
import uuid
from datetime import datetime
from sqlalchemy import func, and_
from app.database import get_db_session
from app.models import Leaderboard, GameSession, Game, User


def cleanup_duplicate_leaderboard_entries():
    """
    Rimuove entry duplicate mantenendo solo il punteggio migliore per ogni coppia (user_id, game_id).
    """
    print("\n" + "="*80)
    print("PULIZIA LEADERBOARD - RIMOZIONE DUPLICATI")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Ottieni tutte le combinazioni user_id, game_id
        unique_pairs = session.query(
            Leaderboard.user_id,
            Leaderboard.game_id
        ).distinct().all()
        
        total_removed = 0
        total_updated = 0
        
        for user_id, game_id in unique_pairs:
            # Trova tutte le entry per questa coppia
            entries = session.query(Leaderboard).filter(
                and_(
                    Leaderboard.user_id == user_id,
                    Leaderboard.game_id == game_id
                )
            ).order_by(Leaderboard.score.desc()).all()
            
            if len(entries) > 1:
                # Mantieni solo la prima (punteggio più alto)
                best_entry = entries[0]
                duplicates = entries[1:]
                
                # Ottieni il gioco e l'utente per il log
                game = session.query(Game).filter(Game.game_id == game_id).first()
                user = session.query(User).filter(User.user_id == user_id).first()
                username = user.username if user and user.username else f"Anon ({user_id[:8]})"
                
                print(f"🎮 {game.title if game else game_id}")
                print(f"   Utente: {username}")
                print(f"   Trovate {len(entries)} entry duplicate")
                print(f"   ✅ Mantengo best score: {best_entry.score}")
                print(f"   ❌ Rimuovo {len(duplicates)} entry duplicate")
                
                # Rimuovi i duplicati
                for dup in duplicates:
                    print(f"      - Rimuovo entry_id={dup.entry_id} con score={dup.score}")
                    session.delete(dup)
                    total_removed += 1
                
                total_updated += 1
                print()
        
        session.commit()
        
        print("="*80)
        print(f"✅ COMPLETATO!")
        print(f"   Utenti/Giochi processati: {len(unique_pairs)}")
        print(f"   Combinazioni con duplicati corrette: {total_updated}")
        print(f"   Entry duplicate rimosse: {total_removed}")
        print("="*80 + "\n")


def rebuild_leaderboard_from_sessions():
    """
    Ricostruisce completamente la leaderboard dalle sessioni di gioco.
    Mantiene solo il punteggio migliore per ogni coppia (user_id, game_id).
    """
    print("\n" + "="*80)
    print("RICOSTRUZIONE LEADERBOARD DA SESSIONI")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Svuota la leaderboard
        deleted_count = session.query(Leaderboard).delete()
        print(f"🗑️  Rimossi {deleted_count} record dalla leaderboard\n")
        
        # Ottieni il punteggio massimo per ogni coppia (user_id, game_id) dalle sessioni
        max_scores = session.query(
            GameSession.user_id,
            GameSession.game_id,
            func.max(GameSession.score).label('max_score'),
            func.max(GameSession.ended_at).label('last_played')
        ).filter(
            GameSession.ended_at.isnot(None)
        ).group_by(
            GameSession.user_id,
            GameSession.game_id
        ).all()
        
        print(f"📊 Trovate {len(max_scores)} combinazioni uniche utente/gioco\n")
        
        # Crea nuove entry nella leaderboard
        entries_created = 0
        for row in max_scores:
            user_id = row.user_id
            game_id = row.game_id
            max_score = row.max_score
            last_played = row.last_played
            
            # Ottieni info per il log
            game = session.query(Game).filter(Game.game_id == game_id).first()
            user = session.query(User).filter(User.user_id == user_id).first()
            username = user.username if user and user.username else f"Anon ({user_id[:8]})"
            game_title = game.title if game else game_id
            
            # Crea la nuova entry
            new_entry = Leaderboard(
                entry_id=f"lb_{uuid.uuid4().hex[:16]}",
                user_id=user_id,
                game_id=game_id,
                score=max_score,
                rank=None,  # Verrà calcolato dopo
                created_at=last_played or datetime.utcnow().isoformat()
            )
            session.add(new_entry)
            entries_created += 1
            
            print(f"✅ {game_title:<40} | {username:<20} | Score: {max_score}")
        
        session.commit()
        
        print(f"\n{'='*80}")
        print(f"✅ Leaderboard ricostruita!")
        print(f"   Entry create: {entries_created}")
        print(f"{'='*80}\n")
        
        # Ricalcola i rank
        recalculate_all_ranks(session)


def recalculate_all_ranks(session):
    """Ricalcola i rank per tutti i giochi."""
    print("\n" + "="*80)
    print("RICALCOLO RANK")
    print("="*80 + "\n")
    
    # Ottieni tutti i game_id unici
    game_ids = session.query(Leaderboard.game_id).distinct().all()
    
    for (game_id,) in game_ids:
        game = session.query(Game).filter(Game.game_id == game_id).first()
        game_title = game.title if game else game_id
        
        # Ottieni tutte le entry per questo gioco ordinate per score
        entries = session.query(Leaderboard).filter(
            Leaderboard.game_id == game_id
        ).order_by(Leaderboard.score.desc()).all()
        
        print(f"🎮 {game_title}")
        print(f"   Aggiorno rank per {len(entries)} entry")
        
        # Assegna i rank
        for idx, entry in enumerate(entries, start=1):
            entry.rank = idx
            if idx <= 3:  # Mostra i primi 3
                user = session.query(User).filter(User.user_id == entry.user_id).first()
                username = user.username if user and user.username else f"Anon ({entry.user_id[:8]})"
                print(f"   {idx}° - {username}: {entry.score}")
        print()
    
    session.commit()
    print(f"{'='*80}")
    print("✅ Rank ricalcolati!")
    print(f"{'='*80}\n")


def verify_leaderboard_integrity():
    """Verifica che non ci siano duplicati nella leaderboard."""
    print("\n" + "="*80)
    print("VERIFICA INTEGRITÀ LEADERBOARD")
    print("="*80 + "\n")
    
    with get_db_session() as session:
        # Conta le entry totali
        total_entries = session.query(Leaderboard).count()
        
        # Conta le combinazioni uniche (user_id, game_id)
        unique_pairs = session.query(
            Leaderboard.user_id,
            Leaderboard.game_id
        ).distinct().count()
        
        print(f"📊 Entry totali nella leaderboard: {total_entries}")
        print(f"📊 Combinazioni uniche (user_id, game_id): {unique_pairs}")
        
        if total_entries == unique_pairs:
            print(f"\n✅ LEADERBOARD CORRETTA!")
            print(f"   Ogni utente ha esattamente 1 entry per gioco\n")
        else:
            print(f"\n❌ ERRORE: Trovati duplicati!")
            print(f"   Differenza: {total_entries - unique_pairs} entry duplicate\n")
            
            # Trova le entry duplicate
            duplicates = session.query(
                Leaderboard.user_id,
                Leaderboard.game_id,
                func.count(Leaderboard.entry_id).label('count')
            ).group_by(
                Leaderboard.user_id,
                Leaderboard.game_id
            ).having(func.count(Leaderboard.entry_id) > 1).all()
            
            print(f"   Entry con duplicati:")
            for user_id, game_id, count in duplicates:
                user = session.query(User).filter(User.user_id == user_id).first()
                game = session.query(Game).filter(Game.game_id == game_id).first()
                username = user.username if user and user.username else f"Anon ({user_id[:8]})"
                game_title = game.title if game else game_id
                print(f"   - {game_title} | {username}: {count} entry")
        
        print(f"{'='*80}\n")


if __name__ == "__main__":
    import sys
    
    print("\n🔧 FIX LEADERBOARD STRUCTURE")
    print("="*80)
    print("Questo script corregge la struttura della leaderboard:")
    print("  1. Rimuove entry duplicate")
    print("  2. Mantiene solo il punteggio migliore per ogni utente/gioco")
    print("  3. Ricalcola i rank")
    print("="*80 + "\n")
    
    # Check for --yes flag
    auto_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    if "--rebuild" in sys.argv:
        print("⚠️  Modalità REBUILD: la leaderboard verrà completamente ricostruita\n")
        if not auto_confirm:
            response = input("Continuare? (s/n): ")
            if response.lower() != 's':
                print("Operazione annullata.")
                sys.exit(0)
        else:
            print("✅ Auto-confermato con flag --yes\n")
        rebuild_leaderboard_from_sessions()
    else:
        print("Modalità CLEANUP: rimuoverà solo i duplicati\n")
        if not auto_confirm:
            response = input("Continuare? (s/n): ")
            if response.lower() != 's':
                print("Operazione annullata.")
                sys.exit(0)
        else:
            print("✅ Auto-confermato con flag --yes\n")
        cleanup_duplicate_leaderboard_entries()
        
        # Ricalcola i rank dopo la pulizia
        with get_db_session() as session:
            recalculate_all_ranks(session)
    
    # Verifica finale
    verify_leaderboard_integrity()
