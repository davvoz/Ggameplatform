"""
SpawnSystem — enqueues unit spawns from played cards and resolves them
on next tick (so spawn happens after the current update pass).

Mirrors `SpawnSystem.js` for `summon` cards. Cluster pattern is
deterministic (angle = step * i).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from . import arena
from .data_loader import DataRegistry
from .entities import Unit
from .entity_manager import EntityManager


@dataclass
class _SpawnJob:
    team: str
    unit_id: str
    count: int
    spread: float
    x: float
    y: float


class SpawnSystem:
    def __init__(self, em: EntityManager, data: DataRegistry):
        self._em = em
        self._data = data
        self._queue: list[_SpawnJob] = []
        self._spawned_this_flush: list[Unit] = []

    def enqueue_from_card(self, card: dict[str, Any], team: str, x: float, y: float) -> None:
        if card.get("kind") != "summon":
            raise ValueError(f"SpawnSystem: card {card.get('id')!r} is not a summon")
        self._queue.append(_SpawnJob(
            team=team,
            unit_id=card["unitId"],
            count=int(card.get("count", 1)),
            spread=float(card.get("spread", 18)),
            x=x,
            y=y,
        ))

    def enqueue_unit(
        self, *, team: str, unit_id: str, x: float, y: float,
        count: int = 1, spread: float = 18.0,
    ) -> None:
        """Direct unit spawn (used by onDeath triggers)."""
        self._queue.append(_SpawnJob(
            team=team, unit_id=unit_id,
            count=max(1, int(count)), spread=float(spread),
            x=float(x), y=float(y),
        ))

    def flush(self) -> list[Unit]:
        """Resolve queue. Returns the list of units spawned this flush."""
        self._spawned_this_flush = []
        if not self._queue:
            return self._spawned_this_flush
        for job in self._queue:
            self._resolve(job)
        self._queue.clear()
        return self._spawned_this_flush

    def _resolve(self, job: _SpawnJob) -> None:
        u_def = self._data.get_unit(job.unit_id)
        for px, py in self._cluster(job.x, job.y, job.count, job.spread):
            unit = Unit(team=job.team, x=px, y=py, def_dict=u_def)
            self._em.add(unit)
            self._spawned_this_flush.append(unit)

    @staticmethod
    def _cluster(x: float, y: float, count: int, spread: float) -> list[tuple[float, float]]:
        if count <= 1:
            return [SpawnSystem._clamp(x, y)]
        out: list[tuple[float, float]] = []
        step = (math.pi * 2) / count
        for i in range(count):
            a = step * i
            out.append(SpawnSystem._clamp(
                x + math.cos(a) * spread,
                y + math.sin(a) * spread,
            ))
        return out

    @staticmethod
    def _clamp(x: float, y: float) -> tuple[float, float]:
        return (
            max(20.0, min(arena.VIEW_WIDTH - 20.0, x)),
            max(arena.ARENA_TOP + 10.0, min(arena.ARENA_BOTTOM - 10.0, y)),
        )
