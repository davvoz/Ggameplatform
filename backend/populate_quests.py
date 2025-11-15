"""
Script to populate the quests table with platform quests.
Based on the quest specifications from the analyst.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_db_session
from app.models import Quest

def populate_quests():
    """Populate the quests table with all platform quests."""
    
    # Get database session using context manager
    with get_db_session() as db:
        # Current timestamp
        now = datetime.utcnow().isoformat()
        
        # Define all 20 quests based on the image specifications
        quests = [
            {
                "title": "Gioca 10 partite",
                "description": "Completa 10 partite su qualsiasi gioco della piattaforma",
                "quest_type": "play_games",
                "target_value": 10,
                "xp_reward": 150,
                "sats_reward": 0
            },
            {
                "title": "Gioca 50 partite",
                "description": "Completa 50 partite su qualsiasi gioco della piattaforma",
                "quest_type": "play_games",
                "target_value": 50,
                "xp_reward": 250,
                "sats_reward": 3
            },
            {
                "title": "Gioca 100 partite",
                "description": "Completa 100 partite su qualsiasi gioco della piattaforma",
                "quest_type": "play_games",
                "target_value": 100,
                "xp_reward": 350,
                "sats_reward": 5
            },
            {
                "title": "Gioca 10 minuti",
                "description": "Gioca per un totale di 10 minuti",
                "quest_type": "play_time",
                "target_value": 600,  # 10 minutes in seconds
                "xp_reward": 100,
                "sats_reward": 0
            },
            {
                "title": "Gioca 60 minuti totali",
                "description": "Gioca per un totale di 60 minuti",
                "quest_type": "play_time",
                "target_value": 3600,  # 60 minutes in seconds
                "xp_reward": 200,
                "sats_reward": 0
            },
            {
                "title": "Gioca 24 ore totali (cumulative)",
                "description": "Gioca per un totale cumulativo di 24 ore",
                "quest_type": "play_time_cumulative",
                "target_value": 86400,  # 24 hours in seconds
                "xp_reward": 500,
                "sats_reward": 10
            },
            {
                "title": "Completa 5 partite di un gioco con punteggio ≥ X",
                "description": "Completa 5 partite dello stesso gioco con un punteggio minimo definito per-game",
                "quest_type": "score_threshold_per_game",
                "target_value": 5,
                "xp_reward": 200,
                "sats_reward": 3
            },
            {
                "title": "Login dopo 24h",
                "description": "Effettua il login dopo almeno 24 ore dall'ultimo accesso",
                "quest_type": "login_after_24h",
                "target_value": 1,
                "xp_reward": 50,
                "sats_reward": 0
            },
            {
                "title": "Login 7 giorni consecutivi",
                "description": "Effettua il login per 7 giorni consecutivi",
                "quest_type": "login_streak",
                "target_value": 7,
                "xp_reward": 200,
                "sats_reward": 10
            },
            {
                "title": "Gioca 5 partite dello stesso gioco",
                "description": "Completa 5 partite dello stesso gioco",
                "quest_type": "play_same_game",
                "target_value": 5,
                "xp_reward": 150,
                "sats_reward": 0
            },
            {
                "title": "Ottieni un punteggio che termina con 0",
                "description": "Ottieni un punteggio che termina con la cifra 0",
                "quest_type": "score_ends_with",
                "target_value": 0,
                "xp_reward": 100,
                "sats_reward": 0
            },
            {
                "title": "Entra nella Top 5 della leaderboard settimanale",
                "description": "Raggiungi una posizione nella top 5 della classifica settimanale",
                "quest_type": "leaderboard_top",
                "target_value": 5,
                "xp_reward": 400,
                "sats_reward": 10
            },
            {
                "title": "Completa 50 partite in una settimana",
                "description": "Completa 50 partite nell'arco di una settimana",
                "quest_type": "play_games_weekly",
                "target_value": 50,
                "xp_reward": 350,
                "sats_reward": 7
            },
            {
                "title": "Gioca 30 minuti totali in un giorno",
                "description": "Gioca per un totale di 30 minuti in un singolo giorno",
                "quest_type": "play_time_daily",
                "target_value": 1800,  # 30 minutes in seconds
                "xp_reward": 200,
                "sats_reward": 3
            },
            {
                "title": "Raggiungi livello 10",
                "description": "Raggiungi il livello 10 della piattaforma",
                "quest_type": "reach_level",
                "target_value": 10,
                "xp_reward": 200,
                "sats_reward": 3
            },
            {
                "title": "Guadagna 500 XP in un giorno",
                "description": "Guadagna un totale di 500 XP in un singolo giorno",
                "quest_type": "xp_daily",
                "target_value": 500,
                "xp_reward": 200,
                "sats_reward": 5
            },
            {
                "title": "Guadagna 2000 XP in una settimana",
                "description": "Guadagna un totale di 2000 XP nell'arco di una settimana",
                "quest_type": "xp_weekly",
                "target_value": 2000,
                "xp_reward": 250,
                "sats_reward": 5
            },
            {
                "title": "Raggiungi livello 30",
                "description": "Raggiungi il livello 30 della piattaforma",
                "quest_type": "reach_level",
                "target_value": 30,
                "xp_reward": 350,
                "sats_reward": 7
            },
            {
                "title": "Raggiungi livello 50",
                "description": "Raggiungi il livello 50 della piattaforma",
                "quest_type": "reach_level",
                "target_value": 50,
                "xp_reward": 500,
                "sats_reward": 10
            },
            {
                "title": "Completa 10 quest totali",
                "description": "Completa un totale di 10 quest diverse",
                "quest_type": "complete_quests",
                "target_value": 10,
                "xp_reward": 500,
                "sats_reward": 10
            }
        ]
        
        # Check if quests already exist
        existing_count = db.query(Quest).count()
        if existing_count > 0:
            print(f"Found {existing_count} existing quests. Deleting...")
            db.query(Quest).delete()
            db.commit()
        
        # Insert all quests
        print(f"Inserting {len(quests)} quests...")
        for quest_data in quests:
            quest = Quest(
                title=quest_data["title"],
                description=quest_data["description"],
                quest_type=quest_data["quest_type"],
                target_value=quest_data["target_value"],
                xp_reward=quest_data["xp_reward"],
                sats_reward=quest_data["sats_reward"],
                
                is_active=1,
                created_at=now
            )
            db.add(quest)
        
        db.commit()
        
        # Verify
        total = db.query(Quest).count()
        print(f"\n✅ Successfully populated {total} quests!")
        
        # Display quests
        print("\n📋 Quests:")
        print("-" * 100)
        all_quests = db.query(Quest).all()
        for q in all_quests:
            print(f"{q.quest_id:2d}. {q.title:50s} | XP: {q.xp_reward:3d} | Sats: {q.sats_reward:2d}")

if __name__ == "__main__":
    populate_quests()

