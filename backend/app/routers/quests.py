"""
Quests router for managing platform quests.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import get_db_session
from app.models import Quest, UserQuest, User
from app.schemas import QuestResponse, QuestCreate, QuestWithProgress, UserQuestProgress

router = APIRouter(prefix="/quests", tags=["quests"])


@router.get("/", response_model=List[QuestResponse])
async def get_all_quests(
    active_only: bool = True,
    db: Session = Depends(get_db_session)
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
    db: Session = Depends(get_db_session)
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
    db: Session = Depends(get_db_session)
):
    """Get a specific quest by ID."""
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    return quest.to_dict()


@router.post("/", response_model=QuestResponse)
async def create_quest(
    quest_data: QuestCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new quest (admin only)."""
    
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
    db: Session = Depends(get_db_session)
):
    """Update an existing quest (admin only)."""
    
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
    db: Session = Depends(get_db_session)
):
    """Delete a quest (admin only)."""
    
    quest = db.query(Quest).filter(Quest.quest_id == quest_id).first()
    
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    db.delete(quest)
    db.commit()
    
    return {"success": True, "message": f"Quest {quest_id} deleted"}


@router.get("/stats/summary")
async def get_quests_stats(
    db: Session = Depends(get_db_session)
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
