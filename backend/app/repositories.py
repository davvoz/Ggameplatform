"""
Repository Pattern Implementation
Provides data access abstraction for all models using SQLAlchemy ORM
Following SOLID principles and SonarQube standards
"""

from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from abc import ABC, abstractmethod
from app.models import Base, Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest, GameStatus, UserCoins, CoinTransaction

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
            from datetime import datetime
            now = datetime.utcnow().isoformat()
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
        from datetime import datetime
        user_coins = self.get_or_create(user_id)
        user_coins.balance += amount
        user_coins.total_earned += amount
        user_coins.last_updated = datetime.utcnow().isoformat()
        self.db_session.commit()
        self.db_session.refresh(user_coins)
        return user_coins
    
    def remove_coins(self, user_id: str, amount: int) -> Optional[UserCoins]:
        """Remove coins from user balance (returns None if insufficient balance)"""
        from datetime import datetime
        user_coins = self.get_or_create(user_id)
        if user_coins.balance < amount:
            return None
        user_coins.balance -= amount
        user_coins.total_spent += amount
        user_coins.last_updated = datetime.utcnow().isoformat()
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
