"""
SpatialIndex — uniform-grid 2D index. Mirrors `SpatialIndex.js`.

Rebuilt every tick from EntityManager. Provides nearest-enemy lookup
and circular range queries. Excludes projectiles (kind == 'projectile').
"""

from __future__ import annotations

import math
from typing import Callable, Optional

from . import arena
from .entities import Entity, KIND_PROJECTILE
from .entity_manager import EntityManager


class SpatialIndex:
    def __init__(self) -> None:
        self._cell = arena.SPATIAL_CELL
        self._cols = math.ceil(arena.VIEW_WIDTH / self._cell)
        self._rows = math.ceil(arena.VIEW_HEIGHT / self._cell)
        self._grid: list[list[Entity]] = [[] for _ in range(self._cols * self._rows)]

    def rebuild(self, em: EntityManager) -> None:
        for bucket in self._grid:
            bucket.clear()
        cell, cols, rows = self._cell, self._cols, self._rows
        for e in em.list():
            if e.kind == KIND_PROJECTILE:
                continue
            cx = max(0, min(cols - 1, int(e.x // cell)))
            cy = max(0, min(rows - 1, int(e.y // cell)))
            self._grid[cy * cols + cx].append(e)

    def query_by_team(self, x: float, y: float, radius: float, team: str) -> list[Entity]:
        return self._collect(x, y, radius, lambda e: e.team == team and not e.is_dead())

    def query_all(self, x: float, y: float, radius: float) -> list[Entity]:
        return self._collect(x, y, radius, lambda e: not e.is_dead())

    def find_nearest_enemy(self, self_e: Entity, enemy_team: str, max_radius: float) -> Optional[Entity]:
        candidates = self.query_by_team(self_e.x, self_e.y, max_radius, enemy_team)
        best: Optional[Entity] = None
        best_sq = math.inf
        for e in candidates:
            if e is self_e:
                continue
            dx = e.x - self_e.x
            dy = e.y - self_e.y
            d = dx * dx + dy * dy
            if d < best_sq:
                best_sq = d
                best = e
        return best

    def _collect(
        self,
        x: float,
        y: float,
        radius: float,
        predicate: Callable[[Entity], bool],
    ) -> list[Entity]:
        cell, cols, rows = self._cell, self._cols, self._rows
        min_cx = max(0, int((x - radius) // cell))
        max_cx = min(cols - 1, int((x + radius) // cell))
        min_cy = max(0, int((y - radius) // cell))
        max_cy = min(rows - 1, int((y + radius) // cell))
        r2 = radius * radius
        out: list[Entity] = []
        for cy in range(min_cy, max_cy + 1):
            row_off = cy * cols
            for cx in range(min_cx, max_cx + 1):
                for e in self._grid[row_off + cx]:
                    if not predicate(e):
                        continue
                    dx = e.x - x
                    dy = e.y - y
                    if dx * dx + dy * dy <= r2:
                        out.append(e)
        return out
