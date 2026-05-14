"""
StatusBag — per-entity transient effects (slow, dot, damage buff, taunt).

Single Responsibility: own the bookkeeping for time-bounded modifiers.
Entity update code calls `tick()` once per tick to apply DoT damage and
asks `effective_*()` for stat overrides. Effects are stamped with an
absolute simulation time (`world.now`) so re-applications choose
max(remaining, new) without drift.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .battle_session import SimWorld
    from .entities import Entity


class StatusBag:
    __slots__ = (
        "_slow_factor", "_slow_until",
        "_dot_dps", "_dot_until",
        "_buff_mult", "_buff_until",
        "_taunt_by_id", "_taunt_until",
    )

    def __init__(self) -> None:
        self._slow_factor: float = 1.0
        self._slow_until: float = 0.0
        self._dot_dps: float = 0.0
        self._dot_until: float = 0.0
        self._buff_mult: float = 1.0
        self._buff_until: float = 0.0
        self._taunt_by_id: int = 0
        self._taunt_until: float = 0.0

    # ── Apply (refresh-or-extend) ───────────────────────────────
    def apply_slow(self, factor: float, duration: float, now: float) -> None:
        end = now + duration
        # Strongest slow wins (lowest factor); duration extends to max.
        if factor < self._slow_factor or now >= self._slow_until:
            self._slow_factor = factor
        if end > self._slow_until:
            self._slow_until = end

    def apply_dot(self, dps: float, duration: float, now: float) -> None:
        end = now + duration
        if dps > self._dot_dps or now >= self._dot_until:
            self._dot_dps = dps
        if end > self._dot_until:
            self._dot_until = end

    def apply_buff(self, mult: float, duration: float, now: float) -> None:
        end = now + duration
        if mult > self._buff_mult or now >= self._buff_until:
            self._buff_mult = mult
        if end > self._buff_until:
            self._buff_until = end

    def apply_taunt(self, taunter_id: int, duration: float, now: float) -> None:
        end = now + duration
        # Newest taunter wins.
        self._taunt_by_id = taunter_id
        if end > self._taunt_until:
            self._taunt_until = end

    # ── Tick ───────────────────────────────────────────────────
    def tick(self, dt: float, now: float, owner: "Entity", world: "SimWorld") -> None:
        # Expire effects
        if now >= self._slow_until:
            self._slow_factor = 1.0
            self._slow_until = 0.0
        if now >= self._buff_until:
            self._buff_mult = 1.0
            self._buff_until = 0.0
        if now >= self._taunt_until:
            self._taunt_by_id = 0
            self._taunt_until = 0.0
        # Apply DoT damage (works while owner is alive)
        if self._dot_dps > 0 and now < self._dot_until:
            owner.take_damage(self._dot_dps * dt, world)
        elif now >= self._dot_until:
            self._dot_dps = 0.0
            self._dot_until = 0.0

    # ── Query ──────────────────────────────────────────────────
    def slow_factor(self) -> float:
        return self._slow_factor

    def damage_mult(self) -> float:
        return self._buff_mult

    def taunter_id(self, now: float) -> int:
        if now >= self._taunt_until:
            return 0
        return self._taunt_by_id
