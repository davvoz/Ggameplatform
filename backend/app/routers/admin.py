from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from typing import Dict, List, Any
from pathlib import Path
from app.database import get_db_connection
import json
from datetime import datetime

router = APIRouter()

@router.get("/db-viewer", response_class=HTMLResponse)
async def db_viewer():
    """Database viewer interface"""
    html_file = Path(__file__).parent.parent / "static" / "db-viewer.html"
    return FileResponse(html_file)

@router.get("/db-stats")
async def get_db_stats():
    """Get database statistics and all games"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all games
    cursor.execute("SELECT * FROM games ORDER BY created_at DESC")
    rows = cursor.fetchall()
    
    games = []
    categories = set()
    authors = set()
    
    for row in rows:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        games.append(game)
        
        categories.add(game['category'])
        if game['author']:
            authors.add(game['author'])
    
    conn.close()
    
    return {
        "total_games": len(games),
        "total_categories": len(categories),
        "total_authors": len(authors),
        "games": games,
        "categories": list(categories),
        "authors": list(authors)
    }

@router.get("/db-export")
async def export_database():
    """Export complete database as JSON"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM games ORDER BY created_at DESC")
    rows = cursor.fetchall()
    
    games = []
    for row in rows:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        games.append(game)
    
    conn.close()
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "total_records": len(games),
        "games": games
    }
