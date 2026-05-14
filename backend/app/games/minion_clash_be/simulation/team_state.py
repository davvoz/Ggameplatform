"""
TeamState — per-team mana, cooldowns, hand, deck, tower, hero, hero respawn.

Pure server-side state container. The client never owns these in MP;
it reads them from periodic `state` snapshots.
"""

from __future__ import annotations

import random
from typing import Any, Optional

from . import arena
from .data_loader import DataRegistry
from .entities import Hero, Tower
from .entity_manager import EntityManager


HAND_SLOTS = 4


class _ManaPool:
    def __init__(self) -> None:
        self._max = float(arena.MAX_MANA)
        self._regen = float(arena.MANA_REGEN_PER_SEC)
        self._value = float(arena.START_MANA)

    def update(self, dt: float) -> None:
        if self._value < self._max:
            self._value = min(self._max, self._value + self._regen * dt)

    @property
    def value(self) -> float:
        return self._value

    @property
    def max(self) -> float:
        return self._max

    def can_consume(self, cost: float) -> bool:
        return self._value + 0.0001 >= cost

    def consume(self, cost: float) -> None:
        if not self.can_consume(cost):
            raise ValueError("insufficient mana")
        self._value -= cost


class _CooldownTracker:
    def __init__(self) -> None:
        self._cd: dict[str, float] = {}

    def set(self, card_id: str, seconds: float) -> None:
        self._cd[card_id] = float(seconds)

    def is_on_cooldown(self, card_id: str) -> bool:
        return self._cd.get(card_id, 0.0) > 0.0

    def update(self, dt: float) -> None:
        if not self._cd:
            return
        expired = []
        for k, v in self._cd.items():
            nv = v - dt
            if nv <= 0:
                expired.append(k)
            else:
                self._cd[k] = nv
        for k in expired:
            del self._cd[k]

    def active_ids(self) -> set[str]:
        return set(self._cd.keys())

    def snapshot(self) -> dict[str, float]:
        return dict(self._cd)


class _Deck:
    """Cycling draw pile. Skips ids in the skip-set when drawing."""

    def __init__(self, card_ids: list[str], rng: random.Random):
        if not card_ids:
            raise ValueError("Deck: cardIds must be non-empty")
        self._all: list[str] = list(card_ids)
        self._rng = rng
        self._draw: list[str] = self._shuffle(list(card_ids))

    def draw_next(self, skip: set[str]) -> Optional[str]:
        for i, c in enumerate(self._draw):
            if c not in skip:
                self._draw.pop(i)
                return c
        # exhausted: refill
        self._draw = self._shuffle([c for c in self._all if c not in skip])
        return self._draw.pop(0) if self._draw else None

    def _shuffle(self, arr: list[str]) -> list[str]:
        self._rng.shuffle(arr)
        return arr


class _Hand:
    def __init__(self, deck: _Deck, cd: _CooldownTracker):
        self._slots: list[Optional[str]] = [None] * HAND_SLOTS
        self._deck = deck
        self._cd = cd

    @property
    def slots(self) -> list[Optional[str]]:
        return self._slots

    def fill(self) -> None:
        self._refill()

    def card_at(self, idx: int) -> Optional[str]:
        if idx < 0 or idx >= HAND_SLOTS:
            return None
        return self._slots[idx]

    def play(self, idx: int) -> Optional[str]:
        if idx < 0 or idx >= HAND_SLOTS:
            return None
        c = self._slots[idx]
        self._slots[idx] = None
        return c

    def update(self) -> None:
        self._refill()

    def _refill(self) -> None:
        for i in range(HAND_SLOTS):
            if self._slots[i] is None:
                self._slots[i] = self._draw_next()

    def _draw_next(self) -> Optional[str]:
        skip = self._cd.active_ids()
        for s in self._slots:
            if s:
                skip.add(s)
        return self._deck.draw_next(skip)


class TeamState:
    """Owns mana, cooldowns, hand, deck, tower, hero (with respawn)."""

    def __init__(
        self,
        *,
        team: str,
        hero_def: dict[str, Any],
        deck_ids: list[str],
        tower_def: dict[str, Any],
        em: EntityManager,
        rng: random.Random,
    ):
        self.team = team
        self.mana = _ManaPool()
        self.cooldowns = _CooldownTracker()
        self.deck = _Deck(deck_ids, rng)
        self.hand = _Hand(self.deck, self.cooldowns)
        self.hand.fill()
        self._em = em
        self._hero_def = hero_def
        if team == "player":
            t_pos = arena.player_tower_pos()
            h_pos = arena.player_hero_spawn()
        else:
            t_pos = arena.enemy_tower_pos()
            h_pos = arena.enemy_hero_spawn()
        self._hero_spawn = h_pos
        self.tower = Tower(team=team, x=t_pos[0], y=t_pos[1], def_dict=tower_def)
        self.hero = Hero(team=team, x=h_pos[0], y=h_pos[1], def_dict=hero_def)
        em.add(self.tower)
        em.add(self.hero)
        self._hero_respawn_t = -1.0   # sentinel: <0 means "not in respawn window"

    def update(self, dt: float) -> None:
        self.mana.update(dt)
        self.cooldowns.update(dt)
        self.hand.update()
        self._tick_hero_respawn(dt)

    @property
    def hero_alive(self) -> bool:
        return not self.hero.is_dead()

    @property
    def hero_respawn_in(self) -> float:
        return max(0.0, self._hero_respawn_t)

    def _tick_hero_respawn(self, dt: float) -> None:
        if not self.hero.is_dead():
            return
        if self._hero_respawn_t < 0.0:
            self._hero_respawn_t = float(self._hero_def.get("respawnDelay", 8))
        self._hero_respawn_t -= dt
        if self._hero_respawn_t > 0:
            return
        self._hero_respawn_t = -1.0
        hx, hy = self._hero_spawn
        self.hero = Hero(team=self.team, x=hx, y=hy, def_dict=self._hero_def)
        self._em.add(self.hero)
