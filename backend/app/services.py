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
    UserQuestRepository
)
from app.models import Game, User, GameSession, Leaderboard, XPRule, Quest, UserQuest


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
        
        # Convert lists and dicts to JSON strings
        if 'tags' in data and isinstance(data['tags'], list):
            data['tags'] = json.dumps(data['tags'])
        if 'metadata' in data and isinstance(data['metadata'], dict):
            data['extra_data'] = json.dumps(data['metadata'])
            del data['metadata']
        
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
        
        # Convert dicts to JSON strings
        if 'game_scores' in data and isinstance(data['game_scores'], dict):
            data['game_scores'] = json.dumps(data['game_scores'])
        if 'metadata' in data and isinstance(data['metadata'], dict):
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
