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
    level_info = None
    is_milestone = False
    
    print(f"[Quest Claim] User {user_id}: old_level={old_level}, new_level={new_level}, level_up={level_up}")
    
    if level_up:
        # Get level info (milestone or generic title)
        level_title_info = LevelSystem.get_level_title(new_level)
        print(f"[Quest Claim] Level title info: {level_title_info}")
        
        # Check if this exact level is a milestone
        milestone = db.query(LevelMilestone).filter(
            LevelMilestone.level == new_level,
            LevelMilestone.is_active == 1
        ).first()
        
        is_milestone = milestone is not None
        print(f"[Quest Claim] Is milestone: {is_milestone}")
        
        level_info = {
            "level": new_level,
            "title": level_title_info.get("title", f"Level {new_level}"),
            "badge": level_title_info.get("badge", "⭐"),
            "color": level_title_info.get("color", "#4ade80"),
            "is_milestone": is_milestone
        }
        
        if milestone:
            level_info["description"] = milestone.description
            print(f"🎉 Milestone reached! {user_id} reached level {new_level}: {milestone.title}")
        else:
            print(f"🎉 Level up! {user_id} reached level {new_level}")
        
        print(f"[Quest Claim] Level info to return: {level_info}")
    
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

    # If level up happened, award level-up rewards (coins) for ALL levels gained (skip for anonymous users)
    level_up_coins = 0
    levels_rewarded = []
    
    if level_up and not user.is_anonymous:
        try:
            # Use check_level_up to get ALL levels with rewards
            old_xp = user.total_xp_earned - quest.reward_xp  # XP before quest
            new_xp = user.total_xp_earned  # XP after quest
            level_up_info = LevelSystem.check_level_up(old_xp, new_xp)
            
            levels_with_rewards = level_up_info.get('levels_with_rewards', [])
            
            if levels_with_rewards:
                coins_repo = RepositoryFactory.create_usercoins_repository(db)
                transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
                coin_service = ServiceFactory.create_coin_service(coins_repo, transaction_repo)
                
                # Award coins for EACH level that has rewards
                for level_data in levels_with_rewards:
                    level = level_data['level']
                    coins_for_level = level_data['coins']
                    
                    if coins_for_level > 0:
                        try:
                            coin_service.award_coins(
                                user_id=user_id,
                                amount=coins_for_level,
                                transaction_type='level_up',
                                source_id=str(level),
                                description=f"Level {level} reached",
                                extra_data={"source": "level_up", "level": level}
                            )
                            level_up_coins += coins_for_level
                            levels_rewarded.append({"level": level, "coins": coins_for_level})
                            print(f"✅ Awarded {coins_for_level} level-up coins to {user_id} for reaching level {level}")
                        except Exception as e:
                            print(f"[Quests] ⚠️ Failed to award level-up coins for level {level}: {e}")
                
                if level_up_coins > 0:
                    print(f"[Quests] 💰 Total level-up coins awarded: {level_up_coins} across {len(levels_rewarded)} levels")
        except Exception as e:
            print(f"[Quests] ⚠️ Error checking/awarding level-up rewards: {e}")
    elif level_up and user.is_anonymous:
        print(f"[Quests] ⚠️ Skipping coin rewards for anonymous user")
    
    db.commit()
    db.refresh(progress)
    db.refresh(user)
    
    response = {
        "success": True,
        "quest_id": quest_id,
        "xp_reward": quest.xp_reward,
        "reward_coins": coins_awarded,
        "level_up_coins": level_up_coins,
        "levels_rewarded": levels_rewarded,  # List of all levels that got rewards
        "total_xp": user.total_xp_earned,
        "claimed_at": now,
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level
    }
    
    if level_info:
        response["level_info"] = level_info
        print(f"[Quest Claim] ✅ Added level_info to response: {level_info}")
    else:
        print(f"[Quest Claim] ⚠️ level_info is None, not adding to response")
    
    print(f"[Quest Claim] Final response keys: {response.keys()}")
    
    return response
