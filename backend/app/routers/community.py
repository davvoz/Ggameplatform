"""
Community WebSocket Router

Real-time chat functionality for the gaming community.
Stores last 100 messages and broadcasts to all connected users.
Supports image and GIF uploads.
"""

import json
import asyncio
import uuid
import os
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
import logging

logger = logging.getLogger(__name__)

# WebSocket router for chat
ws_router = APIRouter(prefix="/ws/community", tags=["community-ws"])

# REST router for uploads
rest_router = APIRouter(prefix="/api/community", tags=["community"])

# Configuration
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads", "community")
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class ChatMessage:
    """Represents a chat message"""
    id: str
    user_id: str
    username: str
    text: str
    timestamp: int
    image_url: Optional[str] = None
    gif_url: Optional[str] = None
    level: Optional[int] = None
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass 
class ConnectedUser:
    """Represents a connected user"""
    user_id: str
    username: str
    websocket: WebSocket
    connected_at: datetime


# =============================================================================
# Community Chat Manager (Singleton)
# =============================================================================

class CommunityChatManager:
    """
    Manages community chat functionality.
    - Stores last 100 messages
    - Broadcasts messages to all connected users
    - Tracks online users
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.connections: Dict[str, ConnectedUser] = {}
        self.messages: List[ChatMessage] = []
        self.max_messages = 100
        self.message_counter = 0
        self._initialized = True
        
        logger.info("[CommunityChat] Manager initialized")
    
    async def connect(self, websocket: WebSocket, user_id: str, username: str):
        """Add a new connection (websocket already accepted)"""
        # Remove existing connection for same user if exists
        if user_id in self.connections:
            try:
                old_ws = self.connections[user_id].websocket
                await old_ws.close(code=1000, reason="New connection opened")
            except Exception:
                pass
        
        self.connections[user_id] = ConnectedUser(
            user_id=user_id,
            username=username,
            websocket=websocket,
            connected_at=datetime.utcnow()
        )
        
        logger.info(f"[CommunityChat] User {username} ({user_id}) connected. Total: {len(self.connections)}")
        
        # Send message history
        await self._send_history(websocket)
        
        # Send current stats
        await self._send_stats(websocket)
        
        # Broadcast join event
        await self._broadcast_user_event(user_id, username, "join")
    
    async def disconnect(self, user_id: str):
        """Remove a connection"""
        if user_id in self.connections:
            user = self.connections[user_id]
            username = user.username
            del self.connections[user_id]
            
            logger.info(f"[CommunityChat] User {username} ({user_id}) disconnected. Total: {len(self.connections)}")
            
            # Broadcast leave event
            await self._broadcast_user_event(user_id, username, "leave")
    
    async def handle_message(self, user_id: str, data: dict):
        """Handle incoming message from a user"""
        message_type = data.get("type", "")
        
        if message_type == "message":
            await self._handle_chat_message(user_id, data)
        elif message_type == "history":
            await self._handle_history_request(user_id, data)
        elif message_type == "ping":
            await self._send_pong(user_id)
    
    async def _handle_chat_message(self, user_id: str, data: dict):
        """Process and broadcast a chat message"""
        if user_id not in self.connections:
            return
        
        user = self.connections[user_id]
        text = data.get("text", "").strip()
        image_url = data.get("image_url")
        gif_url = data.get("gif_url")
        
        # Validate message - must have text OR media
        has_media = bool(image_url or gif_url)
        
        if not text and not has_media:
            await self._send_error(user_id, "Message cannot be empty")
            return
        
        if text and len(text) > 500:
            await self._send_error(user_id, "Message too long (max 500 characters)")
            return
        
        # Validate URLs if present (basic security check)
        if image_url and not self._is_valid_media_url(image_url):
            await self._send_error(user_id, "Invalid image URL")
            return
        
        if gif_url and not self._is_valid_media_url(gif_url):
            await self._send_error(user_id, "Invalid GIF URL")
            return
        
        # Create message
        self.message_counter += 1
        message = ChatMessage(
            id=f"msg_{self.message_counter}_{int(datetime.utcnow().timestamp())}",
            user_id=user_id,
            username=user.username,
            text=text,
            timestamp=int(datetime.utcnow().timestamp() * 1000),
            image_url=data.get("image_url"),
            gif_url=data.get("gif_url"),
            level=data.get("level")
        )
        
        # Store message (keep only last 100)
        self.messages.append(message)
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]
        
        logger.debug(f"[CommunityChat] Message from {user.username}: {text[:50]}...")
        
        # Broadcast to all connected users
        await self._broadcast_message(message)
        
        # Send push notifications to users who are NOT currently connected
        await self._send_push_to_offline_users(message)
    
    async def _handle_history_request(self, user_id: str, data: dict):
        """Handle request for message history"""
        if user_id not in self.connections:
            return
        
        offset = data.get("offset", 0)
        limit = min(data.get("limit", 50), 100)
        
        # Get messages (newest first)
        messages = list(reversed(self.messages))
        messages = messages[offset:offset + limit]
        
        await self._send_to_user(user_id, {
            "type": "history",
            "messages": [m.to_dict() for m in messages]
        })
    
    async def _broadcast_message(self, message: ChatMessage):
        """Broadcast a message to all connected users"""
        payload = {
            "type": "message",
            "message": message.to_dict()
        }
        await self._broadcast(payload)
    
    async def _broadcast_user_event(self, user_id: str, username: str, event_type: str):
        """Broadcast user join/leave event"""
        payload = {
            "type": f"user_{event_type}",
            "user": {
                "user_id": user_id,
                "username": username
            },
            "stats": self._get_stats()
        }
        await self._broadcast(payload)
    
    async def _send_history(self, websocket: WebSocket):
        """Send message history to a specific websocket"""
        # Send last 50 messages (newest first)
        messages = list(reversed(self.messages[-50:]))
        
        await websocket.send_json({
            "type": "history",
            "messages": [m.to_dict() for m in messages]
        })
    
    async def _send_stats(self, websocket: WebSocket):
        """Send current stats to a specific websocket"""
        await websocket.send_json({
            "type": "stats",
            "stats": self._get_stats()
        })
    
    async def _send_pong(self, user_id: str):
        """Send pong response"""
        await self._send_to_user(user_id, {"type": "pong"})
    
    async def _send_error(self, user_id: str, error: str):
        """Send error to a specific user"""
        await self._send_to_user(user_id, {
            "type": "error",
            "error": error
        })
    
    async def _send_to_user(self, user_id: str, data: dict):
        """Send data to a specific user"""
        if user_id in self.connections:
            try:
                await self.connections[user_id].websocket.send_json(data)
            except Exception as e:
                logger.error(f"[CommunityChat] Error sending to {user_id}: {e}")
    
    async def _broadcast(self, data: dict):
        """Broadcast data to all connected users"""
        disconnected = []
        
        for user_id, user in self.connections.items():
            try:
                await user.websocket.send_json(data)
            except Exception as e:
                logger.warning(f"[CommunityChat] Failed to send to {user_id}: {e}")
                disconnected.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected:
            await self.disconnect(user_id)
    
    def _get_stats(self) -> dict:
        """Get current chat statistics"""
        latest_id = self.messages[-1].id if self.messages else None
        return {
            "onlineUsers": len(self.connections),
            "totalMessages": len(self.messages),
            "totalMembers": len(self.connections),  #  Could be enhanced to track unique users
            "latestMessageId": latest_id
        }
    
    async def _send_push_to_offline_users(self, message: ChatMessage):
        """Send push notification to users who have subscriptions but are not connected"""
        try:
            from app.database import get_db_session
            from app.models import PushSubscription
            from app.push_notification_service import push_service
            
            # Get list of currently connected user IDs
            connected_user_ids = set(self.connections.keys())
            
            with get_db_session() as db:
                # Get all active push subscriptions for users NOT currently connected
                subscriptions = db.query(PushSubscription).filter(
                    PushSubscription.is_active == 1,
                    ~PushSubscription.user_id.in_(connected_user_ids) if connected_user_ids else True
                ).all()
                
                if not subscriptions:
                    return
                
                # Truncate message text for notification
                text_preview = message.text[:100] + "..." if len(message.text) > 100 else message.text
                if not text_preview and message.image_url:
                    text_preview = "📷 Ha inviato un'immagine"
                elif not text_preview and message.gif_url:
                    text_preview = "🎬 Ha inviato una GIF"
                
                # Build notification
                title = f"💬 {message.username}"
                body = text_preview
                
                # Send to each subscription (async in background to not block chat)
                for sub in subscriptions:
                    try:
                        sub_info = sub.get_subscription_info()
                        result = push_service.send_notification(
                            subscription_info=sub_info,
                            title=title,
                            body=body,
                            url="/#/community",
                            tag=f"chat-{message.user_id}",  # Group by sender
                            ttl=300  # 5 minutes TTL for chat messages
                        )
                        
                        # Mark expired subscriptions
                        if result.get("expired"):
                            sub.is_active = 0
                            sub.updated_at = datetime.utcnow().isoformat()
                            
                    except Exception as e:
                        logger.warning(f"[CommunityChat] Push failed for {sub.user_id}: {e}")
                
                db.commit()
                
                logger.info(f"[CommunityChat] Sent push notifications to {len(subscriptions)} offline users")
                
        except Exception as e:
            logger.error(f"[CommunityChat] Error sending push notifications: {e}")

    def _is_valid_media_url(self, url: str) -> bool:
        """
        Validate media URL for security.
        Allows our own uploads and trusted sources (GIPHY).
        """
        if not url or not isinstance(url, str):
            return False
        
        # Allow our own uploads
        if url.startswith("/static/uploads/") or "/static/uploads/" in url:
            return True
        
        # Allow GIPHY URLs
        trusted_domains = [
            "giphy.com",
            "media.giphy.com",
            "media0.giphy.com",
            "media1.giphy.com",
            "media2.giphy.com",
            "media3.giphy.com",
            "media4.giphy.com",
        ]
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            
            # Must be https for external URLs
            if parsed.scheme not in ("http", "https", ""):
                return False
            
            # Check against trusted domains
            domain = parsed.netloc.lower()
            for trusted in trusted_domains:
                if domain == trusted or domain.endswith("." + trusted):
                    return True
            
            return False
        except Exception:
            return False
    
    def get_online_users(self) -> List[dict]:
        """Get list of online users"""
        return [
            {
                "user_id": user.user_id,
                "username": user.username,
                "connected_at": user.connected_at.isoformat()
            }
            for user in self.connections.values()
        ]


# Global instance
chat_manager = CommunityChatManager()


# =============================================================================
# REST Endpoints - Image Upload & GIPHY
# =============================================================================

@rest_router.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    """
    Upload an image or GIF for chat.
    Max size: 5MB
    Allowed types: jpg, jpeg, png, gif, webp
    """
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{unique_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Determine if it's a GIF
    is_gif = ext == ".gif"
    
    # Save file
    try:
        with open(filepath, "wb") as f:
            f.write(content)
        
        # Return URL path
        media_url = f"/static/uploads/community/{filename}"
        logger.info(f"[Community] {'GIF' if is_gif else 'Image'} uploaded: {filename}")
        
        return {
            "success": True, 
            "url": media_url, 
            "filename": filename,
            "is_gif": is_gif
        }
    
    except Exception as e:
        logger.error(f"[Community] Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")


# =============================================================================
# WebSocket Endpoint
# =============================================================================

@ws_router.websocket("")
async def community_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for community chat.
    
    Message Types (Client -> Server):
    - join: { type: "join", user_id: str, username: str }
    - message: { type: "message", text: str, image_url?: str, gif_url?: str }
    - history: { type: "history", offset?: int, limit?: int }
    - ping: { type: "ping" }
    
    Message Types (Server -> Client):
    - message: { type: "message", message: ChatMessage }
    - history: { type: "history", messages: List[ChatMessage] }
    - user_join: { type: "user_join", user: { user_id, username }, stats: Stats }
    - user_leave: { type: "user_leave", user: { user_id, username }, stats: Stats }
    - stats: { type: "stats", stats: Stats }
    - error: { type: "error", error: str }
    - pong: { type: "pong" }
    """
    # Accept connection immediately (like Briscola does)
    await websocket.accept()
    
    user_id = None
    
    try:
        # Wait for join message
        join_data = await websocket.receive_json()
        
        if join_data.get("type") != "join":
            await websocket.close(code=4001, reason="First message must be join")
            return
        
        user_id = join_data.get("user_id")
        username = join_data.get("username", "Anonymous")
        
        if not user_id:
            await websocket.close(code=4002, reason="Missing user_id")
            return
        
        # Connect user
        await chat_manager.connect(websocket, user_id, username)
        
        # Handle messages
        while True:
            try:
                data = await websocket.receive_json()
                await chat_manager.handle_message(user_id, data)
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning(f"[CommunityChat] Invalid JSON from {user_id}")
                continue
    
    except WebSocketDisconnect:
        logger.info(f"[CommunityChat] WebSocket disconnected for {user_id}")
    except Exception as e:
        logger.error(f"[CommunityChat] Error: {e}")
    finally:
        if user_id:
            await chat_manager.disconnect(user_id)


# =============================================================================
# REST Endpoints (Stats - attached to ws_router for backwards compat)
# =============================================================================

@rest_router.get("/stats")
async def get_community_stats():
    """Get current community chat statistics"""
    return chat_manager._get_stats()


@rest_router.get("/online")
async def get_online_users():
    """Get list of online users"""
    return {
        "users": chat_manager.get_online_users(),
        "count": len(chat_manager.connections)
    }


# Combined router export
router = ws_router
