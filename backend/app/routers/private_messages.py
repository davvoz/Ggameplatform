"""
Private Messages Router

REST endpoints for user connections and private messaging.
WebSocket endpoint for real-time private chat.
"""

import uuid
import logging
from typing import Annotated, Dict, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, asdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db, get_db_session
from app.repositories import UserConnectionRepository, PrivateMessageRepository, UserRepository
from app.models import PrivateMessage

logger = logging.getLogger(__name__)

# REST router for connections and message history
rest_router = APIRouter(prefix="/api/private-messages", tags=["private-messages"])

# WebSocket router for real-time DM
ws_router = APIRouter(prefix="/ws/private-messages", tags=["private-messages-ws"])


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class PMMessage:
    """In-memory representation of a private message."""
    message_id: str
    sender_id: str
    receiver_id: str
    text: str
    timestamp: int
    is_edited: bool = False
    edited_at: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)


# =============================================================================
# Private Message Manager (Singleton)
# =============================================================================

class PrivateMessageManager:
    """
    Manages real-time private messaging via WebSocket.

    Single Responsibility: Routes messages between two connected users
    and persists them to the database.
    """

    def __init__(self):
        # user_id -> WebSocket
        self.connections: Dict[str, WebSocket] = {}

    def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Register a user's WebSocket for private messaging."""
        self.connections[user_id] = websocket
        logger.info("PM: User %s connected", user_id)

    def disconnect(self, user_id: str) -> None:
        """Remove a user's WebSocket connection."""
        self.connections.pop(user_id, None)
        logger.info("PM: User %s disconnected", user_id)

    def is_online(self, user_id: str) -> bool:
        """Check if a user is connected to the PM WebSocket."""
        return user_id in self.connections

    async def send_to_user(self, user_id: str, payload: dict) -> bool:
        """Send a JSON payload to a specific connected user. Returns True if sent."""
        ws = self.connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json(payload)
            return True
        except Exception:
            self.disconnect(user_id)
            return False

    async def deliver_message(self, message: PMMessage) -> None:
        """Persist a message and deliver it in real-time if the receiver is online."""
        self._persist_message(message)

        payload = {"type": "private_message", "message": message.to_dict()}

        # Deliver to receiver
        await self.send_to_user(message.receiver_id, payload)

        # Echo back to sender (so their UI updates)
        await self.send_to_user(message.sender_id, payload)

    def _persist_message(self, message: PMMessage) -> None:
        """Save message to database in a dedicated session."""
        try:
            with get_db_session() as db:
                repo = PrivateMessageRepository(db)
                repo.save_message(message.to_dict())
        except Exception:
            logger.exception("Failed to persist private message %s", message.message_id)


# Singleton instance
pm_manager = PrivateMessageManager()


# =============================================================================
# Connection Validation Helper
# =============================================================================

class ConnectionValidator:
    """Validates that two users have an accepted connection."""

    @staticmethod
    def are_connected(db: Session, user_a: str, user_b: str) -> bool:
        """Return True if the two users have an accepted connection."""
        repo = UserConnectionRepository(db)
        conn = repo.find_connection(user_a, user_b)
        return conn is not None and conn.status == "accepted"


# =============================================================================
# REST Endpoints — Connections
# =============================================================================

@rest_router.post("/connections/request")
async def request_connection(
    requester_id: Annotated[str, Query(..., min_length=1)],
    receiver_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Send a connection request to another user."""
    if requester_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")

    repo = UserConnectionRepository(db)
    existing = repo.find_connection(requester_id, receiver_id)

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=409, detail="Already connected")
        if existing.status == "pending":
            raise HTTPException(status_code=409, detail="Connection request already pending")
        if existing.status == "rejected":
            # Allow re-requesting after a rejection
            now = datetime.now(timezone.utc).isoformat()
            existing.status = "pending"
            existing.requester_id = requester_id
            existing.receiver_id = receiver_id
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            return existing.to_dict()

    now = datetime.now(timezone.utc).isoformat()
    from app.models import UserConnection
    connection = UserConnection(
        requester_id=requester_id,
        receiver_id=receiver_id,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    repo.create(connection)

    # Notify the receiver in real-time if they're connected via WebSocket
    await _notify_connection_request(connection, requester_id)

    return connection.to_dict()


async def _notify_connection_request(connection, requester_id: str) -> None:
    """Send a WS notification to the receiver about a new connection request."""
    receiver_id = connection.receiver_id
    if not pm_manager.is_online(receiver_id):
        return
    try:
        with get_db_session() as db:
            requester = UserRepository(db).get_by_id(requester_id)
            requester_username = requester.username if requester else "Unknown"
        payload = {
            "type": "connection_request",
            "connection": {
                **connection.to_dict(),
                "requester_username": requester_username,
            },
        }
        await pm_manager.send_to_user(receiver_id, payload)
    except Exception:
        logger.exception("Error notifying connection request to %s", receiver_id)


@rest_router.post("/connections/{connection_id}/accept")
def accept_connection(
    connection_id: int,
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Accept a pending connection request."""
    repo = UserConnectionRepository(db)
    conn = repo.get_by_id(connection_id)

    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="Only the receiver can accept")
    if conn.status != "pending":
        raise HTTPException(status_code=400, detail=f"Connection is already {conn.status}")

    now = datetime.now(timezone.utc).isoformat()
    updated = repo.update_status(connection_id, "accepted", now)
    return updated.to_dict()


@rest_router.post("/connections/{connection_id}/reject")
def reject_connection(
    connection_id: int,
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Reject a pending connection request."""
    repo = UserConnectionRepository(db)
    conn = repo.get_by_id(connection_id)

    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="Only the receiver can reject")
    if conn.status != "pending":
        raise HTTPException(status_code=400, detail=f"Connection is already {conn.status}")

    now = datetime.now(timezone.utc).isoformat()
    updated = repo.update_status(connection_id, "rejected", now)
    return updated.to_dict()


@rest_router.delete("/connections/{connection_id}")
def disconnect_connection(
    connection_id: int,
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Remove an accepted connection between two users."""
    repo = UserConnectionRepository(db)
    conn = repo.get_by_id(connection_id)

    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.requester_id != user_id and conn.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="Not part of this connection")

    db.delete(conn)
    db.commit()
    return {"success": True, "message": "Connection removed"}


@rest_router.get("/connections")
def get_connections(
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return accepted connections for a user, enriched with usernames and unread counts."""
    conn_repo = UserConnectionRepository(db)
    user_repo = UserRepository(db)
    msg_repo = PrivateMessageRepository(db)
    connections = conn_repo.get_accepted_for_user(user_id)
    unread_map = msg_repo.count_unread_per_peer(user_id)

    result = []
    for conn in connections:
        peer_id = conn.receiver_id if conn.requester_id == user_id else conn.requester_id
        peer = user_repo.get_by_id(peer_id)
        peer_username = peer.username if peer else "Unknown"
        entry = conn.to_dict()
        entry["peer_id"] = peer_id
        entry["peer_username"] = peer_username
        entry["unread_count"] = unread_map.get(peer_id, 0)
        result.append(entry)

    return result


@rest_router.get("/connections/pending")
def get_pending_connections(
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return pending connection requests received by the user, enriched with requester info."""
    conn_repo = UserConnectionRepository(db)
    user_repo = UserRepository(db)
    pending = conn_repo.get_pending_for_user(user_id)

    result = []
    for conn in pending:
        requester = user_repo.get_by_id(conn.requester_id)
        requester_username = requester.username if requester else "Unknown"
        entry = conn.to_dict()
        entry["requester_username"] = requester_username
        result.append(entry)

    return result


@rest_router.get("/connections/status")
def get_connection_status(
    user_id: Annotated[str, Query(..., min_length=1)],
    other_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Check the connection status between two users."""
    repo = UserConnectionRepository(db)
    conn = repo.find_connection(user_id, other_id)
    if not conn:
        return {"status": "none"}
    result = conn.to_dict()
    result["is_requester"] = conn.requester_id == user_id
    return result


# =============================================================================
# REST Endpoints — Messages
# =============================================================================

@rest_router.get("/conversation")
def get_conversation(
    user_id: Annotated[str, Query(..., min_length=1)],
    peer_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return message history between two connected users."""
    if not ConnectionValidator.are_connected(db, user_id, peer_id):
        raise HTTPException(status_code=403, detail="Users are not connected")

    msg_repo = PrivateMessageRepository(db)
    messages = msg_repo.get_conversation(user_id, peer_id)

    # Mark messages as read
    msg_repo.mark_as_read(receiver_id=user_id, sender_id=peer_id)

    return [m.to_dict() for m in messages]


@rest_router.get("/unread-count")
def get_unread_count(
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return total unread message count for a user."""
    repo = PrivateMessageRepository(db)
    return {"unread": repo.count_unread_for_user(user_id)}


@rest_router.get("/unread-summary")
def get_unread_summary(
    user_id: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return total unread messages + pending connection requests count."""
    msg_repo = PrivateMessageRepository(db)
    conn_repo = UserConnectionRepository(db)
    return {
        "unread_messages": msg_repo.count_unread_for_user(user_id),
        "pending_connections": conn_repo.count_pending_for_user(user_id),
    }


# =============================================================================
# WebSocket Endpoint
# =============================================================================

@ws_router.websocket("")
async def private_messages_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time private messaging.

    Client -> Server message types:
    - join: { type: "join", user_id: str }
    - private_message: { type: "private_message", receiver_id: str, text: str }
    - edit_message: { type: "edit_message", message_id: str, text: str }
    - mark_read: { type: "mark_read", sender_id: str }
    - ping: { type: "ping" }

    Server -> Client message types:
    - private_message: { type: "private_message", message: PMMessage }
    - message_edited: { type: "message_edited", message_id, text, is_edited, edited_at }
    - connection_request: { type: "connection_request", ... }
    - error: { type: "error", error: str }
    - pong: { type: "pong" }
    """
    await websocket.accept()
    user_id = None

    try:
        # Wait for join
        join_data = await websocket.receive_json()
        if join_data.get("type") != "join":
            await websocket.close(code=4001, reason="First message must be join")
            return

        user_id = join_data.get("user_id")
        if not user_id:
            await websocket.close(code=4002, reason="Missing user_id")
            return

        pm_manager.connect(websocket, user_id)

        # Send pending connection requests + unread summary on join
        await _send_pending_requests(websocket, user_id)
        await _send_unread_summary(websocket, user_id)

        # Main message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "private_message":
                await _handle_private_message(user_id, data)
            elif msg_type == "edit_message":
                await _handle_edit_message(user_id, data)
            elif msg_type == "mark_read":
                _handle_mark_read(user_id, data)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("PM WebSocket disconnected: %s", user_id)
    except Exception:
        logger.exception("PM WebSocket error for user %s", user_id)
    finally:
        if user_id:
            pm_manager.disconnect(user_id)


async def _send_pending_requests(websocket: WebSocket, user_id: str) -> None:
    """Send pending connection requests to the user on connect."""
    try:
        with get_db_session() as db:
            conn_repo = UserConnectionRepository(db)
            user_repo = UserRepository(db)
            pending = conn_repo.get_pending_for_user(user_id)
            for conn in pending:
                requester = user_repo.get_by_id(conn.requester_id)
                await websocket.send_json({
                    "type": "connection_request",
                    "connection": {
                        **conn.to_dict(),
                        "requester_username": requester.username if requester else "Unknown",
                    },
                })
    except Exception:
        logger.exception("Error sending pending requests to %s", user_id)


async def _send_unread_summary(websocket: WebSocket, user_id: str) -> None:
    """Send unread messages + pending connections count on join."""
    try:
        with get_db_session() as db:
            msg_repo = PrivateMessageRepository(db)
            conn_repo = UserConnectionRepository(db)
            await websocket.send_json({
                "type": "unread_summary",
                "unread_messages": msg_repo.count_unread_for_user(user_id),
                "pending_connections": conn_repo.count_pending_for_user(user_id),
            })
    except Exception:
        logger.exception("Error sending unread summary to %s", user_id)


async def _handle_private_message(sender_id: str, data: dict) -> None:
    """Validate and deliver a private message."""
    receiver_id = data.get("receiver_id", "").strip()
    text = data.get("text", "").strip()

    if not receiver_id or not text:
        await pm_manager.send_to_user(sender_id, {
            "type": "error",
            "error": "Missing receiver_id or text",
        })
        return

    if len(text) > 500:
        await pm_manager.send_to_user(sender_id, {
            "type": "error",
            "error": "Message too long (max 500 characters)",
        })
        return

    # Verify connection
    try:
        with get_db_session() as db:
            if not ConnectionValidator.are_connected(db, sender_id, receiver_id):
                await pm_manager.send_to_user(sender_id, {
                    "type": "error",
                    "error": "You are not connected to this user",
                })
                return
    except Exception:
        logger.exception("Error checking connection for PM")
        return

    message = PMMessage(
        message_id=str(uuid.uuid4()),
        sender_id=sender_id,
        receiver_id=receiver_id,
        text=text,
        timestamp=int(datetime.now(timezone.utc).timestamp() * 1000),
    )

    await pm_manager.deliver_message(message)


def _handle_mark_read(user_id: str, data: dict) -> None:
    """Mark messages from a sender as read."""
    sender_id = data.get("sender_id", "").strip()
    if not sender_id:
        return
    try:
        with get_db_session() as db:
            repo = PrivateMessageRepository(db)
            repo.mark_as_read(receiver_id=user_id, sender_id=sender_id)
    except Exception:
        logger.exception("Error marking messages as read for %s", user_id)


async def _handle_edit_message(user_id: str, data: dict) -> None:
    """Handle a private message edit request — only the original sender may edit."""
    message_id = data.get("message_id", "").strip()
    new_text = data.get("text", "").strip()

    if not message_id:
        await pm_manager.send_to_user(user_id, {"type": "error", "error": "Missing message_id"})
        return

    if not new_text:
        await pm_manager.send_to_user(user_id, {"type": "error", "error": "Edited message cannot be empty"})
        return

    if len(new_text) > 500:
        await pm_manager.send_to_user(user_id, {"type": "error", "error": "Message too long (max 500 characters)"})
        return

    # Locate the message and verify ownership
    try:
        with get_db_session() as db:
            repo = PrivateMessageRepository(db)
            record = db.query(PrivateMessage).filter(PrivateMessage.message_id == message_id).first()
            if not record:
                await pm_manager.send_to_user(user_id, {"type": "error", "error": "Message not found"})
                return
            if record.sender_id != user_id:
                await pm_manager.send_to_user(user_id, {"type": "error", "error": "Cannot edit another user's message"})
                return

            receiver_id = record.receiver_id
            edited_at_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            repo.update_message_text(message_id, new_text, edited_at_ms)
    except Exception:
        logger.exception("Error editing private message %s", message_id)
        return

    # Broadcast to both sender and receiver
    edit_payload = {
        "type": "message_edited",
        "message_id": message_id,
        "text": new_text,
        "is_edited": True,
        "edited_at": edited_at_ms,
    }
    await pm_manager.send_to_user(user_id, edit_payload)
    await pm_manager.send_to_user(receiver_id, edit_payload)
