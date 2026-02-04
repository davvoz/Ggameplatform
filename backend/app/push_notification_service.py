"""
Push Notification Service
Handles Web Push notifications using VAPID authentication.
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from pywebpush import webpush, WebPushException
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# VAPID Configuration
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@cur8.fun")

# Validate VAPID keys on module load
if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
    logger.warning("⚠️ VAPID keys not configured! Push notifications will not work.")
    logger.warning("Generate keys with: python -c \"from py_vapid import Vapid; v = Vapid(); v.generate_keys(); print('Public:', v.public_key_b64()); print('Private:', v.private_key_b64())\"")


class PushNotificationService:
    """Service for sending Web Push notifications."""
    
    def __init__(self):
        self.vapid_private_key = VAPID_PRIVATE_KEY
        self.vapid_public_key = VAPID_PUBLIC_KEY
        self.vapid_claims = {
            "sub": VAPID_CLAIMS_EMAIL
        }
    
    def is_configured(self) -> bool:
        """Check if VAPID keys are configured."""
        return bool(self.vapid_private_key and self.vapid_public_key)
    
    def get_public_key(self) -> str:
        """Get the VAPID public key for frontend subscription."""
        return self.vapid_public_key
    
    def send_notification(
        self,
        subscription_info: Dict[str, Any],
        title: str,
        body: str,
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        url: Optional[str] = None,
        tag: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        ttl: int = 86400  # 24 hours default TTL
    ) -> Dict[str, Any]:
        """
        Send a push notification to a single subscription.
        
        Args:
            subscription_info: Dict with 'endpoint' and 'keys' (p256dh, auth)
            title: Notification title
            body: Notification body text
            icon: URL to notification icon
            badge: URL to badge icon (small monochrome)
            url: URL to open when notification is clicked
            tag: Tag for notification grouping/replacement
            data: Additional data to pass to service worker
            ttl: Time-to-live in seconds
            
        Returns:
            Dict with 'success' boolean and optional 'error' message
        """
        if not self.is_configured():
            logger.error("VAPID keys not configured")
            return {"success": False, "error": "VAPID keys not configured"}
        
        # Build notification payload
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icons/icon-192x192.png",
            "badge": badge or "/icons/icon-72x72.png",
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "requireInteraction": False,
            "silent": False
        }
        
        if url:
            payload["data"] = {"url": url}
        if tag:
            payload["tag"] = tag
        if data:
            payload["data"] = {**(payload.get("data", {})), **data}
        
        try:
            response = webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims,
                ttl=ttl
            )
            logger.info(f"✅ Push notification sent successfully to {subscription_info.get('endpoint', 'unknown')[:50]}...")
            return {"success": True, "status_code": response.status_code}
            
        except WebPushException as e:
            error_msg = str(e)
            logger.error(f"❌ Push notification failed: {error_msg}")
            
            # Check for subscription expiration/invalidity
            if e.response and e.response.status_code in [404, 410]:
                return {
                    "success": False,
                    "error": "Subscription expired or invalid",
                    "expired": True,
                    "status_code": e.response.status_code
                }
            
            return {
                "success": False,
                "error": error_msg,
                "status_code": e.response.status_code if e.response else None
            }
        except Exception as e:
            logger.error(f"❌ Unexpected error sending push: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def send_bulk_notifications(
        self,
        subscriptions: List[Dict[str, Any]],
        title: str,
        body: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send push notifications to multiple subscriptions.
        
        Args:
            subscriptions: List of subscription_info dicts
            title: Notification title
            body: Notification body
            **kwargs: Additional arguments passed to send_notification
            
        Returns:
            Dict with 'sent', 'failed', 'expired' counts and 'results' list
        """
        results = {
            "sent": 0,
            "failed": 0,
            "expired": [],
            "results": []
        }
        
        for sub in subscriptions:
            result = self.send_notification(sub, title, body, **kwargs)
            results["results"].append({
                "endpoint": sub.get("endpoint", "")[:50] + "...",
                **result
            })
            
            if result.get("success"):
                results["sent"] += 1
            else:
                results["failed"] += 1
                if result.get("expired"):
                    results["expired"].append(sub.get("endpoint"))
        
        logger.info(f"📨 Bulk push: {results['sent']} sent, {results['failed']} failed, {len(results['expired'])} expired")
        return results


# Singleton instance
push_service = PushNotificationService()


# Convenience functions
def send_push_notification(subscription_info: Dict[str, Any], title: str, body: str, **kwargs) -> Dict[str, Any]:
    """Send a single push notification."""
    return push_service.send_notification(subscription_info, title, body, **kwargs)


def send_push_to_user(user_id: str, title: str, body: str, **kwargs) -> Dict[str, Any]:
    """
    Send push notification to all active subscriptions for a user.
    Requires database session - use within a route or with get_db_session().
    """
    from app.database import get_db_session
    from app.models import PushSubscription
    
    with get_db_session() as db:
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id,
            PushSubscription.is_active == 1
        ).all()
        
        if not subscriptions:
            return {"success": False, "error": "No active subscriptions for user"}
        
        sub_infos = [sub.get_subscription_info() for sub in subscriptions]
        return push_service.send_bulk_notifications(sub_infos, title, body, **kwargs)


def send_push_to_all_users(title: str, body: str, **kwargs) -> Dict[str, Any]:
    """
    Send push notification to all active subscriptions.
    Use sparingly - for important platform-wide announcements only.
    """
    from app.database import get_db_session
    from app.models import PushSubscription
    
    with get_db_session() as db:
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.is_active == 1
        ).all()
        
        if not subscriptions:
            return {"success": False, "error": "No active subscriptions"}
        
        sub_infos = [sub.get_subscription_info() for sub in subscriptions]
        result = push_service.send_bulk_notifications(sub_infos, title, body, **kwargs)
        
        # Mark expired subscriptions as inactive
        if result.get("expired"):
            for endpoint in result["expired"]:
                db.query(PushSubscription).filter(
                    PushSubscription.endpoint == endpoint
                ).update({"is_active": 0, "updated_at": datetime.utcnow().isoformat()})
            db.commit()
        
        return result
