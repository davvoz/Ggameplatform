"""
CombatSystem — projectile factory. Decouples Unit/Hero/Tower from the
Projectile constructor. Mirrors `CombatSystem.js`.
"""

from __future__ import annotations

from . import arena
from .entities import KIND_PROJECTILE, Entity, Projectile
from .entity_manager import EntityManager


class CombatSystem:
    def __init__(self, em: EntityManager):
        self._em = em

    def fire_projectile(
        self,
        *,
        team: str,
        from_x: float,
        from_y: float,
        target: Entity,
        damage: float,
        speed: float,
        siege_bonus: float = 1.0,
        color: str = "#ffd166",
    ) -> Projectile:
        p = Projectile(
            team=team,
            kind=KIND_PROJECTILE,
            x=from_x,
            y=from_y,
            hp=1.0,
            max_hp=1.0,
            radius=arena.PROJECTILE_RADIUS,
            def_id="projectile",
            target_id=target.id,
            target_x=target.x,
            target_y=target.y,
            speed=speed,
            damage=damage,
            siege_bonus=siege_bonus,
            color=color,
        )
        self._em.add(p)
        return p
