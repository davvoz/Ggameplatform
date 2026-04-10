"""Social models: CommunityMessage, UserConnection, PrivateMessage, PushSubscription."""

from typing import Dict, Any
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class CommunityMessage(Base):
    """Persistent community chat message — keeps last 100 messages across restarts."""
    __tablename__ = 'community_messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    username = Column(String(255), nullable=False)
    text = Column(Text, default='')
    image_url = Column(String(1000), nullable=True)
    gif_url = Column(String(1000), nullable=True)
    level = Column(Integer, nullable=True)
    timestamp_ms = Column(Integer, nullable=False)
    is_edited = Column(Integer, default=0)
    edited_at_ms = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False)

    __table_args__ = (
        Index('idx_community_msg_timestamp', 'timestamp_ms'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dict."""
        return {
            "id": self.id,
            "message_id": self.message_id,
            "user_id": self.user_id,
            "username": self.username,
            "text": self.text or "",
            "timestamp": self.timestamp_ms,
            "timestamp_ms": self.timestamp_ms,
            "image_url": self.image_url,
            "gif_url": self.gif_url,
            "level": self.level,
            "is_edited": bool(self.is_edited),
            "edited_at": self.edited_at_ms,
            "edited_at_ms": self.edited_at_ms,
            "created_at": self.created_at,
        }

    def __repr__(self) -> str:
        return f"<CommunityMessage {self.message_id} by {self.username}>"


class UserConnection(Base):
    """Represents a connection request between two users."""
    __tablename__ = 'user_connections'

    id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    receiver_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='uq_connection_pair'),
        Index('idx_conn_receiver_status', 'receiver_id', 'status'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize connection to dictionary."""
        return {
            "id": self.id,
            "requester_id": self.requester_id,
            "receiver_id": self.receiver_id,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def __repr__(self) -> str:
        return f"<UserConnection {self.requester_id} -> {self.receiver_id} ({self.status})>"


class PrivateMessage(Base):
    """A private message between two connected users."""
    __tablename__ = 'private_messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(100), unique=True, nullable=False, index=True)
    sender_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    receiver_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    text = Column(Text, default='')
    timestamp_ms = Column(Integer, nullable=False)
    is_read = Column(Integer, default=0)
    is_edited = Column(Integer, default=0)
    edited_at_ms = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False)

    __table_args__ = (
        Index('idx_pm_conversation', 'sender_id', 'receiver_id'),
        Index('idx_pm_timestamp', 'timestamp_ms'),
        Index('idx_pm_unread', 'receiver_id', 'is_read'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize message to dictionary."""
        return {
            "id": self.id,
            "message_id": self.message_id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "text": self.text or "",
            "timestamp": self.timestamp_ms,
            "is_read": bool(self.is_read),
            "is_edited": bool(self.is_edited),
            "edited_at": self.edited_at_ms,
            "created_at": self.created_at,
        }

    def __repr__(self) -> str:
        return f"<PrivateMessage {self.message_id} {self.sender_id}->{self.receiver_id}>"


class PushSubscription(Base):
    """Push notification subscription model for Web Push API."""
    __tablename__ = 'push_subscriptions'

    subscription_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    endpoint = Column(Text, nullable=False, unique=True)
    p256dh_key = Column(String(255), nullable=False)
    auth_key = Column(String(255), nullable=False)
    user_agent = Column(String(500), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    last_used = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_push_sub_user_active', 'user_id', 'is_active'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert push subscription instance to dictionary."""
        return {
            "subscription_id": self.subscription_id,
            "user_id": self.user_id,
            "endpoint": self.endpoint,
            "is_active": bool(self.is_active),
            "user_agent": self.user_agent,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_used": self.last_used
        }

    def get_subscription_info(self) -> Dict[str, Any]:
        """Get subscription info in Web Push API format."""
        return {
            "endpoint": self.endpoint,
            "keys": {
                "p256dh": self.p256dh_key,
                "auth": self.auth_key
            }
        }

    def __repr__(self) -> str:
        return f"<PushSubscription {self.subscription_id} for user {self.user_id}>"
