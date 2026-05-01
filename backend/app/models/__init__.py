"""
SQLAlchemy ORM models for the Game Platform.

All models are re-exported here for backward compatibility.
Import from app.models as before: from app.models import Game, User, ...
"""

from app.models.base import Base

from app.models.game import (
    Game,
    GameStatus,
    GameSession,
    GameProgress,
)

from app.models.user import (
    User,
    AdminUser,
)

from app.models.leaderboard import (
    Leaderboard,
    WeeklyLeaderboard,
    LeaderboardReward,
    WeeklyWinner,
)

from app.models.quest import (
    Quest,
    UserQuest,
)

from app.models.economy import (
    XPRule,
    UserCoins,
    CoinTransaction,
    LevelMilestone,
    LevelReward,
)

from app.models.social import (
    CommunityMessage,
    UserConnection,
    PrivateMessage,
    PushSubscription,
)

from app.models.platform import (
    PlatformConfig,
    Campaign,
    UserLoginStreak,
    DailyLoginRewardConfig,
)

from app.models.community_board import (
    CommunityBoard,
    CommunityBoardLike,
)

__all__ = [
    "Base",
    # Game
    "Game",
    "GameStatus",
    "GameSession",
    "GameProgress",
    # User
    "User",
    "AdminUser",
    # Leaderboard
    "Leaderboard",
    "WeeklyLeaderboard",
    "LeaderboardReward",
    "WeeklyWinner",
    # Quest
    "Quest",
    "UserQuest",
    # Economy
    "XPRule",
    "UserCoins",
    "CoinTransaction",
    "LevelMilestone",
    "LevelReward",
    # Social
    "CommunityMessage",
    "UserConnection",
    "PrivateMessage",
    "PushSubscription",
    # Platform
    "PlatformConfig",
    "Campaign",
    "UserLoginStreak",
    "DailyLoginRewardConfig",
    # Community Boards (UGC)
    "CommunityBoard",
    "CommunityBoardLike",
]
