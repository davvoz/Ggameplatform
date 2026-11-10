"""Hexforge: request models for the battle endpoint."""

from typing import Literal

from pydantic import BaseModel, Field

HeroName = Literal["guardian", "neon_blade", "technomancer"]


class BattleRequest(BaseModel):
    squad: list[HeroName] = Field(min_length=4, max_length=4)
    side: Literal["north", "east", "south", "west"]
    priority: Literal["towers", "core", "production"]
    tactic: Literal["compact", "spread", "split"]
