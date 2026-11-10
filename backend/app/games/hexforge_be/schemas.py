"""Hexforge: request models."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

HeroName = Literal["guardian", "neon_blade", "technomancer"]


class BattleRequest(BaseModel):
    squad: list[HeroName] = Field(min_length=4, max_length=4)
    side: Literal["north", "east", "south", "west"]
    priority: Literal["towers", "core", "production"]
    tactic: Literal["compact", "spread", "split"]


class CollectRequest(BaseModel):
    """Collect from these buildings only; omit to collect everything."""
    building_ids: Optional[list[int]] = Field(default=None, max_length=64)


class MoveRequest(BaseModel):
    x: int = Field(ge=0, le=64)
    y: int = Field(ge=0, le=64)
