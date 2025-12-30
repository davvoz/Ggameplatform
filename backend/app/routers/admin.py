from fastapi import APIRouter, HTTPException, Response, Request, Header, Depends, Cookie
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import Dict, List, Any, Optional
from pathlib import Path
from pydantic import BaseModel
import secrets
import bcrypt
import jwt
from datetime import datetime, timedelta
from app.database import (
    get_db_session,
    get_open_sessions, 
    close_open_sessions, 
    force_close_session
)
from app.models import Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest, GameStatus, UserCoins, CoinTransaction, LevelMilestone, LevelReward, WeeklyLeaderboard, LeaderboardReward, WeeklyWinner, AdminUser
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
    GameStatusCreate, GameStatusUpdate,
    UserCoinsCreate, UserCoinsUpdate,
    CoinTransactionCreate, CoinTransactionUpdate,
    LevelMilestoneCreate, LevelMilestoneUpdate,
    LevelRewardCreate, LevelRewardUpdate,
    WeeklyLeaderboardCreate, WeeklyLeaderboardUpdate,
    LeaderboardRewardCreate, LeaderboardRewardUpdate,
    WeeklyWinnerCreate, WeeklyWinnerUpdate
)
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload
import json
import os
from datetime import datetime

router = APIRouter()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-to-random-secret-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

# Dependency to get DB session
def get_db():
    """Get database session as dependency"""
    with get_db_session() as session:
        yield session

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token_from_cookie(
    admin_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> str:
    """Verify JWT token from cookie"""
    if not admin_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(admin_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    admin = db.query(AdminUser).filter_by(username=username, is_active=1).first()
    if not admin:
        raise HTTPException(status_code=401, detail="User not found")
    
    return username

@router.get("/login", response_class=HTMLResponse)
async def admin_login_page():
    """Serve admin login page"""
    html_file = Path(__file__).parent.parent / "static" / "admin-login.html"
    return FileResponse(html_file)

@router.post("/login")
async def admin_login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    admin = db.query(AdminUser).filter_by(username=login_data.username, is_active=1).first()
    
    if not admin:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    password_correct = bcrypt.checkpw(
        login_data.password.encode('utf-8'),
        admin.password_hash.encode('utf-8')
    )
    
    if not password_correct:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    admin.last_login = datetime.now().isoformat()
    admin.updated_at = datetime.now().isoformat()
    db.commit()
    
    access_token = create_access_token(data={"sub": admin.username})
    
    # Set token in httponly cookie
    response.set_cookie(
        key="admin_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        samesite="lax"
    )
    
    return {"success": True, "redirect": "/admin/db-viewer"}


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
                "quest_types": [
                    "play_games",
                    "play_games_weekly", 
                    "play_time",
                    "play_time_daily",
                    "play_time_cumulative",
                    "play_same_game",
                    "score_threshold_per_game",
                    "score_ends_with",
                    "login_after_24h",
                    "login_streak",
                    "leaderboard_top",
                    "reach_level",
                    "xp_daily",
                    "xp_weekly",
                    "complete_quests"
                ],
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
async def db_viewer(username: str = Depends(verify_token_from_cookie)):
    """Database viewer interface - Protected with JWT cookie"""
    html_file = Path(__file__).parent.parent / "static" / "db-viewer.html"
    return FileResponse(html_file)

@router.get("/db-stats")
async def get_db_stats(username: str = Depends(verify_token_from_cookie)):
    """Get database statistics - Protected with JWT cookie"""
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
        
        # Get coin system data
        user_coins_query = session.query(UserCoins).order_by(desc(UserCoins.balance)).all()
        user_coins = [uc.to_dict() for uc in user_coins_query]
        
        coin_transactions_query = session.query(CoinTransaction).order_by(desc(CoinTransaction.created_at)).all()
        coin_transactions = [ct.to_dict() for ct in coin_transactions_query]
        
        # Get level system data
        from app.models import LevelMilestone, LevelReward
        level_milestones_query = session.query(LevelMilestone).order_by(LevelMilestone.level).all()
        level_milestones = [lm.to_dict() for lm in level_milestones_query]
        
        level_rewards_query = session.query(LevelReward).order_by(LevelReward.level).all()
        level_rewards = [lr.to_dict() for lr in level_rewards_query]
        
        # Get weekly leaderboard data
        from app.models import WeeklyLeaderboard, LeaderboardReward, WeeklyWinner
        weekly_leaderboards_query = session.query(WeeklyLeaderboard).order_by(desc(WeeklyLeaderboard.score)).all()
        weekly_leaderboards = [wl.to_dict() for wl in weekly_leaderboards_query]
        
        leaderboard_rewards_query = session.query(LeaderboardReward).order_by(LeaderboardReward.rank_start).all()
        leaderboard_rewards = [lr.to_dict() for lr in leaderboard_rewards_query]
        
        weekly_winners_query = session.query(WeeklyWinner).order_by(desc(WeeklyWinner.week_start), WeeklyWinner.rank).all()
        weekly_winners = [ww.to_dict() for ww in weekly_winners_query]
        
        # Get daily login rewards data
        from app.models import UserLoginStreak, DailyLoginRewardConfig
        user_login_streak_query = session.query(UserLoginStreak).order_by(desc(UserLoginStreak.updated_at)).all()
        user_login_streak = [uls.to_dict() for uls in user_login_streak_query]
        
        daily_login_reward_config_query = session.query(DailyLoginRewardConfig).order_by(DailyLoginRewardConfig.day).all()
        daily_login_reward_config = [dlrc.to_dict() for dlrc in daily_login_reward_config_query]
        
        # Calculate total coins in circulation
        total_coins_circulation = sum([uc.balance for uc in user_coins_query])
    
    data = {
        "total_games": len(games),
        "total_users": len(users),
        "total_sessions": total_sessions_count,
        "total_leaderboard_entries": total_leaderboard_count,
        "total_xp_rules": len(xp_rules),
        "total_quests": len(quests),
        "total_user_quests": total_user_quests_count,
        "total_game_statuses": len(statuses),
        "total_coins_circulation": total_coins_circulation,
        "total_level_milestones": len(level_milestones),
        "total_level_rewards": len(level_rewards),
        "total_weekly_leaderboard_entries": len(weekly_leaderboards),
        "total_leaderboard_rewards": len(leaderboard_rewards),
        "total_weekly_winners": len(weekly_winners),
        "total_user_login_streak": len(user_login_streak),
        "total_daily_login_reward_config": len(daily_login_reward_config),
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
        "user_coins": user_coins,
        "transactions": coin_transactions,
        "milestones": level_milestones,
        "level_rewards": level_rewards,
        "weekly_leaderboards": weekly_leaderboards,
        "leaderboard_rewards": leaderboard_rewards,
        "weekly_winners": weekly_winners,
        "user_login_streak": user_login_streak,
        "daily_login_reward_config": daily_login_reward_config,
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
        
        # Export coin system data
        user_coins_query = session.query(UserCoins).order_by(desc(UserCoins.balance)).all()
        user_coins = [uc.to_dict() for uc in user_coins_query]
        
        coin_transactions_query = session.query(CoinTransaction).order_by(desc(CoinTransaction.created_at)).all()
        coin_transactions = [ct.to_dict() for ct in coin_transactions_query]
        
        # Export level system data
        from app.models import LevelMilestone, LevelReward
        level_milestones_query = session.query(LevelMilestone).order_by(LevelMilestone.level).all()
        level_milestones = [lm.to_dict() for lm in level_milestones_query]
        
        level_rewards_query = session.query(LevelReward).order_by(LevelReward.level).all()
        level_rewards = [lr.to_dict() for lr in level_rewards_query]
        
        # Export weekly leaderboard data
        from app.models import WeeklyLeaderboard, LeaderboardReward, WeeklyWinner
        weekly_leaderboards_query = session.query(WeeklyLeaderboard).order_by(desc(WeeklyLeaderboard.score)).all()
        weekly_leaderboards = [wl.to_dict() for wl in weekly_leaderboards_query]
        
        leaderboard_rewards_query = session.query(LeaderboardReward).order_by(LeaderboardReward.rank_start).all()
        leaderboard_rewards = [lr.to_dict() for lr in leaderboard_rewards_query]
        
        weekly_winners_query = session.query(WeeklyWinner).order_by(desc(WeeklyWinner.week_start), WeeklyWinner.rank).all()
        weekly_winners = [ww.to_dict() for ww in weekly_winners_query]
        
        # Export daily login rewards
        from app.models import UserLoginStreak, DailyLoginRewardConfig
        user_login_streak_query = session.query(UserLoginStreak).order_by(desc(UserLoginStreak.updated_at)).all()
        user_login_streak = [uls.to_dict() for uls in user_login_streak_query]
        
        daily_login_reward_config_query = session.query(DailyLoginRewardConfig).order_by(DailyLoginRewardConfig.day).all()
        daily_login_reward_config = [dlrc.to_dict() for dlrc in daily_login_reward_config_query]
    
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
        "total_user_coins": len(user_coins),
        "total_coin_transactions": len(coin_transactions),
        "total_level_milestones": len(level_milestones),
        "total_level_rewards": len(level_rewards),
        "total_weekly_leaderboard_entries": len(weekly_leaderboards),
        "total_leaderboard_rewards": len(leaderboard_rewards),
        "total_weekly_winners": len(weekly_winners),
        "total_user_login_streak": len(user_login_streak),
        "total_daily_login_reward_config": len(daily_login_reward_config),
        "games": games,
        "users": users,
        "sessions": sessions,
        "leaderboard": leaderboard,
        "xp_rules": xp_rules,
        "quests": quests,
        "user_quests": user_quests,
        "game_statuses": statuses,
        "user_coins": user_coins,
        "coin_transactions": coin_transactions,
        "level_milestones": level_milestones,
        "level_rewards": level_rewards,
        "weekly_leaderboards": weekly_leaderboards,
        "leaderboard_rewards": leaderboard_rewards,
        "weekly_winners": weekly_winners,
        "daily_login_rewards": daily_login_rewards,
        "daily_login_reward_config": daily_login_reward_config
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


# ========== USER COINS CRUD ENDPOINTS ==========

@router.post("/user-coins", status_code=201)
async def create_user_coins(coins_data: UserCoinsCreate, db: Session = Depends(get_db)):
    """Create a new user coins record"""
    try:
        repo = RepositoryFactory.create_usercoins_repository(db)
        coins = repo.get_or_create(coins_data.user_id)
        return {"success": True, "data": coins.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user-coins/{user_id}")
async def get_user_coins(user_id: str, db: Session = Depends(get_db)):
    """Get user coins by user ID"""
    try:
        repo = RepositoryFactory.create_usercoins_repository(db)
        coins = repo.get_by_id(user_id)
        if not coins:
            raise HTTPException(status_code=404, detail="User coins not found")
        return {"success": True, "data": coins.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user-coins/{user_id}")
async def update_user_coins(user_id: str, coins_data: UserCoinsUpdate, db: Session = Depends(get_db)):
    """Update user coins"""
    try:
        repo = RepositoryFactory.create_usercoins_repository(db)
        coins = repo.get_by_id(user_id)
        if not coins:
            raise HTTPException(status_code=404, detail="User coins not found")
        
        update_data = {k: v for k, v in coins_data.dict().items() if v is not None}
        for key, value in update_data.items():
            setattr(coins, key, value)
        
        coins.last_updated = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(coins)
        
        return {"success": True, "data": coins.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user-coins/{user_id}")
async def delete_user_coins(user_id: str, db: Session = Depends(get_db)):
    """Delete user coins record"""
    try:
        repo = RepositoryFactory.create_usercoins_repository(db)
        coins = repo.get_by_id(user_id)
        if not coins:
            raise HTTPException(status_code=404, detail="User coins not found")
        
        db.delete(coins)
        db.commit()
        return {"success": True, "message": "User coins deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ========== COIN TRANSACTIONS CRUD ENDPOINTS ==========

@router.get("/coin-transactions/{transaction_id}")
async def get_coin_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get coin transaction by ID"""
    try:
        repo = RepositoryFactory.create_cointransaction_repository(db)
        transaction = repo.get_by_id(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return {"success": True, "data": transaction.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/coin-transactions/{transaction_id}")
async def update_coin_transaction(transaction_id: str, tx_data: CoinTransactionUpdate, db: Session = Depends(get_db)):
    """Update coin transaction (description only)"""
    try:
        repo = RepositoryFactory.create_cointransaction_repository(db)
        transaction = repo.get_by_id(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if tx_data.description is not None:
            transaction.description = tx_data.description
            db.commit()
            db.refresh(transaction)
        
        return {"success": True, "data": transaction.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/coin-transactions/{transaction_id}")
async def delete_coin_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Delete coin transaction (use with caution - will affect balance calculations)"""
    try:
        repo = RepositoryFactory.create_cointransaction_repository(db)
        transaction = repo.get_by_id(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        db.delete(transaction)
        db.commit()
        return {"success": True, "message": "Transaction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



# ============ LEVEL MILESTONES ENDPOINTS ============

@router.get("/level-milestones")
async def get_level_milestones(db: Session = Depends(get_db)):
    """Get all level milestones"""
    try:
        from app.models import LevelMilestone
        milestones = db.query(LevelMilestone).order_by(LevelMilestone.level).all()
        return {"success": True, "milestones": [m.to_dict() for m in milestones]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/level-milestones")
async def create_level_milestone(milestone_data: dict, db: Session = Depends(get_db)):
    """Create new level milestone"""
    try:
        from app.models import LevelMilestone
        
        # Check if level already exists
        existing = db.query(LevelMilestone).filter(LevelMilestone.level == milestone_data.get('level')).first()
        if existing:
            raise HTTPException(status_code=400, detail="Milestone for this level already exists")
        
        now = datetime.utcnow().isoformat()
        milestone = LevelMilestone(
            level=milestone_data['level'],
            title=milestone_data['title'],
            badge=milestone_data['badge'],
            color=milestone_data['color'],
            description=milestone_data.get('description', ''),
            is_active=milestone_data.get('is_active', 1),
            created_at=now,
            updated_at=now
        )
        
        db.add(milestone)
        db.commit()
        db.refresh(milestone)
        
        return {"success": True, "data": milestone.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/level-milestones/{level}")
async def get_level_milestone(level: int, db: Session = Depends(get_db)):
    """Get level milestone by level"""
    try:
        from app.models import LevelMilestone
        milestone = db.query(LevelMilestone).filter(LevelMilestone.level == level).first()
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return {"success": True, "data": milestone.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/level-milestones/{level}")
async def update_level_milestone(level: int, milestone_data: dict, db: Session = Depends(get_db)):
    """Update level milestone"""
    try:
        from app.models import LevelMilestone
        milestone = db.query(LevelMilestone).filter(LevelMilestone.level == level).first()
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        # Update fields
        if 'title' in milestone_data:
            milestone.title = milestone_data['title']
        if 'badge' in milestone_data:
            milestone.badge = milestone_data['badge']
        if 'color' in milestone_data:
            milestone.color = milestone_data['color']
        if 'description' in milestone_data:
            milestone.description = milestone_data['description']
        if 'is_active' in milestone_data:
            milestone.is_active = milestone_data['is_active']
        
        milestone.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(milestone)
        
        return {"success": True, "data": milestone.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/level-milestones/{level}")
async def delete_level_milestone(level: int, db: Session = Depends(get_db)):
    """Delete level milestone"""
    try:
        from app.models import LevelMilestone
        milestone = db.query(LevelMilestone).filter(LevelMilestone.level == level).first()
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        db.delete(milestone)
        db.commit()
        return {"success": True, "message": "Milestone deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ LEVEL REWARDS ENDPOINTS ============

@router.get("/level-rewards")
async def get_level_rewards(db: Session = Depends(get_db)):
    """Get all level rewards"""
    try:
        from app.models import LevelReward
        rewards = db.query(LevelReward).order_by(LevelReward.level).all()
        return {"success": True, "level_rewards": [r.to_dict() for r in rewards]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/level-rewards")
async def create_level_reward(reward_data: dict, db: Session = Depends(get_db)):
    """Create new level reward"""
    try:
        from app.models import LevelReward
        import uuid
        
        now = datetime.utcnow().isoformat()
        reward_id = reward_data.get('reward_id') or f"reward_{uuid.uuid4().hex[:16]}"
        
        reward = LevelReward(
            reward_id=reward_id,
            level=reward_data['level'],
            reward_type=reward_data['reward_type'],
            reward_amount=reward_data['reward_amount'],
            description=reward_data.get('description', ''),
            is_active=reward_data.get('is_active', 1),
            created_at=now,
            updated_at=now
        )
        
        db.add(reward)
        db.commit()
        db.refresh(reward)
        
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/level-rewards/{reward_id}")
async def get_level_reward(reward_id: str, db: Session = Depends(get_db)):
    """Get level reward by ID"""
    try:
        from app.models import LevelReward
        reward = db.query(LevelReward).filter(LevelReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/level-rewards/{reward_id}")
async def update_level_reward(reward_id: str, reward_data: dict, db: Session = Depends(get_db)):
    """Update level reward"""
    try:
        from app.models import LevelReward
        reward = db.query(LevelReward).filter(LevelReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        # Update fields
        if 'level' in reward_data:
            reward.level = reward_data['level']
        if 'reward_type' in reward_data:
            reward.reward_type = reward_data['reward_type']
        if 'reward_amount' in reward_data:
            reward.reward_amount = reward_data['reward_amount']
        if 'description' in reward_data:
            reward.description = reward_data['description']
        if 'is_active' in reward_data:
            reward.is_active = reward_data['is_active']
        
        reward.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(reward)
        
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/level-rewards/{reward_id}")
async def delete_level_reward(reward_id: str, db: Session = Depends(get_db)):
    """Delete level reward"""
    try:
        from app.models import LevelReward
        reward = db.query(LevelReward).filter(LevelReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        db.delete(reward)
        db.commit()
        return {"success": True, "message": "Reward deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ WEEKLY LEADERBOARDS ENDPOINTS ============

@router.get("/weekly-leaderboards")
async def get_weekly_leaderboards(db: Session = Depends(get_db)):
    """Get all weekly leaderboard entries"""
    try:
        from app.models import WeeklyLeaderboard
        entries = db.query(WeeklyLeaderboard).order_by(desc(WeeklyLeaderboard.score)).all()
        return {"success": True, "weekly_leaderboards": [e.to_dict() for e in entries]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-leaderboards/{entry_id}")
async def get_weekly_leaderboard_entry(entry_id: str, db: Session = Depends(get_db)):
    """Get weekly leaderboard entry by ID"""
    try:
        from app.models import WeeklyLeaderboard
        entry = db.query(WeeklyLeaderboard).filter(WeeklyLeaderboard.entry_id == entry_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return {"success": True, "data": entry.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/weekly-leaderboards/{entry_id}")
async def update_weekly_leaderboard_entry(entry_id: str, entry_data: dict, db: Session = Depends(get_db)):
    """Update weekly leaderboard entry"""
    try:
        from app.models import WeeklyLeaderboard
        entry = db.query(WeeklyLeaderboard).filter(WeeklyLeaderboard.entry_id == entry_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        if 'score' in entry_data:
            entry.score = entry_data['score']
        
        db.commit()
        db.refresh(entry)
        return {"success": True, "data": entry.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/weekly-leaderboards/{entry_id}")
async def delete_weekly_leaderboard_entry(entry_id: str, db: Session = Depends(get_db)):
    """Delete weekly leaderboard entry"""
    try:
        from app.models import WeeklyLeaderboard
        entry = db.query(WeeklyLeaderboard).filter(WeeklyLeaderboard.entry_id == entry_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        db.delete(entry)
        db.commit()
        return {"success": True, "message": "Entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ LEADERBOARD REWARDS ENDPOINTS ============

@router.get("/leaderboard-rewards")
async def get_leaderboard_rewards(db: Session = Depends(get_db)):
    """Get all leaderboard rewards"""
    try:
        from app.models import LeaderboardReward
        rewards = db.query(LeaderboardReward).order_by(LeaderboardReward.rank_start).all()
        return {"success": True, "leaderboard_rewards": [r.to_dict() for r in rewards]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/leaderboard-rewards")
async def create_leaderboard_reward(reward_data: dict, db: Session = Depends(get_db)):
    """Create new leaderboard reward"""
    try:
        from app.models import LeaderboardReward
        import uuid
        from datetime import datetime
        
        now = datetime.utcnow().isoformat()
        
        reward = LeaderboardReward(
            reward_id=str(uuid.uuid4()),
            rank_start=reward_data['rank_start'],
            rank_end=reward_data.get('rank_end', reward_data['rank_start']),
            steem_reward=reward_data['steem_reward'],
            coin_reward=reward_data['coin_reward'],
            game_id=reward_data.get('game_id'),
            description=reward_data.get('description'),
            created_at=now,
            updated_at=now
        )
        
        db.add(reward)
        db.commit()
        db.refresh(reward)
        
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leaderboard-rewards/{reward_id}")
async def get_leaderboard_reward(reward_id: int, db: Session = Depends(get_db)):
    """Get leaderboard reward by ID"""
    try:
        from app.models import LeaderboardReward
        reward = db.query(LeaderboardReward).filter(LeaderboardReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/leaderboard-rewards/{reward_id}")
async def update_leaderboard_reward(reward_id: str, reward_data: dict, db: Session = Depends(get_db)):
    """Update leaderboard reward"""
    try:
        from app.models import LeaderboardReward
        reward = db.query(LeaderboardReward).filter(LeaderboardReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        if 'rank_start' in reward_data:
            reward.rank_start = reward_data['rank_start']
        if 'rank_end' in reward_data:
            reward.rank_end = reward_data['rank_end']
        if 'steem_reward' in reward_data:
            reward.steem_reward = reward_data['steem_reward']
        if 'coin_reward' in reward_data:
            reward.coin_reward = reward_data['coin_reward']
        if 'game_id' in reward_data:
            reward.game_id = reward_data['game_id']
        if 'description' in reward_data:
            reward.description = reward_data['description']
        
        from datetime import datetime
        reward.updated_at = datetime.utcnow().isoformat()
        
        db.commit()
        db.refresh(reward)
        
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/leaderboard-rewards/{reward_id}")
async def delete_leaderboard_reward(reward_id: str, db: Session = Depends(get_db)):
    """Delete leaderboard reward"""
    try:
        from app.models import LeaderboardReward
        reward = db.query(LeaderboardReward).filter(LeaderboardReward.reward_id == reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        db.delete(reward)
        db.commit()
        return {"success": True, "message": "Reward deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ WEEKLY WINNERS ENDPOINTS ============

@router.get("/weekly-winners")
async def get_weekly_winners(db: Session = Depends(get_db)):
    """Get all weekly winners"""
    try:
        from app.models import WeeklyWinner
        winners = db.query(WeeklyWinner).order_by(desc(WeeklyWinner.week_start), WeeklyWinner.rank).all()
        return {"success": True, "weekly_winners": [w.to_dict() for w in winners]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-winners/{winner_id}")
async def get_weekly_winner(winner_id: int, db: Session = Depends(get_db)):
    """Get weekly winner by ID"""
    try:
        from app.models import WeeklyWinner
        winner = db.query(WeeklyWinner).filter(WeeklyWinner.winner_id == winner_id).first()
        if not winner:
            raise HTTPException(status_code=404, detail="Winner not found")
        return {"success": True, "data": winner.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/weekly-winners/{winner_id}")
async def update_weekly_winner(winner_id: str, winner_data: dict, db: Session = Depends(get_db)):
    """Update weekly winner (mainly for marking reward_sent)"""
    try:
        from app.models import WeeklyWinner
        winner = db.query(WeeklyWinner).filter(WeeklyWinner.winner_id == winner_id).first()
        if not winner:
            raise HTTPException(status_code=404, detail="Winner not found")
        
        if 'reward_sent' in winner_data:
            winner.reward_sent = winner_data['reward_sent']
        if 'steem_tx_id' in winner_data:
            winner.steem_tx_id = winner_data['steem_tx_id']
        
        db.commit()
        db.refresh(winner)
        
        return {"success": True, "data": winner.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/weekly-winners/{winner_id}")
async def delete_weekly_winner(winner_id: str, db: Session = Depends(get_db)):
    """Delete weekly winner"""
    try:
        from app.models import WeeklyWinner
        winner = db.query(WeeklyWinner).filter(WeeklyWinner.winner_id == winner_id).first()
        if not winner:
            raise HTTPException(status_code=404, detail="Winner not found")
        
        db.delete(winner)
        db.commit()
        return {"success": True, "message": "Winner deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ DAILY LOGIN REWARDS ENDPOINTS ============

@router.get("/user_login_streak")
async def get_user_login_streaks(db: Session = Depends(get_db)):
    """Get all user login streaks"""
    try:
        from app.models import UserLoginStreak
        streaks = db.query(UserLoginStreak).order_by(UserLoginStreak.updated_at.desc()).all()
        return {"success": True, "user_login_streak": [r.to_dict() for r in streaks]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user_login_streak/{user_id}")
async def get_user_login_streak(user_id: str, db: Session = Depends(get_db)):
    """Get user login streak by user ID"""
    try:
        from app.models import UserLoginStreak
        streak = db.query(UserLoginStreak).filter(UserLoginStreak.user_id == user_id).first()
        if not streak:
            raise HTTPException(status_code=404, detail="User login streak not found")
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user_login_streak/{user_id}")
async def update_user_login_streak(user_id: str, streak_data: dict, db: Session = Depends(get_db)):
    """Update user login streak"""
    try:
        from app.models import UserLoginStreak
        streak = db.query(UserLoginStreak).filter(UserLoginStreak.user_id == user_id).first()
        if not streak:
            raise HTTPException(status_code=404, detail="User login streak not found")
        
        if 'current_day' in reward_data:
            reward.current_day = reward_data['current_day']
        if 'last_claim_date' in reward_data:
            reward.last_claim_date = reward_data['last_claim_date']
        if 'total_cycles_completed' in reward_data:
            reward.total_cycles_completed = reward_data['total_cycles_completed']
        
        reward.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(reward)
        
        return {"success": True, "data": reward.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user_login_streak/{user_id}")
async def delete_user_login_streak(user_id: str, db: Session = Depends(get_db)):
    """Delete user login streak"""
    try:
        from app.models import UserLoginStreak
        streak = db.query(UserLoginStreak).filter(UserLoginStreak.user_id == user_id).first()
        if not streak:
            raise HTTPException(status_code=404, detail="User login streak not found")
        
        db.delete(streak)
        db.commit()
        return {"success": True, "message": "User login streak deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============ DAILY LOGIN REWARD CONFIG ENDPOINTS ============

@router.get("/daily_login_reward_config")
async def get_daily_login_reward_configs(db: Session = Depends(get_db)):
    """Get all daily login reward configurations"""
    try:
        from app.models import DailyLoginRewardConfig
        configs = db.query(DailyLoginRewardConfig).order_by(DailyLoginRewardConfig.day).all()
        return {"success": True, "daily_login_reward_config": [c.to_dict() for c in configs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily_login_reward_config/{day}")
async def get_daily_login_reward_config(day: int, db: Session = Depends(get_db)):
    """Get daily login reward configuration by day"""
    try:
        from app.models import DailyLoginRewardConfig
        config = db.query(DailyLoginRewardConfig).filter(DailyLoginRewardConfig.day == day).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return {"success": True, "data": config.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/daily_login_reward_config/{day}")
async def update_daily_login_reward_config(day: int, config_data: dict, db: Session = Depends(get_db)):
    """Update daily login reward configuration"""
    try:
        from app.models import DailyLoginRewardConfig
        config = db.query(DailyLoginRewardConfig).filter(DailyLoginRewardConfig.day == day).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        if 'coins_reward' in config_data:
            config.coins_reward = config_data['coins_reward']
        if 'emoji' in config_data:
            config.emoji = config_data['emoji']
        if 'is_active' in config_data:
            config.is_active = config_data['is_active']
        
        config.updated_at = datetime.utcnow().isoformat()
        db.commit()
        db.refresh(config)
        
        return {"success": True, "data": config.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/daily_login_reward_config")
async def create_daily_login_reward_config(config_data: dict, db: Session = Depends(get_db)):
    """Create new daily login reward configuration"""
    try:
        from app.models import DailyLoginRewardConfig
        
        # Check if day already exists
        existing = db.query(DailyLoginRewardConfig).filter(DailyLoginRewardConfig.day == config_data.get('day')).first()
        if existing:
            raise HTTPException(status_code=400, detail="Configuration for this day already exists")
        
        now = datetime.utcnow().isoformat()
        config = DailyLoginRewardConfig(
            day=config_data['day'],
            coins_reward=config_data['coins_reward'],
            emoji=config_data.get('emoji', '🪙'),
            is_active=config_data.get('is_active', 1),
            created_at=now,
            updated_at=now
        )
        
        db.add(config)
        db.commit()
        db.refresh(config)
        
        return {"success": True, "data": config.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/daily_login_reward_config/{day}")
async def delete_daily_login_reward_config(day: int, db: Session = Depends(get_db)):
    """Delete daily login reward configuration"""
    try:
        from app.models import DailyLoginRewardConfig
        config = db.query(DailyLoginRewardConfig).filter(DailyLoginRewardConfig.day == day).first()
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        db.delete(config)
        db.commit()
        return {"success": True, "message": "Configuration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

        db.delete(reward)
        db.commit()
        return {"success": True, "message": "Daily login reward deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
