"""
EntityManager — owns the live entity list with deferred additions and
dead-entity culling. Mirrors `EntityManager.js`.
"""

from __future__ import annotations

from typing import Iterable, Optional

from .entities import Entity


class EntityManager:
    def __init__(self) -> None:
        self._entities: list[Entity] = []
        self._by_id: dict[int, Entity] = {}
        self._to_add: list[Entity] = []

    def add(self, entity: Entity) -> None:
        self._to_add.append(entity)

    def flush_additions(self) -> None:
        if not self._to_add:
            return
        for e in self._to_add:
            self._entities.append(e)
            self._by_id[e.id] = e
        self._to_add.clear()

    def by_id(self, entity_id: int) -> Optional[Entity]:
        return self._by_id.get(entity_id)

    def list(self) -> list[Entity]:
        return self._entities

    def iter_all(self) -> Iterable[Entity]:
        return iter(self._entities)

    def cull_dead(self) -> int:
        if not any(e.is_dead() for e in self._entities):
            return 0
        survivors: list[Entity] = []
        removed = 0
        for e in self._entities:
            if e.is_dead():
                self._by_id.pop(e.id, None)
                removed += 1
            else:
                survivors.append(e)
        self._entities = survivors
        return removed
