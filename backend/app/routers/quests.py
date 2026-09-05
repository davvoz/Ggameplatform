"""
Quests router for managing platform quests.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from typing import Annotated, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import os
import json
import math

from app.database import get_db
from app.models import Quest, UserQuest, User, LevelMilestone
from app.schemas import QuestResponse, QuestCreate, QuestWithProgress, UserQuestProgress
from app.repositories import RepositoryFactory
from app.services import ServiceFactory
from app.level_system import LevelSystem
from app.user_auth import CurrentUserId, require_owner

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]

# Admin API key from environment
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-admin-key-change-in-production")

# Reusable messages (Sonar S1192 - duplicated string literals)
INVALID_ADMIN_KEY = "Invalid or missing admin API key"
USER_NOT_FOUND = "User not found"
QUEST_NOT_FOUND = "Quest not found"
_RESP_ADMIN_401 = {401: {"description": INVALID_ADMIN_KEY}}


def verify_admin_api_key(x_api_key: Optional[str]) -> None:
    """Enforce the admin API key declared (but never actually checked) on quest CRUD."""
    if not x_api_key or x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail=INVALID_ADMIN_KEY)


@router.get("/", response_model=List[QuestResponse])
async def get_all_quests(
    db: DbSession,
    active_only: bool = True,
):
    """Get all quests, optionally filtered by active status."""
    query = db.query(Quest)
    
    if active_only:
        query = query.filter(Quest.is_active == 1)
    
    quests = query.order_by(Quest.quest_id).all()
    
    # Pre-compute the number of game-specific daily quests (for platform daily meta-quests)
    daily_game_quest_count = db.query(Quest).filter(
        Quest.is_active == 1,
        Quest.config.like('%"reset_period": "daily"%'),
        Quest.config.like('%"game_id":%'),
    ).count()
    
    result = []
    for quest in quests:
        q = quest.to_dict()
        if quest.quest_type == "complete_half_daily_game_quests" and daily_game_quest_count > 0:
            q["target_value"] = math.ceil(daily_game_quest_count / 2)
        elif quest.quest_type == "complete_all_daily_quests" and daily_game_quest_count > 0:
            q["target_value"] = daily_game_quest_count
        result.append(q)
    return result


@router.get(
    "/user/{user_id}",
    response_model=List[QuestWithProgress],
    responses={404: {"description": USER_NOT_FOUND}},
)
async def get_user_quests(
    user_id: str,
    db: DbSession,
):
    """Get all quests with user progress."""

    # Verify user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)
    
    # Get all active quests
    quests = db.query(Quest).filter(Quest.is_active == 1).order_by(Quest.quest_id).all()
    
    # Pre-compute the number of game-specific daily quests (for platform daily meta-quests)
    daily_game_quest_count = db.query(Quest).filter(
        Quest.is_active == 1,
        Quest.config.like('%"reset_period": "daily"%'),
        Quest.config.like('%"game_id":%'),
    ).count()

    result = []
    for quest in quests:
        quest_dict = quest.to_dict()
        
        # Dynamically fix target_value for platform daily meta-quests
        if quest.quest_type == "complete_half_daily_game_quests" and daily_game_quest_count > 0:
            quest_dict["target_value"] = math.ceil(daily_game_quest_count / 2)
        elif quest.quest_type == "complete_all_daily_quests" and daily_game_quest_count > 0:
            quest_dict["target_value"] = daily_game_quest_count
        
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


@router.get(
    "/{quest_id}",
    response_model=QuestResponse,
    responses={404: {"description": QUEST_NOT_FOUND}},
)
async def get_quest(
    quest_id: int,
    db: DbSession,
):
    """Get a specific quest by ID."""
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()

    if not quest:
        raise HTTPException(status_code=404, detail=QUEST_NOT_FOUND)
    
    return quest.to_dict()


@router.post(
    "/",
    response_model=QuestResponse,
    responses=_RESP_ADMIN_401,
)
async def create_quest(
    quest_data: QuestCreate,
    db: DbSession,
    x_api_key: Annotated[Optional[str], Header()] = None,
):
    """Create a new quest (admin only)."""
    verify_admin_api_key(x_api_key)

    now = datetime.now(timezone.utc).isoformat()
    
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


@router.put(
    "/{quest_id}",
    response_model=QuestResponse,
    responses={
        401: {"description": INVALID_ADMIN_KEY},
        404: {"description": QUEST_NOT_FOUND},
    },
)
async def update_quest(
    quest_id: int,
    quest_data: QuestCreate,
    db: DbSession,
    x_api_key: Annotated[Optional[str], Header()] = None,
):
    """Update an existing quest (admin only)."""
    verify_admin_api_key(x_api_key)

    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()

    if not quest:
        raise HTTPException(status_code=404, detail=QUEST_NOT_FOUND)

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


@router.delete(
    "/{quest_id}",
    responses={
        401: {"description": INVALID_ADMIN_KEY},
        404: {"description": QUEST_NOT_FOUND},
    },
)
async def delete_quest(
    quest_id: int,
    db: DbSession,
    x_api_key: Annotated[Optional[str], Header()] = None,
):
    """Delete a quest (admin only)."""
    verify_admin_api_key(x_api_key)

    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()

    if not quest:
        raise HTTPException(status_code=404, detail=QUEST_NOT_FOUND)

    db.delete(quest)
    db.commit()
    
    return {"success": True, "message": f"Quest {quest_id} deleted"}


@router.get("/stats/summary")
async def get_quests_stats(
    db: DbSession,
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


def _build_level_up_info(db: Session, user_id: str, new_level: int) -> dict:
    """Build the level_info payload for a level-up, including milestone lookup."""
    level_title_info = LevelSystem.get_level_title(new_level)

    milestone = db.query(LevelMilestone).filter(
        LevelMilestone.level == new_level,
        LevelMilestone.is_active == 1
    ).first()

    level_info = {
        "level": new_level,
        "title": level_title_info.get("title", f"Level {new_level}"),
        "badge": level_title_info.get("badge", "⭐"),
        "color": level_title_info.get("color", "#4ade80"),
        "is_milestone": milestone is not None
    }

    if milestone:
        level_info["description"] = milestone.description
        print(f"🎉 Milestone reached! {user_id} reached level {new_level}: {milestone.title}")
    else:
        print(f"🎉 Level up! {user_id} reached level {new_level}")

    return level_info


def _award_quest_coins(db: Session, user_id: str, quest_id: int, quest: Quest) -> int:
    """Award the quest's coin reward, if any. Returns coins awarded."""
    if not quest.reward_coins or quest.reward_coins <= 0:
        return 0

    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    coin_service = ServiceFactory.create_coin_service(coins_repo, transaction_repo)

    coin_result = coin_service.award_quest_reward(
        user_id=user_id,
        quest_id=quest_id,
        quest_title=quest.title,
        quest_sats_reward=quest.reward_coins
    )

    coins_awarded = coin_result.get('amount', 0) if coin_result else 0
    if coins_awarded:
        print(f"✅ Awarded {coins_awarded} coins to {user_id} for quest {quest_id}")
    return coins_awarded


def _award_single_level_coins(coin_service, user_id: str, level_data: dict) -> int:
    """Award coins for one gained level. Returns coins awarded (0 on failure)."""
    level = level_data['level']
    coins_for_level = level_data['coins']
    if coins_for_level <= 0:
        return 0
    try:
        coin_service.award_coins(
            user_id=user_id,
            amount=coins_for_level,
            transaction_type='level_up',
            source_id=str(level),
            description=f"Level {level} reached",
            extra_data={"source": "level_up", "level": level}
        )
        print(f"✅ Awarded {coins_for_level} level-up coins to {user_id} for reaching level {level}")
        return coins_for_level
    except Exception as e:
        print(f"[Quests] ⚠️ Failed to award level-up coins for level {level}: {e}")
        return 0


def _award_level_up_coins_for_quest(db: Session, user_id: str, old_xp: float, new_xp: float) -> tuple:
    """Award coins for every level gained between old_xp and new_xp. Returns (total_coins, levels_rewarded)."""
    level_up_coins = 0
    levels_rewarded = []
    try:
        level_up_info = LevelSystem.check_level_up(old_xp, new_xp)
        levels_with_rewards = level_up_info.get('levels_with_rewards', [])
        if not levels_with_rewards:
            return level_up_coins, levels_rewarded

        coins_repo = RepositoryFactory.create_usercoins_repository(db)
        transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
        coin_service = ServiceFactory.create_coin_service(coins_repo, transaction_repo)

        for level_data in levels_with_rewards:
            coins_for_level = _award_single_level_coins(coin_service, user_id, level_data)
            if coins_for_level > 0:
                level_up_coins += coins_for_level
                levels_rewarded.append({"level": level_data['level'], "coins": coins_for_level})

        if level_up_coins > 0:
            print(f"[Quests] 💰 Total level-up coins awarded: {level_up_coins} across {len(levels_rewarded)} levels")
    except Exception as e:
        print(f"[Quests] ⚠️ Error checking/awarding level-up rewards: {e}")

    return level_up_coins, levels_rewarded


@router.post(
    "/claim/{quest_id}",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Cannot act on behalf of another user"},
        404: {"description": "User, quest, or quest progress not found"},
        400: {"description": "Quest not completed yet or reward already claimed"},
    },
)
async def claim_quest_reward(
    quest_id: int,
    db: DbSession,
    user_id: Annotated[str, Query(description="User ID")],
    current_user_id: CurrentUserId,
):
    """Claim reward for a completed quest."""
    require_owner(user_id, current_user_id)

    # Get user
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=USER_NOT_FOUND)

    # Get quest
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail=QUEST_NOT_FOUND)
    
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
    now = datetime.now(timezone.utc).isoformat()
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
    print(f"[Quest Claim] User {user_id}: old_level={old_level}, new_level={new_level}, level_up={level_up}")

    level_info = _build_level_up_info(db, user_id, new_level) if level_up else None

    # Award quest coin reward (if any)
    coins_awarded = _award_quest_coins(db, user_id, quest_id, quest)

    # If level up happened, award level-up rewards (coins) for ALL levels gained (skip for anonymous users)
    level_up_coins = 0
    levels_rewarded = []

    if level_up and not user.is_anonymous:
        old_xp = user.total_xp_earned - quest.xp_reward  # XP before quest
        new_xp = user.total_xp_earned  # XP after quest
        level_up_coins, levels_rewarded = _award_level_up_coins_for_quest(db, user_id, old_xp, new_xp)
    elif level_up and user.is_anonymous:
        print("[Quests] ⚠️ Skipping coin rewards for anonymous user")

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
        print("[Quest Claim] ⚠️ level_info is None, not adding to response")
    
    print(f"[Quest Claim] Final response keys: {response.keys()}")
    
    return response
