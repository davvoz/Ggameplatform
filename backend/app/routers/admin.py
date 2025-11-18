from fastapi import APIRouter, HTTPException, Response, Request, Header
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from typing import Dict, List, Any, Optional
from pathlib import Path
from app.database import (
    get_db_session,
    get_open_sessions, 
    close_open_sessions, 
    force_close_session
)
from app.models import Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest
from sqlalchemy import desc
import json
import os
from datetime import datetime

router = APIRouter()

# Admin API key from environment
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-admin-key-change-in-production")

def verify_admin(x_api_key: Optional[str] = Header(None), request: Request = None):
    """Verify admin access via API key or localhost"""
    # Allow localhost and local network in development
    if request:
        client_ip = request.client.host
        # Allow localhost
        if client_ip in ["127.0.0.1", "localhost", "::1"]:
            return True
        # Allow local network (192.168.x.x)
        if client_ip.startswith("192.168."):
            return True
    
    # Check API key
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Admin access denied")
    
    return True

@router.get("/db-viewer", response_class=HTMLResponse)
async def db_viewer(request: Request, x_api_key: Optional[str] = Header(None)):
    """Database viewer interface"""
    verify_admin(x_api_key, request)
    html_file = Path(__file__).parent.parent / "static" / "db-viewer.html"
    return FileResponse(html_file)

@router.get("/db-stats")
async def get_db_stats(request: Request, x_api_key: Optional[str] = Header(None)):
    """Get database statistics and all data from all tables"""
    verify_admin(x_api_key, request)
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
        
        # Count total records for accurate statistics
        total_sessions_count = session.query(GameSession).count()
        total_leaderboard_count = session.query(Leaderboard).count()
        total_user_quests_count = session.query(UserQuest).count()
        
        print(f"[DEBUG] Total sessions in DB: {total_sessions_count}")
        print(f"[DEBUG] Total leaderboard in DB: {total_leaderboard_count}")
        print(f"[DEBUG] Total user quests in DB: {total_user_quests_count}")
        
        # Get game sessions (all records for display)
        sessions_query = session.query(GameSession).order_by(desc(GameSession.started_at)).all()
        sessions = [s.to_dict() for s in sessions_query]
        
        # DEBUG: Check if score is in the dict
        if sessions:
            print(f"[DEBUG] First session from db-stats: {sessions[0]}")
            print(f"[DEBUG] First session score: {sessions[0].get('score')}")
        
        # Get all leaderboard entries
        leaderboard_query = session.query(Leaderboard).order_by(desc(Leaderboard.score)).all()
        leaderboard = [entry.to_dict() for entry in leaderboard_query]
        
        # Get all XP rules
        xp_rules_query = session.query(XPRule).order_by(XPRule.game_id, desc(XPRule.priority)).all()
        xp_rules = [rule.to_dict() for rule in xp_rules_query]
        
        # Get all quests
        quests_query = session.query(Quest).order_by(Quest.quest_id).all()
        quests = [quest.to_dict() for quest in quests_query]
        
        # Get user quest progress
        user_quests_query = session.query(UserQuest).order_by(desc(UserQuest.started_at)).all()
        user_quests = [uq.to_dict() for uq in user_quests_query]
    
    data = {
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": total_sessions_count,
        "total_leaderboard_entries": total_leaderboard_count,
        "total_xp_rules": len(xp_rules),
        "total_quests": len(quests),
        "total_user_quests": total_user_quests_count,
        "total_categories": len(categories),
        "total_authors": len(authors),
        "games": games,
        "users": users,
        "sessions": sessions,
        "leaderboard": leaderboard,
        "xp_rules": xp_rules,
        "quests": quests,
        "user_quests": user_quests,
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
        
        # Export leaderboard using ORM
        leaderboard_query = session.query(Leaderboard).order_by(desc(Leaderboard.score)).all()
        leaderboard = [entry.to_dict() for entry in leaderboard_query]
        
        # Export XP rules using ORM
        xp_rules_query = session.query(XPRule).order_by(XPRule.game_id, desc(XPRule.priority)).all()
        xp_rules = [rule.to_dict() for rule in xp_rules_query]
        
        # Export quests using ORM
        quests_query = session.query(Quest).order_by(Quest.quest_id).all()
        quests = [quest.to_dict() for quest in quests_query]
        
        # Export user quests using ORM
        user_quests_query = session.query(UserQuest).order_by(desc(UserQuest.started_at)).all()
        user_quests = [uq.to_dict() for uq in user_quests_query]
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": len(sessions),
        "total_leaderboard_entries": len(leaderboard),
        "total_xp_rules": len(xp_rules),
        "total_quests": len(quests),
        "total_user_quests": len(user_quests),
        "games": games,
        "users": users,
        "sessions": sessions,
        "leaderboard": leaderboard,
        "xp_rules": xp_rules,
        "quests": quests,
        "user_quests": user_quests
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
