"""
Push Notifications Router
API endpoints for Web Push notification subscriptions and sending.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
import os

from app.database import get_db
from app.models import PushSubscription, User
from app.push_notification_service import push_service, send_push_to_user, send_push_to_all_users

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

# ============ SCHEMAS ============

class PushSubscriptionKeys(BaseModel):
    """Push subscription keys from browser."""
    p256dh: str = Field(..., description="Client public key")
    auth: str = Field(..., description="Auth secret")


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a push subscription."""
    user_id: str = Field(..., description="User ID")
    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys = Field(..., description="Subscription keys")
    user_agent: Optional[str] = Field(None, description="Browser/device info")


class PushSubscriptionResponse(BaseModel):
    """Schema for push subscription response."""
    subscription_id: int
    user_id: str
    is_active: bool
    created_at: str
    
    class Config:
        orm_mode = True


class PushNotificationSend(BaseModel):
    """Schema for sending a push notification."""
    title: str = Field(..., min_length=1, max_length=100, description="Notification title")
    body: str = Field(..., min_length=1, max_length=500, description="Notification body")
    icon: Optional[str] = Field(None, description="Icon URL")
    url: Optional[str] = Field(None, description="URL to open on click")
    tag: Optional[str] = Field(None, description="Notification tag for grouping")
    user_id: Optional[str] = Field(None, description="Target user ID (omit for broadcast)")


class VapidPublicKeyResponse(BaseModel):
    """Response with VAPID public key."""
    public_key: str
    configured: bool


# ============ ENDPOINTS ============

@router.get("/push/vapid-public-key", response_model=VapidPublicKeyResponse, tags=["push-notifications"])
async def get_vapid_public_key():
    """
    Get the VAPID public key for push subscription.
    Frontend needs this to subscribe to push notifications.
    """
    return VapidPublicKeyResponse(
        public_key=push_service.get_public_key(),
        configured=push_service.is_configured()
    )


@router.post("/push/subscribe", response_model=PushSubscriptionResponse, tags=["push-notifications"])
@limiter.limit("10/minute")
async def subscribe_to_push(
    request: Request,
    subscription: PushSubscriptionCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new push subscription for a user.
    Called by frontend after successful service worker registration.
    """
    # Verify user exists
    user = db.query(User).filter(User.user_id == subscription.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.utcnow().isoformat()
    
    # Check if subscription already exists (by endpoint)
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()
    
    if existing:
        # Update existing subscription
        existing.user_id = subscription.user_id
        existing.p256dh_key = subscription.keys.p256dh
        existing.auth_key = subscription.keys.auth
        existing.user_agent = subscription.user_agent
        existing.is_active = 1
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        
        logger.info(f"✅ Updated push subscription {existing.subscription_id} for user {subscription.user_id}")
        return PushSubscriptionResponse(
            subscription_id=existing.subscription_id,
            user_id=existing.user_id,
            is_active=bool(existing.is_active),
            created_at=existing.created_at
        )
    
    # Create new subscription
    new_sub = PushSubscription(
        user_id=subscription.user_id,
        endpoint=subscription.endpoint,
        p256dh_key=subscription.keys.p256dh,
        auth_key=subscription.keys.auth,
        user_agent=subscription.user_agent,
        is_active=1,
        created_at=now,
        updated_at=now
    )
    
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    
    logger.info(f"✅ Created push subscription {new_sub.subscription_id} for user {subscription.user_id}")
    
    return PushSubscriptionResponse(
        subscription_id=new_sub.subscription_id,
        user_id=new_sub.user_id,
        is_active=bool(new_sub.is_active),
        created_at=new_sub.created_at
    )


@router.post("/push/unsubscribe", tags=["push-notifications"])
@limiter.limit("10/minute")
async def unsubscribe_from_push(
    request: Request,
    user_id: str,
    endpoint: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Unsubscribe from push notifications.
    If endpoint is provided, only that subscription is deactivated.
    Otherwise, all subscriptions for the user are deactivated.
    """
    now = datetime.utcnow().isoformat()
    
    if endpoint:
        # Deactivate specific subscription
        result = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.endpoint == endpoint
        ).update({"is_active": 0, "updated_at": now})
    else:
        # Deactivate all user subscriptions
        result = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).update({"is_active": 0, "updated_at": now})
    
    db.commit()
    
    logger.info(f"🔕 Deactivated {result} push subscription(s) for user {user_id}")
    return {"success": True, "deactivated_count": result}


@router.get("/push/subscriptions/{user_id}", tags=["push-notifications"])
async def get_user_subscriptions(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get all push subscriptions for a user."""
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).all()
    
    return {
        "user_id": user_id,
        "subscriptions": [sub.to_dict() for sub in subscriptions],
        "active_count": sum(1 for s in subscriptions if s.is_active)
    }


@router.post("/push/send", tags=["push-notifications"])
@limiter.limit("30/minute")
async def send_push_notification(
    request: Request,
    notification: PushNotificationSend,
    db: Session = Depends(get_db)
):
    """
    Send a push notification.
    If user_id is provided, send to that user only.
    Otherwise, requires admin key and broadcasts to all users.
    """
    if not push_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured. VAPID keys missing."
        )
    
    if notification.user_id:
        # Send to specific user
        result = send_push_to_user(
            user_id=notification.user_id,
            title=notification.title,
            body=notification.body,
            icon=notification.icon,
            url=notification.url,
            tag=notification.tag
        )
    else:
        # Broadcast requires admin API key
        admin_key = request.headers.get("X-Admin-API-Key")
        expected_key = os.getenv("ADMIN_API_KEY", "")
        
        if not admin_key or admin_key != expected_key:
            raise HTTPException(
                status_code=403,
                detail="Admin API key required for broadcast notifications"
            )
        
        result = send_push_to_all_users(
            title=notification.title,
            body=notification.body,
            icon=notification.icon,
            url=notification.url,
            tag=notification.tag
        )
    
    return result


@router.post("/push/test/{user_id}", tags=["push-notifications"])
@limiter.limit("5/minute")
async def send_test_notification(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db)
):
    """Send a test push notification to a user."""
    if not push_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured"
        )
    
    # Verify user has active subscriptions
    active_count = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.is_active == 1
    ).count()
    
    if active_count == 0:
        raise HTTPException(
            status_code=404,
            detail="No active push subscriptions for this user"
        )
    
    result = send_push_to_user(
        user_id=user_id,
        title="🎮 Test Notification",
        body="Push notifications are working! You'll receive updates about quests, rewards, and more.",
        url="/",
        tag="test"
    )
    
    return result
