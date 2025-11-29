#!/usr/bin/env python3
"""
Migration Script: Populate Game Statuses

This script:
1. Creates the initial game statuses (Sviluppato, In Sviluppo, Deprecato, Sperimentale)
2. Optionally sets a default status for existing games
3. Can be run multiple times safely (idempotent)

Usage:
    python backend/scripts/populate_game_statuses.py
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from app.database import (
    get_db_session,
    create_game_status,
    get_game_status_by_code,
    get_all_game_statuses
)
from app.models import Game

# Default game statuses to create
DEFAULT_STATUSES = [
    {
        "status_name": "Sviluppato",
        "status_code": "developed",
        "description": "Gioco completamente sviluppato e pronto per la produzione",
        "display_order": 1,
        "is_active": True
    },
    {
        "status_name": "In Sviluppo",
        "status_code": "in_development",
        "description": "Gioco attualmente in fase di sviluppo",
        "display_order": 2,
        "is_active": True
    },
    {
        "status_name": "Deprecato",
        "status_code": "deprecated",
        "description": "Gioco non più supportato o mantenuto",
        "display_order": 3,
        "is_active": True
    },
    {
        "status_name": "Sperimentale",
        "status_code": "experimental",
        "description": "Gioco in fase sperimentale, potrebbe contenere bug o funzionalità instabili",
        "display_order": 4,
        "is_active": True
    }
]


def populate_statuses():
    """Create default game statuses if they don't exist."""
    print("=" * 60)
    print("POPULATE GAME STATUSES")
    print("=" * 60)
    print()
    
    created_count = 0
    existing_count = 0
    
    for status_data in DEFAULT_STATUSES:
        try:
            # Check if status already exists
            existing = get_game_status_by_code(status_data["status_code"])
            
            if existing:
                print(f"✓ Status '{status_data['status_name']}' ({status_data['status_code']}) already exists")
                existing_count += 1
            else:
                # Create new status
                created = create_game_status(status_data)
                print(f"✓ Created status '{status_data['status_name']}' ({status_data['status_code']})")
                created_count += 1
        
        except Exception as e:
            print(f"✗ Error creating status '{status_data['status_name']}': {e}")
    
    print()
    print(f"Summary: {created_count} created, {existing_count} already existed")
    print()
    
    return created_count > 0


def assign_default_status_to_games():
    """Assign the 'developed' status to games that don't have a status."""
    print("=" * 60)
    print("ASSIGN DEFAULT STATUS TO EXISTING GAMES")
    print("=" * 60)
    print()
    
    # Get the 'developed' status
    developed_status = get_game_status_by_code("developed")
    
    if not developed_status:
        print("✗ Error: 'developed' status not found. Please run populate_statuses() first.")
        return
    
    status_id = developed_status["status_id"]
    
    with get_db_session() as session:
        # Find games without a status
        games_without_status = session.query(Game).filter(
            Game.status_id.is_(None)
        ).all()
        
        if not games_without_status:
            print("✓ All games already have a status assigned")
            return
        
        print(f"Found {len(games_without_status)} games without status")
        print(f"Assigning status 'Sviluppato' (ID: {status_id}) to these games...")
        print()
        
        updated_count = 0
        for game in games_without_status:
            game.status_id = status_id
            print(f"  ✓ {game.game_id}: {game.title}")
            updated_count += 1
        
        session.flush()
        
        print()
        print(f"Summary: Updated {updated_count} games with default status")


def display_all_statuses():
    """Display all game statuses."""
    print()
    print("=" * 60)
    print("CURRENT GAME STATUSES")
    print("=" * 60)
    print()
    
    statuses = get_all_game_statuses()
    
    if not statuses:
        print("No statuses found in database")
        return
    
    for status in statuses:
        active = "✓" if status["is_active"] else "✗"
        print(f"{active} [{status['status_id']}] {status['status_name']} ({status['status_code']})")
        print(f"   {status['description']}")
        print(f"   Order: {status['display_order']}")
        print()


def main():
    """Main migration function."""
    print("\n" + "=" * 60)
    print("GAME STATUS MIGRATION SCRIPT")
    print("=" * 60)
    print()
    
    try:
        # Step 1: Populate game statuses
        created = populate_statuses()
        
        # Step 2: Assign default status to existing games (if new statuses were created)
        if created:
            response = input("\nDo you want to assign 'Sviluppato' status to existing games without a status? (y/n): ").strip().lower()
            if response == 'y':
                assign_default_status_to_games()
        
        # Step 3: Display all statuses
        display_all_statuses()
        
        print("=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("ERROR DURING MIGRATION")
        print("=" * 60)
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
