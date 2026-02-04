"""
Test Push Notification Script
Invia una notifica push di test a tutti gli utenti iscritti.

Usage:
    python scripts/test_push_notification.py
    python scripts/test_push_notification.py --user USER_ID
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.database import get_db_session
from app.models import PushSubscription
from app.push_notification_service import push_service


def test_push(user_id: str = None):
    """Send a test push notification."""
    
    print("=" * 50)
    print("🔔 Test Push Notification")
    print("=" * 50)
    
    # Check if configured
    if not push_service.is_configured():
        print("❌ VAPID keys not configured!")
        print("   Run setup_push_notifications.bat first")
        return False
    
    print(f"✅ VAPID configured")
    print(f"   Public key: {push_service.vapid_public_key[:30]}...")
    
    with get_db_session() as db:
        # Get subscriptions
        query = db.query(PushSubscription).filter(PushSubscription.is_active == 1)
        
        if user_id:
            query = query.filter(PushSubscription.user_id == user_id)
            print(f"\n📍 Targeting user: {user_id}")
        else:
            print(f"\n📍 Targeting: ALL subscribed users")
        
        subscriptions = query.all()
        
        if not subscriptions:
            print("\n❌ No active subscriptions found!")
            print("   Make sure users have enabled notifications in the browser")
            return False
        
        print(f"📬 Found {len(subscriptions)} subscription(s)")
        
        # Send test notification
        success_count = 0
        fail_count = 0
        
        for sub in subscriptions:
            print(f"\n   → Sending to {sub.user_id}...")
            
            result = push_service.send_notification(
                subscription_info=sub.get_subscription_info(),
                title="🎮 Test Notification",
                body="Le notifiche push funzionano! 🎉",
                icon="/icons/icon-192x192.png",
                url="/",
                tag="test"
            )
            
            if result.get("success"):
                print(f"     ✅ Sent successfully!")
                success_count += 1
            else:
                print(f"     ❌ Failed: {result.get('error')}")
                fail_count += 1
                
                # Mark expired subscriptions
                if result.get("expired"):
                    sub.is_active = 0
                    print(f"     ⚠️ Subscription marked as expired")
        
        db.commit()
        
        print("\n" + "=" * 50)
        print(f"📊 Results: {success_count} sent, {fail_count} failed")
        print("=" * 50)
        
        return success_count > 0


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test push notifications")
    parser.add_argument("--user", "-u", help="Target specific user ID")
    args = parser.parse_args()
    
    test_push(args.user)
