"""
Quests router for managing platform quests.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Header, Query
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.models import Quest, UserQuest, User, LevelMilestone
from app.schemas import QuestResponse, QuestCreate, QuestWithProgress, UserQuestProgress
from app.repositories import RepositoryFactory
from app.services import ServiceFactory
from app.level_system import LevelSystem

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


@router.get("/", response_model=List[QuestResponse])
async def get_all_quests(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all quests, optionally filtered by active status."""
    query = db.query(Quest)
    
    if active_only:
        query = query.filter(Quest.is_active == 1)
    
    quests = query.order_by(Quest.quest_id).all()
    return [quest.to_dict() for quest in quests]


@router.get("/user/{user_id}", response_model=List[QuestWithProgress])
async def get_user_quests(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get all quests with user progress."""
    
    # Verify user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all active quests
    quests = db.query(Quest).filter(Quest.is_active == 1).order_by(Quest.quest_id).all()
    
    result = []
    for quest in quests:
        quest_dict = quest.to_dict()
        
        # Get user progress for this quest
        progress = db.query(UserQuest).filter(
            UserQuest.user_id == user_id,
            UserQuest.quest_id == quest.quest_id
        ).first()
        
        if progress:
            quest_dict["progress"] = progress.to_dict()
        else:
            quest_dict["progress"] = None
        
        result.append(quest_dict)
    
    return result


@router.get("/{quest_id}", response_model=QuestResponse)
async def get_quest(
    quest_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific quest by ID."""
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    return quest.to_dict()


@router.post("/", response_model=QuestResponse)
async def create_quest(
    quest_data: QuestCreate,
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Create a new quest (admin only)."""
    verify_admin(x_api_key, request)
    
    now = datetime.utcnow().isoformat()
    
    quest = Quest(
        title=quest_data.title,
        description=quest_data.description,
        quest_type=quest_data.quest_type,
        target_value=quest_data.target_value,
        xp_reward=quest_data.xp_reward,
        sats_reward=quest_data.sats_reward,
        game_id=quest_data.game_id,
        is_active=1 if quest_data.is_active else 0,
        created_at=now
    )
    
    db.add(quest)
    db.commit()
    db.refresh(quest)
    
    return quest.to_dict()


@router.put("/{quest_id}", response_model=QuestResponse)
async def update_quest(
    quest_id: int,
    quest_data: QuestCreate,
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Update an existing quest (admin only)."""
    verify_admin(x_api_key, request)
    
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    # Update fields
    quest.title = quest_data.title
    quest.description = quest_data.description
    quest.quest_type = quest_data.quest_type
    quest.target_value = quest_data.target_value
    quest.xp_reward = quest_data.xp_reward
    quest.sats_reward = quest_data.sats_reward
    quest.game_id = quest_data.game_id
    quest.is_active = 1 if quest_data.is_active else 0
    
    db.commit()
    db.refresh(quest)
    
    return quest.to_dict()


@router.delete("/{quest_id}")
async def delete_quest(
    quest_id: int,
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Delete a quest (admin only)."""
    verify_admin(x_api_key, request)
    
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    db.delete(quest)
    db.commit()
    
    return {"success": True, "message": f"Quest {quest_id} deleted"}


@router.get("/stats/summary")
async def get_quests_stats(
    db: Session = Depends(get_db)
):
    """Get quest statistics."""
    
    total_quests = db.query(Quest).count()
    active_quests = db.query(Quest).filter(Quest.is_active == 1).count()
    
    # Count completions
    total_completions = db.query(UserQuest).filter(UserQuest.is_completed == 1).count()
    
    # Count users with at least one quest
    users_with_quests = db.query(UserQuest.user_id).distinct().count()
    
    return {
        "total_quests": total_quests,
        "active_quests": active_quests,
        "total_completions": total_completions,
        "users_with_quests": users_with_quests
    }


@router.post("/claim/{quest_id}")
async def claim_quest_reward(
    quest_id: int,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Claim reward for a completed quest."""
    
    # Get user
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get quest
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    # Get user progress
    progress = db.query(UserQuest).filter(
        UserQuest.user_id == user_id,
        UserQuest.quest_id == quest_id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Quest progress not found")
    
    # Check if quest is completed
    if not progress.is_completed:
        raise HTTPException(status_code=400, detail="Quest not completed yet")
    
    # Check if already claimed
    if progress.is_claimed:
        raise HTTPException(status_code=400, detail="Quest reward already claimed")
    
    # Claim reward
    now = datetime.utcnow().isoformat()
    progress.is_claimed = 1
    progress.claimed_at = now
    
    # Calculate level BEFORE adding XP
    old_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
    
    # Add XP rewards to user
    user.total_xp_earned += quest.xp_reward
    
    # Calculate level AFTER adding XP
    new_level = LevelSystem.calculate_level_from_xp(user.total_xp_earned)
    
    # Check if level up occurred
    level_up = new_level > old_level
    level_milestone = None
    
    if level_up:
        # Get milestone info for new level
        milestone = db.query(LevelMilestone).filter(
            LevelMilestone.level == new_level,
            LevelMilestone.is_active == 1
        ).first()
        
        if milestone:
            level_milestone = {
                "level": milestone.level,
                "title": milestone.title,
                "badge": milestone.badge,
                "color": milestone.color,
                "description": milestone.description
            }
            print(f"🎉 Level up! {user_id} reached level {new_level}: {milestone.title}")
    
    # Award coin rewards (if any)
    coins_awarded = 0
    if quest.reward_coins and quest.reward_coins > 0:
        # Create all required repositories for CoinService
        coins_repo = RepositoryFactory.create_usercoins_repository(db)
        transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
        
        coin_service = ServiceFactory.create_coin_service(
            coins_repo, 
            transaction_repo
        )
        
        coin_result = coin_service.award_quest_reward(
            user_id=user_id,
            quest_id=quest_id,
            quest_title=quest.title,
            quest_sats_reward=quest.reward_coins
        )
        
        if coin_result:
            coins_awarded = coin_result.get('amount', 0)
            print(f"✅ Awarded {coins_awarded} coins to {user_id} for quest {quest_id}")
    
    db.commit()
    db.refresh(progress)
    db.refresh(user)
    
    response = {
        "success": True,
        "quest_id": quest_id,
        "xp_reward": quest.xp_reward,
        "reward_coins": coins_awarded,
        "total_xp": user.total_xp_earned,
        "claimed_at": now,
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level
    }
    
    if level_milestone:
        response["level_milestone"] = level_milestone
    
    return response
