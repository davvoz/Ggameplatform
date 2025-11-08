import sqlite3
from pathlib import Path
from typing import Optional, List, Dict
import json
from datetime import datetime

DATABASE_PATH = Path(__file__).parent / "game_platform.db"

def get_db_connection():
    """Create a database connection."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            author TEXT,
            version TEXT,
            thumbnail TEXT,
            entry_point TEXT NOT NULL,
            category TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT
        )
    """)
    
    conn.commit()
    conn.close()

def create_game(game_data: dict) -> dict:
    """Insert a new game into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO games (
            game_id, title, description, author, version,
            thumbnail, entry_point, category, tags,
            created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        game_data['gameId'],
        game_data['title'],
        game_data.get('description', ''),
        game_data.get('author', ''),
        game_data.get('version', '1.0.0'),
        game_data.get('thumbnail', ''),
        game_data['entryPoint'],
        game_data.get('category', 'uncategorized'),
        json.dumps(game_data.get('tags', [])),
        now,
        now,
        json.dumps(game_data.get('metadata', {}))
    ))
    
    conn.commit()
    conn.close()
    
    return {**game_data, 'createdAt': now, 'updatedAt': now}

def get_all_games() -> List[dict]:
    """Retrieve all games from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM games ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    games = []
    for row in rows:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        games.append(game)
    
    return games

def get_game_by_id(game_id: str) -> Optional[dict]:
    """Retrieve a specific game by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM games WHERE game_id = ?", (game_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        return game
    
    return None

def update_game(game_id: str, game_data: dict) -> Optional[dict]:
    """Update an existing game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        UPDATE games SET
            title = ?, description = ?, author = ?, version = ?,
            thumbnail = ?, entry_point = ?, category = ?, tags = ?,
            updated_at = ?, metadata = ?
        WHERE game_id = ?
    """, (
        game_data.get('title'),
        game_data.get('description', ''),
        game_data.get('author', ''),
        game_data.get('version', '1.0.0'),
        game_data.get('thumbnail', ''),
        game_data.get('entryPoint'),
        game_data.get('category', 'uncategorized'),
        json.dumps(game_data.get('tags', [])),
        now,
        json.dumps(game_data.get('metadata', {})),
        game_id
    ))
    
    conn.commit()
    conn.close()
    
    return get_game_by_id(game_id)

def delete_game(game_id: str) -> bool:
    """Delete a game from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM games WHERE game_id = ?", (game_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted
