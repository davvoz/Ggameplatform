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
    """Get database statistics and all data from all tables"""
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
    
    # Get all users
    cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
    user_rows = cursor.fetchall()
    users = []
    for row in user_rows:
        user = dict(row)
        user['metadata'] = json.loads(user['metadata']) if user['metadata'] else {}
        users.append(user)
    
    # Get all game sessions
    cursor.execute("SELECT * FROM game_sessions ORDER BY started_at DESC LIMIT 100")
    session_rows = cursor.fetchall()
    sessions = []
    for row in session_rows:
        session = dict(row)
        session['metadata'] = json.loads(session['metadata']) if session['metadata'] else {}
        sessions.append(session)
    
    # Get all achievements
    cursor.execute("SELECT * FROM user_achievements ORDER BY earned_at DESC LIMIT 100")
    achievement_rows = cursor.fetchall()
    achievements = []
    for row in achievement_rows:
        achievement = dict(row)
        achievement['metadata'] = json.loads(achievement['metadata']) if achievement['metadata'] else {}
        achievements.append(achievement)
    
    # Get all leaderboard entries
    cursor.execute("SELECT * FROM leaderboards ORDER BY score DESC LIMIT 100")
    leaderboard_rows = cursor.fetchall()
    leaderboard = []
    for row in leaderboard_rows:
        entry = dict(row)
        entry['metadata'] = json.loads(entry['metadata']) if entry['metadata'] else {}
        leaderboard.append(entry)
    
    conn.close()
    
    return {
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": len(sessions),
        "total_achievements": len(achievements),
        "total_leaderboard_entries": len(leaderboard),
        "total_categories": len(categories),
        "total_authors": len(authors),
        "games": games,
        "users": users,
        "sessions": sessions,
        "achievements": achievements,
        "leaderboard": leaderboard,
        "categories": list(categories),
        "authors": list(authors)
    }

@router.get("/db-export")
async def export_database():
    """Export complete database as JSON"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Export games
    cursor.execute("SELECT * FROM games ORDER BY created_at DESC")
    rows = cursor.fetchall()
    games = []
    for row in rows:
        game = dict(row)
        game['tags'] = json.loads(game['tags']) if game['tags'] else []
        game['metadata'] = json.loads(game['metadata']) if game['metadata'] else {}
        games.append(game)
    
    # Export users
    cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
    user_rows = cursor.fetchall()
    users = []
    for row in user_rows:
        user = dict(row)
        user['metadata'] = json.loads(user['metadata']) if user['metadata'] else {}
        users.append(user)
    
    # Export sessions
    cursor.execute("SELECT * FROM game_sessions ORDER BY started_at DESC")
    session_rows = cursor.fetchall()
    sessions = []
    for row in session_rows:
        session = dict(row)
        session['metadata'] = json.loads(session['metadata']) if session['metadata'] else {}
        sessions.append(session)
    
    # Export achievements
    cursor.execute("SELECT * FROM user_achievements ORDER BY earned_at DESC")
    achievement_rows = cursor.fetchall()
    achievements = []
    for row in achievement_rows:
        achievement = dict(row)
        achievement['metadata'] = json.loads(achievement['metadata']) if achievement['metadata'] else {}
        achievements.append(achievement)
    
    # Export leaderboard
    cursor.execute("SELECT * FROM leaderboards ORDER BY score DESC")
    leaderboard_rows = cursor.fetchall()
    leaderboard = []
    for row in leaderboard_rows:
        entry = dict(row)
        entry['metadata'] = json.loads(entry['metadata']) if entry['metadata'] else {}
        leaderboard.append(entry)
    
    conn.close()
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": len(sessions),
        "total_achievements": len(achievements),
        "total_leaderboard_entries": len(leaderboard),
        "games": games,
        "users": users,
        "sessions": sessions,
        "achievements": achievements,
        "leaderboard": leaderboard
    }
