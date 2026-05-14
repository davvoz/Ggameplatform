"""
MovementSystem — soft-body separation. Mirrors `MovementSystem.js`.

Pushes overlapping units/heroes apart so blobs don't fully stack.
Skips towers (immovable) and projectiles. O(n*k) via spatial queries.
"""

from __future__ import annotations

from . import arena
from .entities import KIND_HERO, KIND_PROJECTILE, KIND_TOWER, KIND_UNIT
from .entity_manager import EntityManager
from .spatial_index import SpatialIndex


class MovementSystem:
    def __init__(self, spatial: SpatialIndex):
        self._spatial = spatial

    def update(self, em: EntityManager, dt: float) -> None:
        force = arena.SEPARATION_FORCE
        for e in em.list():
            if e.kind != KIND_UNIT and e.kind != KIND_HERO:
                continue
            self._separate_one(e, force, dt)
            self._clamp_x(e)

    def _separate_one(self, e, force: float, dt: float) -> None:
        query_r = e.radius * 2 + 4
        for o in self._spatial.query_all(e.x, e.y, query_r):
            if o is e:
                continue
            if o.kind == KIND_PROJECTILE or o.kind == KIND_TOWER:
                continue
            self._push_apart(e, o, force, dt)

    @staticmethod
    def _push_apart(e, o, force: float, dt: float) -> None:
        dx = e.x - o.x
        dy = e.y - o.y
        dist_sq = dx * dx + dy * dy
        min_d = e.radius + o.radius
        if dist_sq >= min_d * min_d or dist_sq < 0.0001:
            return
        dist = dist_sq ** 0.5
        overlap = (min_d - dist) / min_d
        push = force * overlap * dt
        e.x += (dx / dist) * push
        e.y += (dy / dist) * push

    @staticmethod
    def _clamp_x(e) -> None:
        if e.x < 12:
            e.x = 12.0
        elif e.x > arena.VIEW_WIDTH - 12:
            e.x = float(arena.VIEW_WIDTH - 12)
