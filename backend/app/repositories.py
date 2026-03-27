"""
Repository Pattern Implementation
Provides data access abstraction for all models using SQLAlchemy ORM
Following SOLID principles and SonarQube standards
"""

from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from abc import ABC, abstractmethod
from app.models import (
    Base, Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest,
    GameStatus, UserCoins, CoinTransaction, Campaign, CommunityMessage,
    UserConnection, PrivateMessage,
)

# Generic type for models
ModelType = TypeVar("ModelType", bound=Base)


class IRepository(ABC, Generic[ModelType]):
    """Interface for repository pattern (Dependency Inversion Principle)"""
    
    @abstractmethod
    def create(self, obj: ModelType) -> ModelType:
        """Create a new record"""
        pass
    
    @abstractmethod
    def get_by_id(self, id_value: Any) -> Optional[ModelType]:
        """Get a record by ID"""
        pass
    
    @abstractmethod
    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all records with pagination"""
        pass
    
    @abstractmethod
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[ModelType]:
        """Update a record"""
        pass
    
    @abstractmethod
    def delete(self, id_value: Any) -> bool:
        """Delete a record"""
        pass


class BaseRepository(IRepository[ModelType]):
    """
    Base repository implementation with common CRUD operations
    Single Responsibility: Handles data access only
    Open/Closed: Extensible for specific repositories
    """
    
    def __init__(self, model: Type[ModelType], db_session: Session, id_field: str = "id"):
        self.model = model
        self.db_session = db_session
        self.id_field = id_field
    
    def create(self, obj: ModelType) -> ModelType:
        """Create a new record in the database"""
        try:
            self.db_session.add(obj)
            self.db_session.commit()
            self.db_session.refresh(obj)
            return obj
        except SQLAlchemyError as e:
            self.db_session.rollback()
            raise Exception(f"Error creating {self.model.__name__}: {str(e)}")
    
    def get_by_id(self, id_value: Any) -> Optional[ModelType]:
        """Retrieve a record by its ID"""
        try:
            return self.db_session.query(self.model).filter(
                getattr(self.model, self.id_field) == id_value
            ).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching {self.model.__name__}: {str(e)}")
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Retrieve all records with pagination"""
        try:
            return self.db_session.query(self.model).offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching all {self.model.__name__}: {str(e)}")
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[ModelType]:
        """Update a record with new data"""
        try:
            obj = self.get_by_id(id_value)
            if not obj:
                return None
            
            for key, value in data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            
            self.db_session.commit()
            self.db_session.refresh(obj)
            return obj
        except SQLAlchemyError as e:
            self.db_session.rollback()
            raise Exception(f"Error updating {self.model.__name__}: {str(e)}")
    
    def delete(self, id_value: Any) -> bool:
        """Delete a record by ID"""
        try:
            obj = self.get_by_id(id_value)
            if not obj:
                return False
            
            self.db_session.delete(obj)
            self.db_session.commit()
            return True
        except SQLAlchemyError as e:
            self.db_session.rollback()
            raise Exception(f"Error deleting {self.model.__name__}: {str(e)}")
    
    def filter_by(self, **filters) -> List[ModelType]:
        """Filter records by given criteria"""
        try:
            query = self.db_session.query(self.model)
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.filter(getattr(self.model, key) == value)
            return query.all()
        except SQLAlchemyError as e:
            raise Exception(f"Error filtering {self.model.__name__}: {str(e)}")


class GameRepository(BaseRepository[Game]):
    """Repository for Game entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(Game, db_session, id_field="game_id")
    
    def get_by_category(self, category: str) -> List[Game]:
        """Get games by category"""
        return self.filter_by(category=category)
    
    def get_by_author(self, author: str) -> List[Game]:
        """Get games by author"""
        return self.filter_by(author=author)


class UserRepository(BaseRepository[User]):
    """Repository for User entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(User, db_session, id_field="user_id")
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        users = self.filter_by(username=username)
        return users[0] if users else None
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        users = self.filter_by(email=email)
        return users[0] if users else None
    
    def get_anonymous_users(self) -> List[User]:
        """Get all anonymous users"""
        return self.filter_by(is_anonymous=1)


class GameSessionRepository(BaseRepository[GameSession]):
    """Repository for GameSession entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(GameSession, db_session, id_field="session_id")
    
    def get_by_user(self, user_id: str) -> List[GameSession]:
        """Get sessions by user"""
        return self.filter_by(user_id=user_id)
    
    def get_by_game(self, game_id: str) -> List[GameSession]:
        """Get sessions by game"""
        return self.filter_by(game_id=game_id)
    
    def get_open_sessions(self) -> List[GameSession]:
        """Get all open (unclosed) sessions"""
        try:
            return self.db_session.query(GameSession).filter(
                GameSession.ended_at.is_(None)
            ).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching open sessions: {str(e)}")


class LeaderboardRepository(BaseRepository[Leaderboard]):
    """Repository for Leaderboard entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(Leaderboard, db_session, id_field="entry_id")
    
    def get_by_game(self, game_id: str, limit: int = 100) -> List[Leaderboard]:
        """Get leaderboard entries for a specific game"""
        try:
            return self.db_session.query(Leaderboard).filter(
                Leaderboard.game_id == game_id
            ).order_by(
                Leaderboard.score.desc(),
                Leaderboard.created_at.asc()
            ).limit(limit).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching leaderboard: {str(e)}")
    
    def get_by_user(self, user_id: str) -> List[Leaderboard]:
        """Get leaderboard entries for a specific user"""
        return self.filter_by(user_id=user_id)


class XPRuleRepository(BaseRepository[XPRule]):
    """Repository for XPRule entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(XPRule, db_session, id_field="rule_id")
    
    def get_by_game(self, game_id: str) -> List[XPRule]:
        """Get XP rules for a specific game"""
        try:
            return self.db_session.query(XPRule).filter(
                XPRule.game_id == game_id
            ).order_by(XPRule.priority.desc()).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching XP rules: {str(e)}")
    
    def get_active_rules(self, game_id: str) -> List[XPRule]:
        """Get active XP rules for a specific game"""
        try:
            return self.db_session.query(XPRule).filter(
                XPRule.game_id == game_id,
                XPRule.is_active == 1
            ).order_by(XPRule.priority.desc()).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching active XP rules: {str(e)}")


class QuestRepository(BaseRepository[Quest]):
    """Repository for Quest entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(Quest, db_session, id_field="quest_id")
    
    def get_active_quests(self) -> List[Quest]:
        """Get all active quests"""
        return self.filter_by(is_active=1)
    
    def get_by_type(self, quest_type: str) -> List[Quest]:
        """Get quests by type"""
        return self.filter_by(quest_type=quest_type)


class UserQuestRepository(BaseRepository[UserQuest]):
    """Repository for UserQuest entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(UserQuest, db_session, id_field="id")
    
    def get_by_user(self, user_id: str) -> List[UserQuest]:
        """Get user quests for a specific user"""
        return self.filter_by(user_id=user_id)
    
    def get_by_quest(self, quest_id: int) -> List[UserQuest]:
        """Get user progress for a specific quest"""
        return self.filter_by(quest_id=quest_id)
    
    def get_completed(self, user_id: str) -> List[UserQuest]:
        """Get completed quests for a user"""
        return self.filter_by(user_id=user_id, is_completed=1)
    
    def get_unclaimed(self, user_id: str) -> List[UserQuest]:
        """Get completed but unclaimed quests"""
        try:
            return self.db_session.query(UserQuest).filter(
                UserQuest.user_id == user_id,
                UserQuest.is_completed == 1,
                UserQuest.is_claimed == 0
            ).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching unclaimed quests: {str(e)}")


class GameStatusRepository(BaseRepository[GameStatus]):
    """Repository for GameStatus entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(GameStatus, db_session, id_field="status_id")
    
    def get_by_code(self, status_code: str) -> Optional[GameStatus]:
        """Get game status by code"""
        statuses = self.filter_by(status_code=status_code)
        return statuses[0] if statuses else None
    
    def get_active_statuses(self) -> List[GameStatus]:
        """Get all active statuses"""
        try:
            return self.db_session.query(GameStatus).filter(
                GameStatus.is_active == 1
            ).order_by(GameStatus.display_order).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching active statuses: {str(e)}")
    
    def get_all_ordered(self) -> List[GameStatus]:
        """Get all statuses ordered by display_order"""
        try:
            return self.db_session.query(GameStatus).order_by(
                GameStatus.display_order
            ).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching ordered statuses: {str(e)}")


class UserCoinsRepository(BaseRepository[UserCoins]):
    """Repository for UserCoins entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(UserCoins, db_session, id_field="user_id")
    
    def get_or_create(self, user_id: str) -> UserCoins:
        """Get user coins or create if doesn't exist"""
        user_coins = self.get_by_id(user_id)
        if not user_coins:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            user_coins = UserCoins(
                user_id=user_id,
                balance=0,
                total_earned=0,
                total_spent=0,
                last_updated=now,
                created_at=now
            )
            user_coins = self.create(user_coins)
        return user_coins
    
    def add_coins(self, user_id: str, amount: int) -> UserCoins:
        """Add coins to user balance"""
        from datetime import datetime, timezone
        user_coins = self.get_or_create(user_id)
        user_coins.balance += amount
        user_coins.total_earned += amount
        user_coins.last_updated = datetime.now(timezone.utc).isoformat()
        self.db_session.commit()
        self.db_session.refresh(user_coins)
        return user_coins
    
    def remove_coins(self, user_id: str, amount: int) -> Optional[UserCoins]:
        """Remove coins from user balance (returns None if insufficient balance)"""
        from datetime import datetime, timezone
        user_coins = self.get_or_create(user_id)
        if user_coins.balance < amount:
            return None
        user_coins.balance -= amount
        user_coins.total_spent += amount
        user_coins.last_updated = datetime.now(timezone.utc).isoformat()
        self.db_session.commit()
        self.db_session.refresh(user_coins)
        return user_coins


class CoinTransactionRepository(BaseRepository[CoinTransaction]):
    """Repository for CoinTransaction entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(CoinTransaction, db_session, id_field="transaction_id")
    
    def get_by_user(self, user_id: str, limit: int = 100, offset: int = 0) -> List[CoinTransaction]:
        """Get transactions for a specific user with pagination"""
        try:
            return self.db_session.query(CoinTransaction).filter(
                CoinTransaction.user_id == user_id
            ).order_by(CoinTransaction.created_at.desc()).offset(offset).limit(limit).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching transactions: {str(e)}")
    
    def get_by_type(self, transaction_type: str) -> List[CoinTransaction]:
        """Get transactions by type"""
        return self.filter_by(transaction_type=transaction_type)
    
    def get_user_earnings(self, user_id: str) -> int:
        """Get total earnings for a user"""
        try:
            from sqlalchemy import func
            result = self.db_session.query(func.sum(CoinTransaction.amount)).filter(
                CoinTransaction.user_id == user_id,
                CoinTransaction.amount > 0
            ).scalar()
            return result or 0
        except SQLAlchemyError as e:
            raise Exception(f"Error calculating earnings: {str(e)}")
    
    def get_user_spendings(self, user_id: str) -> int:
        """Get total spendings for a user"""
        try:
            from sqlalchemy import func
            result = self.db_session.query(func.sum(CoinTransaction.amount)).filter(
                CoinTransaction.user_id == user_id,
                CoinTransaction.amount < 0
            ).scalar()
            return abs(result) if result else 0
        except SQLAlchemyError as e:
            raise Exception(f"Error calculating spendings: {str(e)}")


class CampaignRepository(BaseRepository[Campaign]):
    """Repository for Campaign entities"""
    
    def __init__(self, db_session: Session):
        super().__init__(Campaign, db_session, id_field="campaign_id")
    
    def get_active_for_game(self, game_id: str) -> List[Campaign]:
        """Get currently active campaigns for a specific game"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        try:
            return self.db_session.query(Campaign).filter(
                Campaign.game_id == game_id,
                Campaign.is_active == 1,
                Campaign.start_date <= now,
                Campaign.end_date >= now
            ).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching active campaigns: {str(e)}")
    
    def get_all_active(self) -> List[Campaign]:
        """Get all currently active campaigns"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        try:
            return self.db_session.query(Campaign).filter(
                Campaign.is_active == 1,
                Campaign.start_date <= now,
                Campaign.end_date >= now
            ).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error fetching active campaigns: {str(e)}")


class CommunityMessageRepository(BaseRepository[CommunityMessage]):
    """
    Repository for CommunityMessage entities.

    Manages the persistent chat history window: persists incoming messages and
    prunes the table so it never exceeds MAX_MESSAGES rows, giving the same
    'last-100' semantics that previously lived only in memory.
    """

    MAX_MESSAGES: int = 100

    def __init__(self, db_session: Session):
        super().__init__(CommunityMessage, db_session, id_field="id")

    def get_latest(self, limit: int = MAX_MESSAGES) -> List[CommunityMessage]:
        """Return up to *limit* most-recent messages, ordered oldest-first."""
        try:
            rows = (
                self.db_session.query(CommunityMessage)
                .order_by(CommunityMessage.timestamp_ms.desc())
                .limit(limit)
                .all()
            )
            rows.reverse()
            return rows
        except SQLAlchemyError as exc:
            raise Exception(f"Error fetching community messages: {str(exc)}")

    def save_message(self, message_dict: dict) -> CommunityMessage:
        """
        Persist a chat message dict and prune old rows in a single transaction.

        *message_dict* must contain the keys produced by ChatMessage.to_dict().
        """
        from datetime import datetime, timezone

        record = CommunityMessage(
            message_id=message_dict["id"],
            user_id=message_dict["user_id"],
            username=message_dict["username"],
            text=message_dict.get("text", ""),
            image_url=message_dict.get("image_url"),
            gif_url=message_dict.get("gif_url"),
            level=message_dict.get("level"),
            timestamp_ms=message_dict["timestamp"],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            self.db_session.add(record)
            self.db_session.flush()
            self._trim_old_messages()
            self.db_session.commit()
            self.db_session.refresh(record)
            return record
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error saving community message: {str(exc)}")

    def update_message_text(self, message_id: str, new_text: str, edited_at_ms: int) -> Optional[CommunityMessage]:
        """Update the text of a persisted message and mark it as edited."""
        try:
            record = (
                self.db_session.query(CommunityMessage)
                .filter(CommunityMessage.message_id == message_id)
                .first()
            )
            if not record:
                return None
            record.text = new_text
            record.is_edited = 1
            record.edited_at_ms = edited_at_ms
            self.db_session.commit()
            self.db_session.refresh(record)
            return record
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error updating community message: {str(exc)}")

    def _trim_old_messages(self) -> None:
        """Delete the oldest rows so the table never exceeds MAX_MESSAGES."""
        try:
            total = self.db_session.query(CommunityMessage).count()
            excess = total - self.MAX_MESSAGES
            if excess <= 0:
                return
            cutoff_ids = (
                self.db_session.query(CommunityMessage.id)
                .order_by(CommunityMessage.timestamp_ms.asc())
                .limit(excess)
                .subquery()
            )
            self.db_session.query(CommunityMessage).filter(
                CommunityMessage.id.in_(cutoff_ids)
            ).delete(synchronize_session=False)
        except SQLAlchemyError as exc:
            raise Exception(f"Error trimming community messages: {str(exc)}")


class UserConnectionRepository(BaseRepository["UserConnection"]):
    """Repository for user connection requests."""

    def __init__(self, db_session: Session):
        super().__init__(UserConnection, db_session, id_field="id")

    def find_connection(self, user_a: str, user_b: str) -> Optional[UserConnection]:
        """Find an existing connection between two users (in either direction)."""
        try:
            return (
                self.db_session.query(UserConnection)
                .filter(
                    ((UserConnection.requester_id == user_a) & (UserConnection.receiver_id == user_b))
                    | ((UserConnection.requester_id == user_b) & (UserConnection.receiver_id == user_a))
                )
                .first()
            )
        except SQLAlchemyError as exc:
            raise Exception(f"Error finding connection: {str(exc)}")

    def get_pending_for_user(self, user_id: str) -> List[UserConnection]:
        """Return pending connection requests received by *user_id*."""
        try:
            return (
                self.db_session.query(UserConnection)
                .filter(
                    UserConnection.receiver_id == user_id,
                    UserConnection.status == "pending",
                )
                .order_by(UserConnection.created_at.desc())
                .all()
            )
        except SQLAlchemyError as exc:
            raise Exception(f"Error fetching pending connections: {str(exc)}")

    def get_accepted_for_user(self, user_id: str) -> List[UserConnection]:
        """Return all accepted connections involving *user_id*."""
        try:
            return (
                self.db_session.query(UserConnection)
                .filter(
                    UserConnection.status == "accepted",
                    (UserConnection.requester_id == user_id)
                    | (UserConnection.receiver_id == user_id),
                )
                .order_by(UserConnection.updated_at.desc())
                .all()
            )
        except SQLAlchemyError as exc:
            raise Exception(f"Error fetching accepted connections: {str(exc)}")

    def update_status(self, connection_id: int, new_status: str, now_iso: str) -> Optional[UserConnection]:
        """Update the status of a connection request."""
        try:
            conn = self.get_by_id(connection_id)
            if not conn:
                return None
            conn.status = new_status
            conn.updated_at = now_iso
            self.db_session.commit()
            self.db_session.refresh(conn)
            return conn
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error updating connection status: {str(exc)}")

    def count_pending_for_user(self, user_id: str) -> int:
        """Count pending connection requests received by *user_id*."""
        try:
            return (
                self.db_session.query(UserConnection)
                .filter(
                    UserConnection.receiver_id == user_id,
                    UserConnection.status == "pending",
                )
                .count()
            )
        except SQLAlchemyError as exc:
            raise Exception(f"Error counting pending connections: {str(exc)}")


class PrivateMessageRepository(BaseRepository["PrivateMessage"]):
    """Repository for private messages between connected users."""

    MAX_MESSAGES_PER_CONVERSATION: int = 100

    def __init__(self, db_session: Session):
        super().__init__(PrivateMessage, db_session, id_field="id")

    def get_conversation(self, user_a: str, user_b: str, limit: int = 100) -> List[PrivateMessage]:
        """Return messages between two users, ordered oldest-first."""
        try:
            rows = (
                self.db_session.query(PrivateMessage)
                .filter(
                    ((PrivateMessage.sender_id == user_a) & (PrivateMessage.receiver_id == user_b))
                    | ((PrivateMessage.sender_id == user_b) & (PrivateMessage.receiver_id == user_a))
                )
                .order_by(PrivateMessage.timestamp_ms.desc())
                .limit(limit)
                .all()
            )
            rows.reverse()
            return rows
        except SQLAlchemyError as exc:
            raise Exception(f"Error fetching conversation: {str(exc)}")

    def save_message(self, message_dict: dict) -> PrivateMessage:
        """Persist a private message and trim the conversation to MAX_MESSAGES_PER_CONVERSATION."""
        from datetime import datetime, timezone

        record = PrivateMessage(
            message_id=message_dict["message_id"],
            sender_id=message_dict["sender_id"],
            receiver_id=message_dict["receiver_id"],
            text=message_dict.get("text", ""),
            timestamp_ms=message_dict["timestamp"],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            self.db_session.add(record)
            self.db_session.flush()
            self._trim_conversation(record.sender_id, record.receiver_id)
            self.db_session.commit()
            self.db_session.refresh(record)
            return record
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error saving private message: {str(exc)}")

    def mark_as_read(self, receiver_id: str, sender_id: str) -> int:
        """Mark all unread messages in a conversation as read. Returns count updated."""
        try:
            count = (
                self.db_session.query(PrivateMessage)
                .filter(
                    PrivateMessage.sender_id == sender_id,
                    PrivateMessage.receiver_id == receiver_id,
                    PrivateMessage.is_read == 0,
                )
                .update({"is_read": 1}, synchronize_session=False)
            )
            self.db_session.commit()
            return count
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error marking messages as read: {str(exc)}")

    def count_unread_for_user(self, user_id: str) -> int:
        """Count total unread messages for a user across all conversations."""
        try:
            return (
                self.db_session.query(PrivateMessage)
                .filter(
                    PrivateMessage.receiver_id == user_id,
                    PrivateMessage.is_read == 0,
                )
                .count()
            )
        except SQLAlchemyError as exc:
            raise Exception(f"Error counting unread messages: {str(exc)}")

    def count_unread_per_peer(self, user_id: str) -> Dict[str, int]:
        """Return a dict mapping sender_id -> unread count for the given user."""
        from sqlalchemy import func
        try:
            rows = (
                self.db_session.query(
                    PrivateMessage.sender_id,
                    func.count(PrivateMessage.id),
                )
                .filter(
                    PrivateMessage.receiver_id == user_id,
                    PrivateMessage.is_read == 0,
                )
                .group_by(PrivateMessage.sender_id)
                .all()
            )
            return {sender_id: count for sender_id, count in rows}
        except SQLAlchemyError as exc:
            raise Exception(f"Error counting unread per peer: {str(exc)}")

    def _trim_conversation(self, user_a: str, user_b: str) -> None:
        """Keep only the latest MAX_MESSAGES_PER_CONVERSATION messages in a conversation."""
        try:
            total = (
                self.db_session.query(PrivateMessage)
                .filter(
                    ((PrivateMessage.sender_id == user_a) & (PrivateMessage.receiver_id == user_b))
                    | ((PrivateMessage.sender_id == user_b) & (PrivateMessage.receiver_id == user_a))
                )
                .count()
            )
            excess = total - self.MAX_MESSAGES_PER_CONVERSATION
            if excess <= 0:
                return
            cutoff_ids = (
                self.db_session.query(PrivateMessage.id)
                .filter(
                    ((PrivateMessage.sender_id == user_a) & (PrivateMessage.receiver_id == user_b))
                    | ((PrivateMessage.sender_id == user_b) & (PrivateMessage.receiver_id == user_a))
                )
                .order_by(PrivateMessage.timestamp_ms.asc())
                .limit(excess)
                .subquery()
            )
            self.db_session.query(PrivateMessage).filter(
                PrivateMessage.id.in_(cutoff_ids)
            ).delete(synchronize_session=False)
        except SQLAlchemyError as exc:
            raise Exception(f"Error trimming private messages: {str(exc)}")

    def update_message_text(self, message_id: str, new_text: str, edited_at_ms: int) -> Optional[PrivateMessage]:
        """Update the text of a private message and mark it as edited."""
        try:
            record = (
                self.db_session.query(PrivateMessage)
                .filter(PrivateMessage.message_id == message_id)
                .first()
            )
            if not record:
                return None
            record.text = new_text
            record.is_edited = 1
            record.edited_at_ms = edited_at_ms
            self.db_session.commit()
            self.db_session.refresh(record)
            return record
        except SQLAlchemyError as exc:
            self.db_session.rollback()
            raise Exception(f"Error updating private message: {str(exc)}")


class RepositoryFactory:
    """
    Factory Pattern for creating repositories
    Ensures single responsibility and easy testing
    """
    
    @staticmethod
    def create_game_repository(db_session: Session) -> GameRepository:
        return GameRepository(db_session)
    
    @staticmethod
    def create_user_repository(db_session: Session) -> UserRepository:
        return UserRepository(db_session)
    
    @staticmethod
    def create_session_repository(db_session: Session) -> GameSessionRepository:
        return GameSessionRepository(db_session)
    
    @staticmethod
    def create_leaderboard_repository(db_session: Session) -> LeaderboardRepository:
        return LeaderboardRepository(db_session)
    
    @staticmethod
    def create_xprule_repository(db_session: Session) -> XPRuleRepository:
        return XPRuleRepository(db_session)
    
    @staticmethod
    def create_quest_repository(db_session: Session) -> QuestRepository:
        return QuestRepository(db_session)
    
    @staticmethod
    def create_userquest_repository(db_session: Session) -> UserQuestRepository:
        return UserQuestRepository(db_session)
    
    @staticmethod
    def create_gamestatus_repository(db_session: Session) -> GameStatusRepository:
        return GameStatusRepository(db_session)
    
    @staticmethod
    def create_usercoins_repository(db_session: Session) -> UserCoinsRepository:
        return UserCoinsRepository(db_session)
    
    @staticmethod
    def create_cointransaction_repository(db_session: Session) -> CoinTransactionRepository:
        return CoinTransactionRepository(db_session)
    
    @staticmethod
    def create_campaign_repository(db_session: Session) -> CampaignRepository:
        return CampaignRepository(db_session)

    @staticmethod
    def create_community_message_repository(db_session: Session) -> "CommunityMessageRepository":
        return CommunityMessageRepository(db_session)

    @staticmethod
    def create_user_connection_repository(db_session: Session) -> "UserConnectionRepository":
        return UserConnectionRepository(db_session)

    @staticmethod
    def create_private_message_repository(db_session: Session) -> "PrivateMessageRepository":
        return PrivateMessageRepository(db_session)
