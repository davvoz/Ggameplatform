from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from typing import Dict, List, Any
from pathlib import Path
from app.database import (
    get_db_session,
    get_open_sessions, 
    close_open_sessions, 
    force_close_session
)
from app.models import Game, User, GameSession, UserAchievement, Leaderboard
from sqlalchemy import desc
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
    with get_db_session() as session:
        # Get all games using ORM
        games_query = session.query(Game).order_by(desc(Game.created_at)).all()
        
        games = []
        categories = set()
        authors = set()
        
        for game in games_query:
            game_dict = game.to_dict()
            games.append(game_dict)
            
            categories.add(game.category)
            if game.author:
                authors.add(game.author)
        
        # Get all users using ORM
        users_query = session.query(User).order_by(desc(User.created_at)).all()
        users = [user.to_dict() for user in users_query]
        
        # Get all game sessions (limited to 100)
        sessions_query = session.query(GameSession).order_by(desc(GameSession.started_at)).limit(100).all()
        sessions = [s.to_dict() for s in sessions_query]
        
        # DEBUG: Check if score is in the dict
        if sessions:
            print(f"[DEBUG] First session from db-stats: {sessions[0]}")
            print(f"[DEBUG] First session score: {sessions[0].get('score')}")
        
        # Get all achievements (limited to 100)
        achievements_query = session.query(UserAchievement).order_by(desc(UserAchievement.earned_at)).limit(100).all()
        achievements = [a.to_dict() for a in achievements_query]
        
        # Get all leaderboard entries (limited to 100)
        leaderboard_query = session.query(Leaderboard).order_by(desc(Leaderboard.score)).limit(100).all()
        leaderboard = [entry.to_dict() for entry in leaderboard_query]
    
    data = {
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
    
    # Return with no-cache headers
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/db-export")
async def export_database():
    """Export complete database as JSON"""
    with get_db_session() as session:
        # Export games using ORM
        games_query = session.query(Game).order_by(desc(Game.created_at)).all()
        games = [game.to_dict() for game in games_query]
        
        # Export users using ORM
        users_query = session.query(User).order_by(desc(User.created_at)).all()
        users = [user.to_dict() for user in users_query]
        
        # Export sessions using ORM
        sessions_query = session.query(GameSession).order_by(desc(GameSession.started_at)).all()
        sessions = [s.to_dict() for s in sessions_query]
        
        # Export achievements using ORM
        achievements_query = session.query(UserAchievement).order_by(desc(UserAchievement.earned_at)).all()
        achievements = [a.to_dict() for a in achievements_query]
        
        # Export leaderboard using ORM
        leaderboard_query = session.query(Leaderboard).order_by(desc(Leaderboard.score)).all()
        leaderboard = [entry.to_dict() for entry in leaderboard_query]
    
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

@router.get("/sessions/open")
async def get_open_sessions_endpoint():
    """Get all open (unclosed) game sessions"""
    try:
        open_sessions = get_open_sessions()
        return {
            "success": True,
            "total_open": len(open_sessions),
            "sessions": open_sessions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/close-all")
async def close_all_sessions(max_duration_seconds: int = None):
    """Force close all open sessions"""
    try:
        closed_count = close_open_sessions(max_duration_seconds)
        return {
            "success": True,
            "message": f"Closed {closed_count} open sessions",
            "closed_count": closed_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/close")
async def force_close_single_session(session_id: str):
    """Force close a specific open session"""
    try:
        success = force_close_session(session_id)
        if not success:
            raise HTTPException(
                status_code=404, 
                detail=f"Session {session_id} not found or already closed"
            )
        return {
            "success": True,
            "message": f"Session {session_id} closed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
