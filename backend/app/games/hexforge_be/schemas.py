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


class ForgeRequest(BaseModel):
    recipe: str = Field(min_length=1, max_length=32)


class PlaceRequest(BaseModel):
    type: str = Field(min_length=1, max_length=32)
    x: int = Field(ge=0, le=64)
    y: int = Field(ge=0, le=64)


class AttackRequest(BaseModel):
    """An attack with 4 of your heroes (on an outpost or the scouted rival)."""
    hero_ids: list[int] = Field(min_length=4, max_length=4)
    side: Literal["north", "east", "south", "west"]
    priority: Literal["towers", "core", "production"]
    tactic: Literal["compact", "spread", "split"]


class AimRequest(BaseModel):
    aim: Literal["closest", "weakest", "ranged"]
