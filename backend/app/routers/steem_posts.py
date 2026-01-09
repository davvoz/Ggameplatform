"""
Steem Post Router - API endpoints for Steem post publishing
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService
from app.steem_post_service import SteemPostService
from app.models import User, Leaderboard, Game
from app.telegram_notifier import send_telegram_success
from app.telegram_notifier import send_telegram_success


router = APIRouter(prefix="/api/steem", tags=["Steem"])


# Pydantic schemas
class CreatePostRequest(BaseModel):
    user_id: str
    user_message: Optional[str] = None  # Personal message from user


class PostPreviewRequest(BaseModel):
    user_id: str
    user_message: Optional[str] = None


class PostPreviewResponse(BaseModel):
    title: str
    body: str
    tags: List[str]
    cost_coins: int
    user_balance: int
    can_afford: bool


class CreatePostResponse(BaseModel):
    success: bool
    message: str
    post_url: Optional[str] = None
    transaction_id: Optional[str] = None
    permlink: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[List[str]] = None


def get_coin_service(db: Session = Depends(get_db)) -> CoinService:
    """Dependency to get CoinService instance"""
    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    return CoinService(coins_repo, transaction_repo)


def get_steem_post_service() -> SteemPostService:
    """Dependency to get SteemPostService instance"""
    return SteemPostService()


def get_user_statistics(db: Session, user_id: str) -> Dict[str, Any]:
    """Get user statistics for post generation"""
    from app.models import GameSession, CoinTransaction
    from sqlalchemy import func, distinct
    from datetime import datetime
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get level info
    level = 1
    total_xp = user.total_xp_earned or 0
    
    # Calculate level from XP (simplified - you may want to use level_system.py)
    try:
        from app.level_system import get_user_level_info
        level_info = get_user_level_info(user_id, db)
        if level_info:
            level = level_info.get('current_level', 1)
    except Exception as e:
        print(f"Could not get level info: {e}")
        # Fallback: estimate level from XP
        level = max(1, int((total_xp / 100) ** 0.5))
    
    # Get games played count
    games_played = db.query(func.count(GameSession.session_id)).filter(
        GameSession.user_id == user_id
    ).scalar() or 0
    
    # Get quests done (count quest_reward transactions)
    quests_done = db.query(func.count(CoinTransaction.transaction_id)).filter(
        CoinTransaction.user_id == user_id,
        CoinTransaction.transaction_type == 'quest_reward'
    ).scalar() or 0
    
    # Get games tried (unique games played)
    games_tried = db.query(func.count(distinct(GameSession.game_id))).filter(
        GameSession.user_id == user_id
    ).scalar() or 0
    
    # Get days member
    days_member = 0
    if user.created_at:
        try:
            created_date = datetime.fromisoformat(user.created_at)
            now = datetime.utcnow()
            days_member = (now - created_date).days
        except Exception as e:
            print(f"Could not calculate days_member: {e}")
            days_member = 0
    
    # Get leaderboard positions (top 5 best ranks)
    leaderboard_entries = db.query(
        Leaderboard.game_id,
        Leaderboard.rank,
        Leaderboard.score,
        Game.title
    ).join(
        Game, Leaderboard.game_id == Game.game_id
    ).filter(
        Leaderboard.user_id == user_id,
        Leaderboard.rank.isnot(None)
    ).order_by(
        Leaderboard.rank.asc()
    ).limit(5).all()
    
    leaderboard_positions = []
    for entry in leaderboard_entries:
        leaderboard_positions.append({
            "game_id": entry.game_id,
            "game_name": entry.title,
            "rank": entry.rank,
            "score": entry.score
        })
    
    return {
        "username": user.steem_username or user.username,
        "steem_username": user.steem_username,
        "level": level,
        "total_xp": total_xp,
        "games_played": games_played,
        "quests_done": quests_done,
        "games_tried": games_tried,
        "days_member": days_member,
        "leaderboard_positions": leaderboard_positions
    }


@router.post("/preview-post", response_model=PostPreviewResponse)
async def preview_post(
    request: PostPreviewRequest,
    db: Session = Depends(get_db),
    post_service: SteemPostService = Depends(get_steem_post_service),
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Generate a preview of the Steem post without publishing
    
    Args:
        request: Preview request with user_id and optional message
        
    Returns:
        Post preview with title, body, tags, and affordability info
    """
    try:
        # Get user statistics
        stats = get_user_statistics(db, request.user_id)
        
        # Get user balance
        balance_info = coin_service.get_user_balance(request.user_id)
        user_balance = balance_info['balance']
        
        # Validate post request
        validation = post_service.validate_post_request(
            user_id=request.user_id,
            steem_username=stats['steem_username'],
            user_balance=user_balance
        )
        
        if not validation['success']:
            # Still generate preview but indicate they can't afford it
            pass
        
        # Generate post content
        post_content = post_service.generate_post_content(
            username=stats['username'],
            level=stats['level'],
            total_xp=stats['total_xp'],
            games_played=stats['games_played'],
            quests_done=stats['quests_done'],
            games_tried=stats['games_tried'],
            days_member=stats['days_member'],
            leaderboard_positions=stats['leaderboard_positions'],
            user_message=request.user_message
        )
        
        return PostPreviewResponse(
            title=post_content['title'],
            body=post_content['body'],
            tags=post_content['tags'],
            cost_coins=post_service.POST_COST_COINS,
            user_balance=user_balance,
            can_afford=validation['success']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.post("/create-post", response_model=CreatePostResponse, response_model_exclude_none=False)
async def create_post(
    request: CreatePostRequest,
    db: Session = Depends(get_db),
    post_service: SteemPostService = Depends(get_steem_post_service),
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Create and prepare Steem post data (actual publishing happens via Keychain on frontend)
    
    This endpoint:
    1. Validates user has enough coins
    2. Generates post content
    3. Deducts coins from user balance
    4. Returns post data for frontend to publish via Keychain
    
    Args:
        request: Create post request with user_id and optional message
        
    Returns:
        Post data ready for Keychain broadcasting
    """
    try:
        # Get user from database
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check cooldown period (48 hours)
        if user.last_steem_post:
            from datetime import datetime, timedelta
            last_post_time = datetime.fromisoformat(user.last_steem_post)
            current_time = datetime.utcnow()
            time_diff = current_time - last_post_time
            cooldown_hours = 48
            
            if time_diff.total_seconds() < cooldown_hours * 3600:
                hours_remaining = cooldown_hours - (time_diff.total_seconds() / 3600)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"You can publish a new post in {hours_remaining:.1f} hours. Posts are limited to once every 48 hours."
                )
        
        # Get user statistics
        stats = get_user_statistics(db, request.user_id)
        
        # Get user balance
        balance_info = coin_service.get_user_balance(request.user_id)
        user_balance = balance_info['balance']
        
        # Validate post request
        validation = post_service.validate_post_request(
            user_id=request.user_id,
            steem_username=stats['steem_username'],
            user_balance=user_balance
        )
        
        if not validation['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation['message']
            )
        
        # Generate post content
        post_content = post_service.generate_post_content(
            username=stats['username'],
            level=stats['level'],
            total_xp=stats['total_xp'],
            games_played=stats['games_played'],
            quests_done=stats['quests_done'],
            games_tried=stats['games_tried'],
            days_member=stats['days_member'],
            leaderboard_positions=stats['leaderboard_positions'],
            user_message=request.user_message
        )
        
        # NOTE: Coins are now deducted AFTER successful publication
        # (in confirm-post or publish-with-key endpoints)
        # This prevents coin loss if Keychain fails to open or other errors occur
        
        # Return post data for frontend to publish
        # The frontend will use Steem Keychain to actually broadcast
        return CreatePostResponse(
            success=True,
            message="Post data prepared. Please confirm publication via Steem Keychain.",
            transaction_id=None,  # No transaction yet - coins deducted after publication
            post_url=None,
            permlink=None,
            title=post_content['title'],
            body=post_content['body'],
            tags=post_content['tags']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create post: {str(e)}"
        )


@router.get("/post-cost")
async def get_post_cost():
    """Get the cost in coins to publish a post"""
    return {
        "cost_coins": SteemPostService.POST_COST_COINS,
        "currency": "coins"
    }


@router.get("/post-availability/{user_id}")
async def get_post_availability(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if user can publish a post (cooldown check)
    
    Args:
        user_id: User identifier
        
    Returns:
        Availability status with cooldown info
    """
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check cooldown period (48 hours)
        can_post = True
        hours_remaining = 0
        minutes_remaining = 0
        seconds_remaining_int = 0
        next_available_time = None
        
        if user.last_steem_post:
            from datetime import datetime, timedelta
            last_post_time = datetime.fromisoformat(user.last_steem_post)
            current_time = datetime.utcnow()
            time_diff = current_time - last_post_time
            cooldown_hours = 48
            
            if time_diff.total_seconds() < cooldown_hours * 3600:
                can_post = False
                seconds_remaining = (cooldown_hours * 3600) - time_diff.total_seconds()
                hours_remaining = int(seconds_remaining // 3600)
                minutes_remaining = int((seconds_remaining % 3600) // 60)
                seconds_remaining_int = int(seconds_remaining % 60)
                next_available_time = (last_post_time + timedelta(hours=cooldown_hours)).isoformat()
        
        return {
            "can_post": can_post,
            "hours_remaining": hours_remaining,
            "minutes_remaining": minutes_remaining,
            "seconds_remaining": seconds_remaining_int,
            "next_available_time": next_available_time,
            "cooldown_hours": 48
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check availability: {str(e)}"
        )


@router.post("/confirm-post")
async def confirm_post(
    request: dict,
    db: Session = Depends(get_db),
    coin_service: CoinService = Depends(get_coin_service),
    post_service: SteemPostService = Depends(get_steem_post_service)
):
    """
    Confirm successful post publication, deduct coins, and update cooldown timer
    
    This endpoint should be called ONLY after the post has been successfully
    published to the blockchain via Keychain.
    
    Args:
        request: Dict with user_id, post_url, and post_title
        
    Returns:
        Confirmation status
    """
    try:
        user_id = request.get('user_id')
        post_url = request.get('post_url')
        post_title = request.get('post_title', 'Gaming milestone post')
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing user_id"
            )
        
        # Get user
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Deduct coins now that post is confirmed successful
        transaction = coin_service.spend_coins(
            user_id=user_id,
            amount=post_service.POST_COST_COINS,
            transaction_type="steem_post_publish",
            source_id=None,
            description=f"Published post: {post_title[:50]}...",
            extra_data={
                "post_title": post_title,
                "post_url": post_url
            }
        )
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance to complete publication"
            )
        
        # Update last post timestamp
        from datetime import datetime
        user.last_steem_post = datetime.utcnow().isoformat()
        db.commit()
        
        # Send Telegram notification
        try:
            send_telegram_success(
                title="New Steem Post Published (Keychain)",
                message=f"User @{user.steem_username} published a new post!",
                stats={
                    "User": user.steem_username,
                    "Platform User ID": user_id,
                    "Post URL": post_url
                }
            )
        except Exception as telegram_error:
            print(f"Failed to send Telegram notification: {telegram_error}")
        
        return {
            "success": True,
            "message": "Post confirmed and cooldown timer updated",
            "next_post_available": datetime.fromisoformat(user.last_steem_post),
            "cooldown_hours": 48
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm post: {str(e)}"
        )


@router.post("/publish-with-key")
async def publish_with_key(
    request: dict,
    db: Session = Depends(get_db),
    coin_service: CoinService = Depends(get_coin_service),
    post_service: SteemPostService = Depends(get_steem_post_service)
):
    """
    Publish post to Steem blockchain using posting key (server-side with beem)
    
    This endpoint:
    1. Verifies the posting key matches the username
    2. Publishes the post using beem library
    3. Deducts coins after successful publication
    4. Returns the permlink and post URL
    
    Args:
        request: Dict with username, posting_key, title, body, tags, metadata, user_id
        
    Returns:
        Publication result with permlink and URL
    """
    try:
        username = request.get('username')
        posting_key = request.get('posting_key')
        title = request.get('title')
        body = request.get('body')
        tags = request.get('tags', [])
        metadata = request.get('metadata', {})
        
        if not all([username, posting_key, title, body]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: username, posting_key, title, body"
            )
        
        # Verify posting key
        from app.steem_checker import verify_posting_key
        verification = verify_posting_key(username, posting_key)
        
        if not verification['success']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=verification['message']
            )
        
        # Generate permlink
        import time
        import re
        import random
        timestamp = int(time.time())
        random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=6))
        
        # Convert title to URL-safe format
        permlink = re.sub(r'[^a-z0-9\s-]', '', title.lower())
        permlink = re.sub(r'\s+', '-', permlink)
        permlink = re.sub(r'-+', '-', permlink)
        permlink = permlink[:100]
        permlink = f"{permlink}-{random_suffix}"
        
        # Publish using beem
        try:
            from beem import Steem
            
            # Create Steem instance with posting key
            steem = Steem(keys=[posting_key], node='https://api.steemit.com')
            
            # Prepare metadata
            json_metadata = {
                'tags': tags,
                **metadata
            }
            
            # Post using steem.post() method
            steem.post(
                title=title,
                body=body,
                author=username,
                permlink=permlink,
                tags=tags,
                json_metadata=json_metadata,
                self_vote=False
            )
            
            post_url = f"https://www.cur8.fun/app/@{username}/{permlink}"
            
            # Update last post timestamp and deduct coins
            user = db.query(User).filter(User.steem_username == username).first()
            if user:
                # Deduct coins now that post is confirmed successful
                transaction = coin_service.spend_coins(
                    user_id=user.user_id,
                    amount=post_service.POST_COST_COINS,
                    transaction_type="steem_post_publish",
                    source_id=None,
                    description=f"Published post: {title[:50]}...",
                    extra_data={
                        "post_title": title,
                        "post_url": post_url,
                        "permlink": permlink
                    }
                )
                
                if not transaction:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Insufficient balance to complete publication"
                    )
                
                from datetime import datetime
                user.last_steem_post = datetime.utcnow().isoformat()
                db.commit()
            
            # Send Telegram notification
            try:
                send_telegram_success(
                    title="New Steem Post Published (Posting Key)",
                    message=f"User @{username} published a new post using posting key!",
                    stats={
                        "User": username,
                        "Post URL": post_url,
                        "Permlink": permlink
                    }
                )
            except Exception as telegram_error:
                print(f"Failed to send Telegram notification: {telegram_error}")
            
            return {
                "success": True,
                "permlink": permlink,
                "post_url": post_url,
                "message": "Post published successfully on Steem blockchain"
            }
            
        except Exception as beem_error:
            print(f"Beem publication error: {beem_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to publish post: {str(beem_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish post: {str(e)}"
        )


@router.post("/refund-post")
async def refund_post(
    request: dict,
    db: Session = Depends(get_db),
    post_service: SteemPostService = Depends(get_steem_post_service),
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Refund coins if post publication failed
    
    Args:
        request: Dict with user_id and transaction_id
        
    Returns:
        Refund confirmation
    """
    try:
        user_id = request.get('user_id')
        transaction_id = request.get('transaction_id')
        
        if not user_id or not transaction_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing user_id or transaction_id"
            )
        
        # Refund the coins
        refund_transaction = coin_service.award_coins(
            user_id=user_id,
            amount=post_service.POST_COST_COINS,
            transaction_type="steem_post_refund",
            source_id=None,
            description=f"Refund for failed post publication (original tx: {transaction_id})",
            extra_data={
                "original_transaction_id": transaction_id,
                "reason": "Publication failed"
            }
        )
        
        return {
            "success": True,
            "message": "Coins refunded successfully",
            "refund_transaction_id": refund_transaction['transaction_id'],
            "refunded_amount": post_service.POST_COST_COINS
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refund coins: {str(e)}"
        )