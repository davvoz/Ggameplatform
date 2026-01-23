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
import os


router = APIRouter(prefix="/api/steem", tags=["Steem"])


# Pydantic schemas
class CreatePostRequest(BaseModel):
    user_id: str
    user_message: Optional[str] = None  # Personal message from user
    beneficiaries: Optional[List[Dict[str, Any]]] = None


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
    beneficiaries: Optional[List[Dict[str, Any]]] = None
    keychain_operations: Optional[List[Any]] = None


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
    from app.models import GameSession, CoinTransaction, WeeklyLeaderboard
    from app.level_system import LevelSystem
    from sqlalchemy import func, distinct
    from datetime import datetime
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get level info using the same logic as /api/levels/{user_id} endpoint
    total_xp = user.total_xp_earned or 0
    xp_progress = LevelSystem.get_xp_progress(total_xp)
    level = xp_progress.get('current_level', 1)
    
    # Get games played count - count all sessions (matches frontend behavior)
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
    
    # Get WEEKLY leaderboard positions (top 5 best ranks from current week)
    from app.leaderboard_repository import LeaderboardRepository
    
    lb_repo = LeaderboardRepository(db)
    week_start, week_end = lb_repo.get_current_week()
    
    leaderboard_entries = db.query(
        WeeklyLeaderboard.game_id,
        WeeklyLeaderboard.rank,
        WeeklyLeaderboard.score,
        Game.title
    ).join(
        Game, WeeklyLeaderboard.game_id == Game.game_id
    ).filter(
        WeeklyLeaderboard.user_id == user_id,
        WeeklyLeaderboard.week_start == week_start,
        WeeklyLeaderboard.rank.isnot(None)
    ).order_by(
        WeeklyLeaderboard.rank.asc()
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
        
        # Generate permlink for Keychain
        import time, re, random
        timestamp = int(time.time())
        random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=6))
        permlink = re.sub(r'[^a-z0-9\s-]', '', post_content['title'].lower())
        permlink = re.sub(r'\s+', '-', permlink)
        permlink = re.sub(r'-+', '-', permlink)
        permlink = permlink[:100]
        permlink = f"{permlink}-{random_suffix}"

        # Prepare beneficiaries for Keychain: allow override from request, otherwise env/default
        beneficiaries = None
        if hasattr(request, 'beneficiaries') and request.beneficiaries:
            beneficiaries = request.beneficiaries

        if beneficiaries is None:
            beneficiary_account = os.getenv('STEEM_BENEFICIARY_ACCOUNT', 'micro.cur8')
            beneficiary_weight = int(os.getenv('STEEM_BENEFICIARY_WEIGHT', '500'))
            beneficiaries = [{
                "account": beneficiary_account,
                "weight": beneficiary_weight
            }]

        # Prepare metadata for post (include useful tracking)
        metadata = post_service.prepare_post_metadata(
            username=stats['username'],
            user_id=request.user_id,
            level=stats['level'],
            total_xp=stats['total_xp']
        )

        json_metadata = { 'tags': post_content['tags'], **metadata }

        # Build Keychain operations: 'comment' + 'comment_options' with beneficiaries
        comment_op = [
            'comment',
            {
                'parent_author': '',
                'parent_permlink': 'cur8',
                'author': stats['username'],
                'permlink': permlink,
                'title': post_content['title'],
                'body': post_content['body'],
                'json_metadata': json_metadata
            }
        ]

        comment_options_op = [
            'comment_options',
            {
                'author': stats['username'],
                'permlink': permlink,
                'max_accepted_payout': '1000000.000 SBD',
                'allow_votes': True,
                'allow_curation_rewards': True,
                'extensions': [[0, { 'beneficiaries': beneficiaries }]]
            }
        ]

        keychain_ops = [comment_op, comment_options_op]

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
            permlink=permlink,
            title=post_content['title'],
            body=post_content['body'],
            tags=post_content['tags'],
            beneficiaries=beneficiaries,
            keychain_operations=keychain_ops
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
    permlink = _generate_permlink(title)
    
    # Publish using beem
    post_url = _publish_to_steem(username, posting_key, title, body, tags, metadata, permlink, request)
    
    # Update user data and deduct coins
    _update_user_after_publish(db, username, title, post_url, permlink, coin_service, post_service)
    
    # Send Telegram notification
    _send_publish_notification(username, post_url, permlink)
    
    return {
        "success": True,
        "permlink": permlink,
        "post_url": post_url,
        "message": "Post published successfully on Steem blockchain"
    }


def _generate_permlink(title: str) -> str:
    """Generate a unique permlink from the title"""
    import re
    import random
    
    random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=6))
    
    # Convert title to URL-safe format
    permlink = re.sub(r'[^a-z0-9\s-]', '', title.lower())
    permlink = re.sub(r'\s+', '-', permlink)
    permlink = re.sub(r'-+', '-', permlink)
    permlink = permlink[:100]
    return f"{permlink}-{random_suffix}"


def _get_beneficiaries(request: dict) -> List[Dict[str, Any]]:
    """Get beneficiaries from request or environment defaults"""
    beneficiaries = request.get('beneficiaries')
    if beneficiaries is None:
        beneficiary_account = os.getenv('STEEM_BENEFICIARY_ACCOUNT', 'micro.cur8')
        beneficiary_weight = int(os.getenv('STEEM_BENEFICIARY_WEIGHT', '500'))
        beneficiaries = [{
            "account": beneficiary_account,
            "weight": beneficiary_weight
        }]
    return beneficiaries


import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Steem API nodes with fallback support
STEEM_NODES = [
    'https://api.steemit.com',
    'https://api.moecki.online',
    'https://steemapi.boylikegirl.club',
    'https://steem.senior.workers.dev'
]


@dataclass
class SteemPostData:
    """Data class containing all information needed to publish a Steem post."""
    username: str
    posting_key: str
    title: str
    body: str
    permlink: str
    tags: List[str]
    json_metadata: Dict[str, Any]
    beneficiaries: List[Dict[str, Any]]
    
    def get_post_url(self) -> str:
        """Generate the post URL after successful publication."""
        return f"https://www.cur8.fun/app/@{self.username}/{self.permlink}"
    
    def log_summary(self) -> None:
        """Log a summary of the post data for debugging."""
        logger.info("[STEEM] Starting publication for @%s", self.username)
        logger.info("[STEEM] Permlink: %s", self.permlink)
        logger.info("[STEEM] Title: %s...", self.title[:50])
        logger.debug("[STEEM] Posting key length: %d, starts with: %s...", 
                     len(self.posting_key), self.posting_key[:3])
        logger.debug("[STEEM] Beneficiaries: %s", self.beneficiaries)


class SteemPublisher:
    """
    Handles publishing posts to the Steem blockchain with node fallback support.
    
    This class encapsulates the logic for publishing posts to Steem,
    including error handling and automatic node failover.
    """
    
    def __init__(self, nodes: List[str] = None):
        """
        Initialize the publisher with a list of Steem nodes.
        
        Args:
            nodes: List of Steem API node URLs. Defaults to STEEM_NODES.
        """
        self.nodes = nodes or STEEM_NODES
    
    @staticmethod
    def _is_authority_error(error_message: str) -> bool:
        """Check if error is related to posting authority/key issues."""
        error_lower = error_message.lower()
        has_authority = "authority" in error_lower
        has_missing_posting = "missing" in error_lower and "posting" in error_lower
        return has_authority or has_missing_posting
    
    @staticmethod
    def _create_steem_instance(posting_key: str, node: str):
        """Create a Steem instance with the given posting key and node."""
        from beem import Steem
        return Steem(keys=[posting_key], node=node)
    
    def _execute_post(self, steem_instance, post_data: SteemPostData) -> None:
        """Execute the post operation on Steem blockchain."""
        steem_instance.post(
            title=post_data.title,
            body=post_data.body,
            author=post_data.username,
            permlink=post_data.permlink,
            tags=post_data.tags,
            json_metadata=post_data.json_metadata,
            beneficiaries=post_data.beneficiaries,
            self_vote=False
        )
    
    def _try_publish_on_node(self, node: str, post_data: SteemPostData) -> bool:
        """
        Attempt to publish post on a specific node.
        
        Args:
            node: The Steem API node URL to use
            post_data: The post data to publish
            
        Returns:
            True if successful, False if should retry on another node
            
        Raises:
            HTTPException: If error is related to invalid posting key (no retry)
        """
        try:
            logger.info("[STEEM] Trying node: %s", node)
            
            steem = self._create_steem_instance(post_data.posting_key, node)
            logger.info("[STEEM] Steem instance created successfully")
            
            self._execute_post(steem, post_data)
            
            logger.info("[STEEM] Post published successfully on %s", node)
            return True
            
        except Exception as node_error:
            return self._handle_node_error(node, post_data.username, node_error)
    
    def _handle_node_error(self, node: str, username: str, error: Exception) -> bool:
        """
        Handle errors from a node publication attempt.
        
        Args:
            node: The node that failed
            username: The Steem username
            error: The exception that occurred
            
        Returns:
            False to indicate retry on next node
            
        Raises:
            HTTPException: If error is an authority error (invalid key)
        """
        error_str = str(error)
        logger.warning("[STEEM] Error on %s: %s", node, error_str)
        
        if self._is_authority_error(error_str):
            logger.error("[STEEM] Authority error - invalid posting key for @%s", username)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    f"Invalid posting key for @{username}. "
                    "Please verify you're using the correct POSTING private key "
                    "(starts with '5'), not your active key or master password."
                )
            )
        
        logger.info("[STEEM] Will try next node...")
        return False
    
    def publish(self, post_data: SteemPostData) -> str:
        """
        Publish post to Steem blockchain with automatic node fallback.
        
        Args:
            post_data: The complete post data to publish
            
        Returns:
            Post URL on success
            
        Raises:
            HTTPException: On authentication or publication failure
        """
        import traceback
        
        self._verify_beem_available()
        post_data.log_summary()
        logger.info("[STEEM] Will try %d nodes", len(self.nodes))
        
        last_error = None
        
        for node in self.nodes:
            try:
                if self._try_publish_on_node(node, post_data):
                    post_url = post_data.get_post_url()
                    logger.info("[STEEM] Publication successful! URL: %s", post_url)
                    return post_url
                    
            except HTTPException:
                raise
            except Exception as node_err:
                last_error = node_err
                logger.warning("[STEEM] Node %s failed: %s", node, str(node_err))
                continue
        
        self._raise_all_nodes_failed(last_error)
    
    def _verify_beem_available(self) -> None:
        """Verify that the beem library is available."""
        try:
            from beem import Steem  # noqa: F401
        except ImportError as import_err:
            logger.error("[STEEM] Failed to import beem library: %s", import_err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Steem library not available on server"
            )
    
    def _raise_all_nodes_failed(self, last_error: Exception) -> None:
        """Raise an exception when all nodes have failed."""
        import traceback
        
        logger.error("[STEEM] All %d nodes failed. Last error: %s", 
                     len(self.nodes), last_error)
        traceback.print_exc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to publish post after trying all nodes. "
                f"Please try again later. Error: {str(last_error)}"
            )
        )


# Module-level publisher instance for convenience
_steem_publisher = SteemPublisher()


def _publish_to_steem(
    username: str,
    posting_key: str,
    title: str,
    body: str,
    tags: List[str],
    metadata: Dict[str, Any],
    permlink: str,
    request: dict
) -> str:
    """
    Publish post to Steem blockchain using beem with multiple node fallback.
    
    This is a convenience function that wraps the SteemPublisher class.
    
    Args:
        username: Steem username
        posting_key: User's posting private key
        title: Post title
        body: Post body content
        tags: List of tags
        metadata: Additional metadata
        permlink: Unique post permlink
        request: Original request dict for beneficiaries
        
    Returns:
        Post URL on success
        
    Raises:
        HTTPException: On authentication or publication failure
    """
    post_data = SteemPostData(
        username=username,
        posting_key=posting_key,
        title=title,
        body=body,
        permlink=permlink,
        tags=tags,
        json_metadata={'tags': tags, **metadata},
        beneficiaries=_get_beneficiaries(request)
    )
    
    return _steem_publisher.publish(post_data)


def _update_user_after_publish(
    db: Session,
    username: str,
    title: str,
    post_url: str,
    permlink: str,
    coin_service: CoinService,
    post_service: SteemPostService
) -> None:
    """Update user data and deduct coins after successful publication"""
    from datetime import datetime, timezone
    
    user = db.query(User).filter(User.steem_username == username).first()
    if not user:
        return
    
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
    
    user.last_steem_post = datetime.now(timezone.utc).isoformat()
    db.commit()


def _send_publish_notification(username: str, post_url: str, permlink: str) -> None:
    """Send Telegram notification for successful publication"""
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