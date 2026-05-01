"""User-generated community boards (per-game).

Currently used by Devil Crash Pinball, but the schema is generic and keyed by
`game_id` so other UGC-capable games can reuse the same tables.
"""

from typing import Dict, Any
from sqlalchemy import (
    Column, String, Integer, Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship

from app.models.base import Base


class CommunityBoard(Base):
    """A user-authored board (level layout) for a given game."""
    __tablename__ = 'community_boards'

    board_id = Column(Integer, primary_key=True, autoincrement=True)
    game_id = Column(String, ForeignKey('games.game_id'), nullable=False)
    owner_user_id = Column(String, ForeignKey('users.user_id'), nullable=False)
    name = Column(String(60), nullable=False)
    payload_json = Column(Text, nullable=False)  # serialized BoardPayload
    like_count = Column(Integer, nullable=False, default=0)
    play_count = Column(Integer, nullable=False, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    likes = relationship(
        "CommunityBoardLike",
        back_populates="board",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index('ix_community_boards_game_likes', 'game_id', 'like_count'),
        Index('ix_community_boards_owner', 'owner_user_id'),
    )

    def to_summary(self, owner_username: str = '') -> Dict[str, Any]:
        return {
            "board_id": self.board_id,
            "game_id": self.game_id,
            "owner_user_id": self.owner_user_id,
            "owner_username": owner_username,
            "name": self.name,
            "like_count": int(self.like_count or 0),
            "play_count": int(self.play_count or 0),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def __repr__(self) -> str:
        return f"<CommunityBoard #{self.board_id} {self.game_id}/{self.name}>"


class CommunityBoardLike(Base):
    """Join table: one row per (board, user)."""
    __tablename__ = 'community_board_likes'

    board_id = Column(
        Integer,
        ForeignKey('community_boards.board_id', ondelete='CASCADE'),
        primary_key=True,
    )
    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    created_at = Column(String, nullable=False)

    board = relationship("CommunityBoard", back_populates="likes")

    __table_args__ = (
        UniqueConstraint('board_id', 'user_id', name='uq_board_like'),
    )
