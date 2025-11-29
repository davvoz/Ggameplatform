from fastapi import APIRouter, HTTPException, Response, Request, Header, Depends
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from typing import Dict, List, Any, Optional
from pathlib import Path
from app.database import (
    get_db_session,
    get_open_sessions, 
    close_open_sessions, 
    force_close_session
)
from app.models import Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest, GameStatus
from app.repositories import RepositoryFactory
from app.services import ServiceFactory, ValidationError
from app.schemas import (
    GameRegister, GameUpdate,
    UserCreate, UserUpdate,
    GameSessionCreate, GameSessionUpdate,
    LeaderboardCreate, LeaderboardUpdate,
    XPRuleCreate, XPRuleUpdate,
    QuestCreate, QuestUpdate,
    UserQuestCreate, UserQuestUpdate,
    GameStatusCreate, GameStatusUpdate
)
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload
import json
import os
from datetime import datetime

router = APIRouter()


# Dependency to get DB session
def get_db():
    """Get database session as dependency"""
    with get_db_session() as session:
        yield session


@router.get("/form-options")
async def get_form_options(db: Session = Depends(get_db)):
    """
    Get all available options for foreign key fields in forms.
    Returns lists of valid IDs for user_id, game_id, quest_id, etc.
    Following SRP: single endpoint to provide all form options.
    """
    try:
        # Get all users
        user_repo = RepositoryFactory.create_user_repository(db)
        users = user_repo.get_all()
        
        # Get all games
        game_repo = RepositoryFactory.create_game_repository(db)
        games = game_repo.get_all()
        
        # Get all quests
        quest_repo = RepositoryFactory.create_quest_repository(db)
        quests = quest_repo.get_all()
        
        # Get all game statuses
        status_repo = RepositoryFactory.create_gamestatus_repository(db)
        statuses = status_repo.get_all()
        
        # Get all sessions (for leaderboard entry_id)
        session_repo = RepositoryFactory.create_session_repository(db)
        sessions = session_repo.get_all()
        
        return {
            "success": True,
            "data": {
                "user_ids": [{"value": u.user_id, "label": f"{u.username} ({u.user_id})"} for u in users],
                "game_ids": [{"value": g.game_id, "label": f"{g.title} ({g.game_id})"} for g in games],
                "quest_ids": [{"value": q.quest_id, "label": f"{q.title} (ID: {q.quest_id})"} for q in quests],
                "status_ids": [{"value": s.status_id, "label": f"{s.status_name} ({s.status_code})"} for s in statuses],
                "session_ids": [{"value": s.session_id, "label": f"{s.session_id} - {s.game_id}"} for s in sessions[:100]],  # Limit for performance
                "categories": list(set([g.category for g in games if g.category])),
                "quest_types": ["daily", "weekly", "achievement", "milestone"],
                "rule_types": ["score_threshold", "time_played", "games_completed", "streak", "achievement"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        # Allow Docker networks (172.x.x.x)
        if client_ip.startswith("172."):
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
        # Get all games using ORM with eager loading of status
        games_query = session.query(Game).options(joinedload(Game.status)).order_by(desc(Game.created_at)).all()
        
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
        
        # Get game sessions (all records for display)
        sessions_query = session.query(GameSession).order_by(desc(GameSession.started_at)).all()
        sessions = [s.to_dict() for s in sessions_query]
        
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
        
        # Get all game statuses
        statuses_query = session.query(GameStatus).order_by(GameStatus.display_order).all()
        statuses = [status.to_dict() for status in statuses_query]
    
    data = {
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": total_sessions_count,
        "total_leaderboard_entries": total_leaderboard_count,
        "total_xp_rules": len(xp_rules),
        "total_quests": len(quests),
        "total_user_quests": total_user_quests_count,
        "total_game_statuses": len(statuses),
        "total_categories": len(categories),
        "total_authors": len(authors),
        "games": games,
        "users": users,
        "sessions": sessions,
        "leaderboard": leaderboard,
        "xp_rules": xp_rules,
        "quests": quests,
        "user_quests": user_quests,
        "game_statuses": statuses,
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
        
        # Export game statuses using ORM
        statuses_query = session.query(GameStatus).order_by(GameStatus.display_order).all()
        statuses = [status.to_dict() for status in statuses_query]
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": len(sessions),
        "total_leaderboard_entries": len(leaderboard),
        "total_xp_rules": len(xp_rules),
        "total_quests": len(quests),
        "total_user_quests": len(user_quests),
        "total_game_statuses": len(statuses),
        "games": games,
        "users": users,
        "sessions": sessions,
        "leaderboard": leaderboard,
        "xp_rules": xp_rules,
        "quests": quests,
        "user_quests": user_quests,
        "game_statuses": statuses
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


# ========== GAMES CRUD ENDPOINTS ==========

@router.post("/games", status_code=201)
async def create_game(game_data: GameRegister, db: Session = Depends(get_db)):
    """Create a new game"""
    try:
        repo = RepositoryFactory.create_game_repository(db)
        service = ServiceFactory.create_game_service(repo)
        
        game = service.create(game_data.dict())
        return {"success": True, "data": game}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/games/{game_id}")
async def get_game(game_id: str, db: Session = Depends(get_db)):
    """Get a game by ID"""
    try:
        repo = RepositoryFactory.create_game_repository(db)
        service = ServiceFactory.create_game_service(repo)
        
        game = service.get(game_id)
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        return {"success": True, "data": game}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/games/{game_id}")
async def update_game(game_id: str, game_data: GameUpdate, db: Session = Depends(get_db)):
    """Update a game"""
    try:
        repo = RepositoryFactory.create_game_repository(db)
        service = ServiceFactory.create_game_service(repo)
        
        # Remove None values
        update_data = {k: v for k, v in game_data.dict().items() if v is not None}
        
        game = service.update(game_id, update_data)
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        return {"success": True, "data": game}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/games/{game_id}")
async def delete_game(game_id: str, db: Session = Depends(get_db)):
    """Delete a game"""
    try:
        repo = RepositoryFactory.create_game_repository(db)
        service = ServiceFactory.create_game_service(repo)
        
        success = service.delete(game_id)
        if not success:
            raise HTTPException(status_code=404, detail="Game not found")
        return {"success": True, "message": "Game deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== USERS CRUD ENDPOINTS ==========

@router.post("/users", status_code=201)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        repo = RepositoryFactory.create_user_repository(db)
        service = ServiceFactory.create_user_service(repo)
        
        user = service.create(user_data.dict())
        return {"success": True, "data": user}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get a user by ID"""
    try:
        repo = RepositoryFactory.create_user_repository(db)
        service = ServiceFactory.create_user_service(repo)
        
        user = service.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"success": True, "data": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user"""
    try:
        repo = RepositoryFactory.create_user_repository(db)
        service = ServiceFactory.create_user_service(repo)
        
        update_data = {k: v for k, v in user_data.dict().items() if v is not None}
        
        user = service.update(user_id, update_data)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"success": True, "data": user}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Delete a user"""
    try:
        repo = RepositoryFactory.create_user_repository(db)
        service = ServiceFactory.create_user_service(repo)
        
        success = service.delete(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== GAME SESSIONS CRUD ENDPOINTS ==========

@router.post("/game-sessions", status_code=201)
async def create_session(session_data: GameSessionCreate, db: Session = Depends(get_db)):
    """Create a new game session"""
    try:
        repo = RepositoryFactory.create_session_repository(db)
        service = ServiceFactory.create_session_service(repo)
        
        session = service.create(session_data.dict())
        return {"success": True, "data": session}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/game-sessions/{session_id}")
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a game session by ID"""
    try:
        repo = RepositoryFactory.create_session_repository(db)
        service = ServiceFactory.create_session_service(repo)
        
        session = service.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True, "data": session}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/game-sessions/{session_id}")
async def update_session(session_id: str, session_data: GameSessionUpdate, db: Session = Depends(get_db)):
    """Update a game session"""
    try:
        repo = RepositoryFactory.create_session_repository(db)
        service = ServiceFactory.create_session_service(repo)
        
        update_data = {k: v for k, v in session_data.dict().items() if v is not None}
        
        session = service.update(session_id, update_data)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True, "data": session}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/game-sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a game session"""
    try:
        repo = RepositoryFactory.create_session_repository(db)
        service = ServiceFactory.create_session_service(repo)
        
        success = service.delete(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True, "message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== LEADERBOARD CRUD ENDPOINTS ==========

@router.post("/leaderboard-entries", status_code=201)
async def create_leaderboard_entry(entry_data: LeaderboardCreate, db: Session = Depends(get_db)):
    """Create a new leaderboard entry"""
    try:
        repo = RepositoryFactory.create_leaderboard_repository(db)
        service = ServiceFactory.create_leaderboard_service(repo)
        
        entry = service.create(entry_data.dict())
        return {"success": True, "data": entry}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leaderboard-entries/{entry_id}")
async def get_leaderboard_entry(entry_id: str, db: Session = Depends(get_db)):
    """Get a leaderboard entry by ID"""
    try:
        repo = RepositoryFactory.create_leaderboard_repository(db)
        service = ServiceFactory.create_leaderboard_service(repo)
        
        entry = service.get(entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Leaderboard entry not found")
        return {"success": True, "data": entry}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/leaderboard-entries/{entry_id}")
async def update_leaderboard_entry(entry_id: str, entry_data: LeaderboardUpdate, db: Session = Depends(get_db)):
    """Update a leaderboard entry"""
    try:
        repo = RepositoryFactory.create_leaderboard_repository(db)
        service = ServiceFactory.create_leaderboard_service(repo)
        
        update_data = {k: v for k, v in entry_data.dict().items() if v is not None}
        
        entry = service.update(entry_id, update_data)
        if not entry:
            raise HTTPException(status_code=404, detail="Leaderboard entry not found")
        return {"success": True, "data": entry}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/leaderboard-entries/{entry_id}")
async def delete_leaderboard_entry(entry_id: str, db: Session = Depends(get_db)):
    """Delete a leaderboard entry"""
    try:
        repo = RepositoryFactory.create_leaderboard_repository(db)
        service = ServiceFactory.create_leaderboard_service(repo)
        
        success = service.delete(entry_id)
        if not success:
            raise HTTPException(status_code=404, detail="Leaderboard entry not found")
        return {"success": True, "message": "Leaderboard entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== XP RULES CRUD ENDPOINTS ==========

@router.post("/xp-rules", status_code=201)
async def create_xp_rule(rule_data: XPRuleCreate, db: Session = Depends(get_db)):
    """Create a new XP rule"""
    try:
        repo = RepositoryFactory.create_xprule_repository(db)
        service = ServiceFactory.create_xprule_service(repo)
        
        rule = service.create(rule_data.dict())
        return {"success": True, "data": rule}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/xp-rules/{rule_id}")
async def get_xp_rule(rule_id: str, db: Session = Depends(get_db)):
    """Get an XP rule by ID"""
    try:
        repo = RepositoryFactory.create_xprule_repository(db)
        service = ServiceFactory.create_xprule_service(repo)
        
        rule = service.get(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="XP rule not found")
        return {"success": True, "data": rule}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/xp-rules/{rule_id}")
async def update_xp_rule(rule_id: str, rule_data: XPRuleUpdate, db: Session = Depends(get_db)):
    """Update an XP rule"""
    try:
        repo = RepositoryFactory.create_xprule_repository(db)
        service = ServiceFactory.create_xprule_service(repo)
        
        update_data = {k: v for k, v in rule_data.dict().items() if v is not None}
        
        rule = service.update(rule_id, update_data)
        if not rule:
            raise HTTPException(status_code=404, detail="XP rule not found")
        return {"success": True, "data": rule}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/xp-rules/{rule_id}")
async def delete_xp_rule(rule_id: str, db: Session = Depends(get_db)):
    """Delete an XP rule"""
    try:
        repo = RepositoryFactory.create_xprule_repository(db)
        service = ServiceFactory.create_xprule_service(repo)
        
        success = service.delete(rule_id)
        if not success:
            raise HTTPException(status_code=404, detail="XP rule not found")
        return {"success": True, "message": "XP rule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== QUESTS CRUD ENDPOINTS ==========

@router.post("/quests-crud", status_code=201)
async def create_quest(quest_data: QuestCreate, db: Session = Depends(get_db)):
    """Create a new quest"""
    try:
        repo = RepositoryFactory.create_quest_repository(db)
        service = ServiceFactory.create_quest_service(repo)
        
        quest = service.create(quest_data.dict())
        return {"success": True, "data": quest}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quests-crud/{quest_id}")
async def get_quest(quest_id: int, db: Session = Depends(get_db)):
    """Get a quest by ID"""
    try:
        repo = RepositoryFactory.create_quest_repository(db)
        service = ServiceFactory.create_quest_service(repo)
        
        quest = service.get(quest_id)
        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")
        return {"success": True, "data": quest}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/quests-crud/{quest_id}")
async def update_quest(quest_id: int, quest_data: QuestUpdate, db: Session = Depends(get_db)):
    """Update a quest"""
    try:
        repo = RepositoryFactory.create_quest_repository(db)
        service = ServiceFactory.create_quest_service(repo)
        
        update_data = {k: v for k, v in quest_data.dict().items() if v is not None}
        
        quest = service.update(quest_id, update_data)
        if not quest:
            raise HTTPException(status_code=404, detail="Quest not found")
        return {"success": True, "data": quest}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/quests-crud/{quest_id}")
async def delete_quest(quest_id: int, db: Session = Depends(get_db)):
    """Delete a quest"""
    try:
        repo = RepositoryFactory.create_quest_repository(db)
        service = ServiceFactory.create_quest_service(repo)
        
        success = service.delete(quest_id)
        if not success:
            raise HTTPException(status_code=404, detail="Quest not found")
        return {"success": True, "message": "Quest deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== USER QUESTS CRUD ENDPOINTS ==========

@router.post("/user-quests-crud", status_code=201)
async def create_user_quest(user_quest_data: UserQuestCreate, db: Session = Depends(get_db)):
    """Create a new user quest progress"""
    try:
        repo = RepositoryFactory.create_userquest_repository(db)
        service = ServiceFactory.create_userquest_service(repo)
        
        user_quest = service.create(user_quest_data.dict())
        return {"success": True, "data": user_quest}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user-quests-crud/{user_quest_id}")
async def get_user_quest(user_quest_id: int, db: Session = Depends(get_db)):
    """Get a user quest by ID"""
    try:
        repo = RepositoryFactory.create_userquest_repository(db)
        service = ServiceFactory.create_userquest_service(repo)
        
        user_quest = service.get(user_quest_id)
        if not user_quest:
            raise HTTPException(status_code=404, detail="User quest not found")
        return {"success": True, "data": user_quest}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user-quests-crud/{user_quest_id}")
async def update_user_quest(user_quest_id: int, user_quest_data: UserQuestUpdate, db: Session = Depends(get_db)):
    """Update a user quest progress"""
    try:
        repo = RepositoryFactory.create_userquest_repository(db)
        service = ServiceFactory.create_userquest_service(repo)
        
        update_data = {k: v for k, v in user_quest_data.dict().items() if v is not None}
        
        user_quest = service.update(user_quest_id, update_data)
        if not user_quest:
            raise HTTPException(status_code=404, detail="User quest not found")
        return {"success": True, "data": user_quest}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user-quests-crud/{user_quest_id}")
async def delete_user_quest(user_quest_id: int, db: Session = Depends(get_db)):
    """Delete a user quest progress"""
    try:
        repo = RepositoryFactory.create_userquest_repository(db)
        service = ServiceFactory.create_userquest_service(repo)
        
        success = service.delete(user_quest_id)
        if not success:
            raise HTTPException(status_code=404, detail="User quest not found")
        return {"success": True, "message": "User quest deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== GAME STATUSES CRUD ENDPOINTS ==========

@router.post("/game-statuses", status_code=201)
async def create_game_status(status_data: GameStatusCreate, db: Session = Depends(get_db)):
    """Create a new game status"""
    try:
        repo = RepositoryFactory.create_gamestatus_repository(db)
        service = ServiceFactory.create_gamestatus_service(repo)
        
        status = service.create(status_data.dict())
        return {"success": True, "data": status}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/game-statuses/{status_id}")
async def get_game_status(status_id: int, db: Session = Depends(get_db)):
    """Get a game status by ID"""
    try:
        repo = RepositoryFactory.create_gamestatus_repository(db)
        service = ServiceFactory.create_gamestatus_service(repo)
        
        status = service.get(status_id)
        if not status:
            raise HTTPException(status_code=404, detail="Game status not found")
        return {"success": True, "data": status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/game-statuses/{status_id}")
async def update_game_status(status_id: int, status_data: GameStatusUpdate, db: Session = Depends(get_db)):
    """Update a game status"""
    try:
        repo = RepositoryFactory.create_gamestatus_repository(db)
        service = ServiceFactory.create_gamestatus_service(repo)
        
        update_data = {k: v for k, v in status_data.dict().items() if v is not None}
        
        status = service.update(status_id, update_data)
        if not status:
            raise HTTPException(status_code=404, detail="Game status not found")
        return {"success": True, "data": status}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/game-statuses/{status_id}")
async def delete_game_status(status_id: int, db: Session = Depends(get_db)):
    """Delete a game status"""
    try:
        repo = RepositoryFactory.create_gamestatus_repository(db)
        service = ServiceFactory.create_gamestatus_service(repo)
        
        success = service.delete(status_id)
        if not success:
            raise HTTPException(status_code=404, detail="Game status not found")
        return {"success": True, "message": "Game status deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
