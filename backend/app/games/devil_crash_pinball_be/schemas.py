"""Pydantic schemas for Devil Crash community boards."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ─── Inbound ──────────────────────────────────────────────────────────────────

class BoardPayload(BaseModel):
    """Container for the full multi-section board sent by the editor.

    Shape (kept loose: deep validation lives in `validator.py`):
        {
          "board": { "sections": ["key1", "key2", ...] },
          "sections": { "key1": <section json>, ... }
        }
    """
    model_config = ConfigDict(extra='forbid')

    board: Dict[str, Any]
    sections: Dict[str, Dict[str, Any]]


class CreateBoardRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: str = Field(min_length=1, max_length=60)
    payload: BoardPayload


class UpdateBoardRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    payload: Optional[BoardPayload] = None


# ─── Outbound ─────────────────────────────────────────────────────────────────

class BoardSummary(BaseModel):
    board_id: int
    game_id: str
    owner_user_id: str
    owner_username: str = ''
    name: str
    like_count: int
    play_count: int
    created_at: str
    updated_at: str
    liked_by_me: bool = False


class BoardDetail(BoardSummary):
    payload: BoardPayload


class BoardListResponse(BaseModel):
    items: List[BoardSummary]
    total: int
    page: int
    page_size: int


class LikeToggleResponse(BaseModel):
    board_id: int
    liked: bool
    like_count: int
