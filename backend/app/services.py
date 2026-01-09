"""
Service Layer Implementation
Business logic and orchestration for CRUD operations
Following SOLID principles and Domain-Driven Design
"""

from typing import List, Optional, Dict, Any, Type
from datetime import datetime
from abc import ABC, abstractmethod
import json
import uuid

from app.repositories import (
    IRepository,
    GameRepository,
    UserRepository,
    GameSessionRepository,
    LeaderboardRepository,
    XPRuleRepository,
    QuestRepository,
    UserQuestRepository,
    GameStatusRepository,
    UserCoinsRepository,
    CoinTransactionRepository,

)
from app.models import Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest, GameStatus, UserCoins, CoinTransaction


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


class IService(ABC):
    """Interface for service layer (Interface Segregation Principle)"""
    
    @abstractmethod
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new entity"""
        pass
    
    @abstractmethod
    def get(self, id_value: Any) -> Optional[Dict[str, Any]]:
        """Get entity by ID"""
        pass
    
    @abstractmethod
    def get_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all entities"""
        pass
    
    @abstractmethod
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update entity"""
        pass
    
    @abstractmethod
    def delete(self, id_value: Any) -> bool:
        """Delete entity"""
        pass


class BaseService(IService):
    """
    Base service with common business logic
    Single Responsibility: Orchestrates business operations
    """
    
    def __init__(self, repository: IRepository):
        self.repository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new entity with validation"""
        # Override in subclasses for specific validation
        raise NotImplementedError("Subclass must implement create method")
    
    def get(self, id_value: Any) -> Optional[Dict[str, Any]]:
        """Get entity by ID and convert to dict"""
        obj = self.repository.get_by_id(id_value)
        return obj.to_dict() if obj else None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all entities and convert to list of dicts"""
        objects = self.repository.get_all(skip, limit)
        return [obj.to_dict() for obj in objects]
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update entity with validation"""
        # Override in subclasses for specific validation
        raise NotImplementedError("Subclass must implement update method")
    
    def delete(self, id_value: Any) -> bool:
        """Delete entity"""
        return self.repository.delete(id_value)


class GameService(BaseService):
    """Service for Game business logic"""
    
    def __init__(self, repository: GameRepository):
        super().__init__(repository)
        self.repository: GameRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new game with validation"""
        # Validate required fields
        required_fields = ['game_id', 'title', 'entry_point']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Check if game already exists
        existing = self.repository.get_by_id(data['game_id'])
        if existing:
            raise ValidationError(f"Game with ID {data['game_id']} already exists")
        
        # Set timestamps
        now = datetime.utcnow().isoformat()
        data['created_at'] = now
        data['updated_at'] = now
        
        # Convert camelCase to snake_case for status
        if 'statusId' in data:
            data['status_id'] = data.pop('statusId')
        
        # Convert lists and dicts to JSON strings
        if 'tags' in data and isinstance(data['tags'], list):
            data['tags'] = json.dumps(data['tags'])
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
        # Create game object
        game = Game(**data)
        created = self.repository.create(game)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update game with validation"""
        # Update timestamp
        data['updated_at'] = datetime.utcnow().isoformat()
        
        # Convert camelCase to snake_case for status (support both formats)
        if 'statusId' in data:
            data['status_id'] = data.pop('statusId')
        
        # Convert lists and dicts to JSON strings
        if 'tags' in data and isinstance(data['tags'], list):
            data['tags'] = json.dumps(data['tags'])
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        if 'extra_data' in data and isinstance(data['extra_data'], dict):
            data['extra_data'] = json.dumps(data['extra_data'])
        
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None
    
    def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get games by category"""
        games = self.repository.get_by_category(category)
        return [game.to_dict() for game in games]


class UserService(BaseService):
    """Service for User business logic"""
    
    def __init__(self, repository: UserRepository):
        super().__init__(repository)
        self.repository: UserRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user with validation"""
        # Generate user_id if not provided
        if 'user_id' not in data:
            data['user_id'] = str(uuid.uuid4())
        
        # Validate unique fields
        if 'username' in data and data['username']:
            existing = self.repository.get_by_username(data['username'])
            if existing:
                raise ValidationError(f"Username {data['username']} already exists")
        
        if 'email' in data and data['email']:
            existing = self.repository.get_by_email(data['email'])
            if existing:
                raise ValidationError(f"Email {data['email']} already exists")
        
        # Set timestamp
        data['created_at'] = datetime.utcnow().isoformat()
        
        # Convert dicts to JSON strings
        if 'game_scores' in data and isinstance(data['game_scores'], dict):
            data['game_scores'] = json.dumps(data['game_scores'])
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
        # Create user object
        user = User(**data)
        created = self.repository.create(user)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user with validation"""
        # Validate unique fields if changing
        if 'username' in data and data['username']:
            existing = self.repository.get_by_username(data['username'])
            if existing and existing.user_id != id_value:
                raise ValidationError(f"Username {data['username']} already exists")
        
        if 'email' in data and data['email']:
            existing = self.repository.get_by_email(data['email'])
            if existing and existing.user_id != id_value:
                raise ValidationError(f"Email {data['email']} already exists")
        
        # Convert dicts to JSON strings for database storage
        if 'game_scores' in data and isinstance(data['game_scores'], dict):
            data['game_scores'] = json.dumps(data['game_scores'])
        
        # Handle both 'extra_data' and 'metadata' keys
        if 'extra_data' in data and isinstance(data['extra_data'], dict):
            data['extra_data'] = json.dumps(data['extra_data'])
        elif 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class GameSessionService(BaseService):
    """Service for GameSession business logic"""
    
    def __init__(self, repository: GameSessionRepository):
        super().__init__(repository)
        self.repository: GameSessionRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new game session"""
        # Generate session_id if not provided
        if 'session_id' not in data:
            data['session_id'] = str(uuid.uuid4())
        
        # Validate required fields
        required_fields = ['user_id', 'game_id']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Set timestamp
        if 'started_at' not in data:
            data['started_at'] = datetime.utcnow().isoformat()
        
        # Convert metadata to JSON string
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
        session = GameSession(**data)
        created = self.repository.create(session)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update game session"""
        # Convert metadata to JSON string
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class LeaderboardService(BaseService):
    """Service for Leaderboard business logic"""
    
    def __init__(self, repository: LeaderboardRepository):
        super().__init__(repository)
        self.repository: LeaderboardRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new leaderboard entry"""
        # Generate entry_id if not provided
        if 'entry_id' not in data:
            data['entry_id'] = str(uuid.uuid4())
        
        # Validate required fields
        required_fields = ['user_id', 'game_id', 'score']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Check if user is anonymous - prevent leaderboard entry for anonymous users
        from app.models import User
        user = self.repository.db.query(User).filter(User.user_id == data['user_id']).first()
        if not user:
            raise ValidationError(f"User {data['user_id']} not found")
        if user.is_anonymous:
            raise ValidationError(f"Cannot create leaderboard entry for anonymous user {data['user_id']}")
        
        # Set timestamp
        if 'created_at' not in data:
            data['created_at'] = datetime.utcnow().isoformat()
        
        entry = Leaderboard(**data)
        created = self.repository.create(entry)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update leaderboard entry"""
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class XPRuleService(BaseService):
    """Service for XPRule business logic"""
    
    def __init__(self, repository: XPRuleRepository):
        super().__init__(repository)
        self.repository: XPRuleRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new XP rule"""
        # Generate rule_id if not provided
        if 'rule_id' not in data:
            data['rule_id'] = str(uuid.uuid4())
        
        # Validate required fields
        required_fields = ['game_id', 'rule_name', 'rule_type']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Set timestamps
        now = datetime.utcnow().isoformat()
        data['created_at'] = now
        data['updated_at'] = now
        
        # Convert parameters to JSON string
        if 'parameters' in data and isinstance(data['parameters'], dict):
            data['parameters'] = json.dumps(data['parameters'])
        
        rule = XPRule(**data)
        created = self.repository.create(rule)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update XP rule"""
        # Update timestamp
        data['updated_at'] = datetime.utcnow().isoformat()
        
        # Convert parameters to JSON string
        if 'parameters' in data and isinstance(data['parameters'], dict):
            data['parameters'] = json.dumps(data['parameters'])
        
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class QuestService(BaseService):
    """Service for Quest business logic"""
    
    def __init__(self, repository: QuestRepository):
        super().__init__(repository)
        self.repository: QuestRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new quest"""
        # Validate required fields
        required_fields = ['title', 'quest_type', 'target_value', 'xp_reward']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Set timestamp
        if 'created_at' not in data:
            data['created_at'] = datetime.utcnow().isoformat()
        
        quest = Quest(**data)
        created = self.repository.create(quest)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update quest"""
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class UserQuestService(BaseService):
    """Service for UserQuest business logic"""
    
    def __init__(self, repository: UserQuestRepository):
        super().__init__(repository)
        self.repository: UserQuestRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user quest progress"""
        # Validate required fields
        required_fields = ['user_id', 'quest_id']
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Set timestamp
        if 'started_at' not in data:
            data['started_at'] = datetime.utcnow().isoformat()
        
        user_quest = UserQuest(**data)
        created = self.repository.create(user_quest)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user quest progress"""
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class GameStatusService(BaseService):
    """Service for GameStatus business logic"""
    
    def __init__(self, repository: GameStatusRepository):
        super().__init__(repository)
        self.repository: GameStatusRepository = repository
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new game status"""
        # Validate required fields
        if 'status_name' not in data or not data['status_name']:
            raise ValidationError("status_name is required")
        if 'status_code' not in data or not data['status_code']:
            raise ValidationError("status_code is required")
        
        # Set timestamps
        now = datetime.utcnow().isoformat()
        data['created_at'] = now
        data['updated_at'] = now
        
        # Set defaults
        if 'display_order' not in data:
            data['display_order'] = 0
        if 'is_active' not in data:
            data['is_active'] = 1
        else:
            data['is_active'] = 1 if data['is_active'] else 0
        
        status = GameStatus(**data)
        created = self.repository.create(status)
        return created.to_dict()
    
    def update(self, id_value: Any, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a game status"""
        # Update timestamp
        data['updated_at'] = datetime.utcnow().isoformat()
        
        # Convert boolean to int for is_active if present
        if 'is_active' in data:
            data['is_active'] = 1 if data['is_active'] else 0
        
        updated = self.repository.update(id_value, data)
        return updated.to_dict() if updated else None


class CoinService:
    """
    Service for coin-related business logic
    Handles coin rewards, transactions, and balance management
    """
    
    def __init__(
        self,
        coins_repository: UserCoinsRepository,
        transaction_repository: CoinTransactionRepository
    ):
        self.coins_repo = coins_repository
        self.transaction_repo = transaction_repository
    
    def get_user_balance(self, user_id: str) -> Dict[str, Any]:
        """Get user's current coin balance"""
        user_coins = self.coins_repo.get_or_create(user_id)
        return user_coins.to_dict()
    
    def award_coins(
        self,
        user_id: str,
        amount: int,
        transaction_type: str,
        source_id: Optional[str] = None,
        description: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Award coins to a user and create transaction record
        
        Args:
            user_id: User identifier
            amount: Positive number of coins to award
            transaction_type: Type of transaction (quest_reward, leaderboard_reward, etc.)
            source_id: Optional ID of source (quest_id, leaderboard_rank, etc.)
            description: Optional description
            extra_data: Optional additional metadata
        
        Returns:
            Transaction record as dict
        """
        if amount <= 0:
            raise ValidationError("Amount must be positive")
        
        # Add coins to user balance
        user_coins = self.coins_repo.add_coins(user_id, amount)
        
        # Create transaction record
        transaction_id = f"tx_{uuid.uuid4().hex[:16]}"
        now = datetime.utcnow().isoformat()
        
        transaction = CoinTransaction(
            transaction_id=transaction_id,
            user_id=user_id,
            amount=amount,
            transaction_type=transaction_type,
            source_id=source_id,
            description=description or f"Earned {amount} coins",
            balance_after=user_coins.balance,
            created_at=now,
            extra_data=json.dumps(extra_data) if extra_data else '{}'
        )
        
        created = self.transaction_repo.create(transaction)
        return created.to_dict()
    
    def spend_coins(
        self,
        user_id: str,
        amount: int,
        transaction_type: str,
        source_id: Optional[str] = None,
        description: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Spend coins from user balance
        
        Returns:
            Transaction record as dict, or None if insufficient balance
        """
        if amount <= 0:
            raise ValidationError("Amount must be positive")
        
        # Try to remove coins
        user_coins = self.coins_repo.remove_coins(user_id, amount)
        if not user_coins:
            return None  # Insufficient balance
        
        # Create transaction record (negative amount)
        transaction_id = f"tx_{uuid.uuid4().hex[:16]}"
        now = datetime.utcnow().isoformat()
        
        transaction = CoinTransaction(
            transaction_id=transaction_id,
            user_id=user_id,
            amount=-amount,  # Negative for spending
            transaction_type=transaction_type,
            source_id=source_id,
            description=description or f"Spent {amount} coins",
            balance_after=user_coins.balance,
            created_at=now,
            extra_data=json.dumps(extra_data) if extra_data else '{}'
        )
        
        created = self.transaction_repo.create(transaction)
        return created.to_dict()
    
    def get_user_transactions(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user's transaction history with pagination"""
        transactions = self.transaction_repo.get_by_user(user_id, limit, offset)
        return [tx.to_dict() for tx in transactions]
    

    
    def award_quest_reward(self, user_id: str, quest_id: int, quest_title: str, quest_sats_reward: int = 0) -> Optional[Dict[str, Any]]:
        """Award coins for quest completion
        
        Uses reward_coins value from quest definition only.
        No defaults or overrides - if quest.reward_coins is 0, no coins awarded.
        """
        # Only use the reward_coins from the quest itself
        if not quest_sats_reward or quest_sats_reward <= 0:
            print(f"⚠️ Quest {quest_id} has no coin reward (reward_coins = {quest_sats_reward})")
            return None
        
        print(f"💰 Awarding {quest_sats_reward} coins for quest {quest_id}: {quest_title}")
        
        return self.award_coins(
            user_id=user_id,
            amount=quest_sats_reward,
            transaction_type="quest_reward",
            source_id=str(quest_id),
            description=f"Completed quest: {quest_title}",
            extra_data={"quest_id": quest_id, "quest_title": quest_title}
        )
    
    def award_leaderboard_reward(
        self,
        user_id: str,
        game_id: str,
        rank: int,
        score: int
    ) -> Optional[Dict[str, Any]]:
        """Award coins for leaderboard position"""
        # Check if there's a reward for this rank
        reward_config = self.get_reward_config("leaderboard_rank", str(rank))
        
        if not reward_config:
            # Try rank ranges (e.g., "top_10", "top_100")
            if rank <= 3:
                reward_config = self.get_reward_config("leaderboard_rank", "top_3")
            elif rank <= 10:
                reward_config = self.get_reward_config("leaderboard_rank", "top_10")
            elif rank <= 100:
                reward_config = self.get_reward_config("leaderboard_rank", "top_100")
        
        if reward_config:
            return self.award_coins(
                user_id=user_id,
                amount=reward_config['coin_amount'],
                transaction_type="leaderboard_reward",
                source_id=f"{game_id}_rank_{rank}",
                description=f"Rank #{rank} in {game_id}",
                extra_data={"game_id": game_id, "rank": rank, "score": score}
            )
        
        return None
    
    def award_daily_login(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Award coins for daily login"""
        reward_config = self.get_reward_config("daily_login")
        
        if reward_config:
            return self.award_coins(
                user_id=user_id,
                amount=reward_config['coin_amount'],
                transaction_type="daily_login",
                description="Daily login bonus"
            )
        
        return None


class ServiceFactory:
    """
    Factory Pattern for creating services
    Dependency Injection for testability
    """
    
    @staticmethod
    def create_game_service(repository: GameRepository) -> GameService:
        return GameService(repository)
    
    @staticmethod
    def create_user_service(repository: UserRepository) -> UserService:
        return UserService(repository)
    
    @staticmethod
    def create_session_service(repository: GameSessionRepository) -> GameSessionService:
        return GameSessionService(repository)
    
    @staticmethod
    def create_leaderboard_service(repository: LeaderboardRepository) -> LeaderboardService:
        return LeaderboardService(repository)
    
    @staticmethod
    def create_xprule_service(repository: XPRuleRepository) -> XPRuleService:
        return XPRuleService(repository)
    
    @staticmethod
    def create_quest_service(repository: QuestRepository) -> QuestService:
        return QuestService(repository)
    
    @staticmethod
    def create_userquest_service(repository: UserQuestRepository) -> UserQuestService:
        return UserQuestService(repository)
    
    @staticmethod
    def create_gamestatus_service(repository: GameStatusRepository) -> GameStatusService:
        return GameStatusService(repository)
    
    @staticmethod
    def create_coin_service(
        coins_repository: UserCoinsRepository,
        transaction_repository: CoinTransactionRepository
    ) -> CoinService:
        return CoinService(coins_repository, transaction_repository)
