"""
SpellResolver — server-authoritative spell resolution.

Supported spell types (parity with SP simulation in cards.json):
    * aoe_damage          (fireball)
    * single_damage       (lightning_bolt)
    * aoe_damage_slow     (frost_nova, earthquake) — also honors `groundOnly`
    * aoe_heal            (heal_wave)
"""

from __future__ import annotations

import math
from typing import Any

from . import arena
from .spatial_index import SpatialIndex


class SpellResolver:
    def __init__(self, spatial: SpatialIndex):
        self._spatial = spatial

    def cast(self, card: dict[str, Any], x: float, y: float, team: str, world) -> None:
        sp = card.get("spell")
        if not sp:
            raise ValueError(f"spell card has no payload: {card.get('id')}")
        sp_type = sp.get("type")
        if sp_type == "aoe_damage":
            self._aoe_damage(sp, x, y, team, world)
        elif sp_type == "single_damage":
            self._single_damage(sp, x, y, team, world)
        elif sp_type == "aoe_damage_slow":
            self._aoe_damage_slow(sp, x, y, team, world)
        elif sp_type == "aoe_heal":
            self._aoe_heal(sp, x, y, team, world)
        else:
            raise ValueError(f"unsupported spell type: {sp_type}")

        # VFX hint event for the client
        world.events.append({
            "type": "spellCast",
            "spellType": sp_type,
            "x": x,
            "y": y,
            "radius": float(sp.get("radius", 30)),
            "color": sp.get("fxColor") or "#ffffff",
            "team": team,
        })

    # ── helpers ────────────────────────────────────────────────
    @staticmethod
    def _filter_ground_only(targets, ground_only: bool):
        if not ground_only:
            return targets
        return [t for t in targets if not getattr(t, "_is_flying", False)]

    # ── spell types ────────────────────────────────────────────
    def _aoe_damage(self, sp: dict[str, Any], x: float, y: float, team: str, world) -> None:
        radius = float(sp.get("radius", 30))
        damage = float(sp.get("damage", 0))
        ground_only = bool(sp.get("groundOnly", False))
        targets = self._spatial.query_by_team(x, y, radius, arena.opposing(team))
        for t in self._filter_ground_only(targets, ground_only):
            t.take_damage(damage, world)

    def _single_damage(self, sp: dict[str, Any], x: float, y: float, team: str, world) -> None:
        radius = float(sp.get("radius", 30))
        damage = float(sp.get("damage", 0))
        candidates = self._spatial.query_by_team(x, y, radius, arena.opposing(team))
        if not candidates:
            return
        best = None
        best_sq = math.inf
        for c in candidates:
            dx = c.x - x
            dy = c.y - y
            d = dx * dx + dy * dy
            if d < best_sq:
                best_sq = d
                best = c
        if best is not None:
            best.take_damage(damage, world)

    def _aoe_damage_slow(self, sp: dict[str, Any], x: float, y: float, team: str, world) -> None:
        radius = float(sp.get("radius", 30))
        damage = float(sp.get("damage", 0))
        slow_factor = float(sp.get("slowFactor", 0.5))
        slow_dur = float(sp.get("slowDuration", 2.0))
        ground_only = bool(sp.get("groundOnly", False))
        targets = self._spatial.query_by_team(x, y, radius, arena.opposing(team))
        for t in self._filter_ground_only(targets, ground_only):
            t.take_damage(damage, world)
            if hasattr(t, "status") and not t.is_dead():
                t.status.apply_slow(slow_factor, slow_dur, world.now)

    def _aoe_heal(self, sp: dict[str, Any], x: float, y: float, team: str, world) -> None:
        del world  # heal does not emit per-target events
        radius = float(sp.get("radius", 30))
        amount = float(sp.get("amount", 0))
        # Heal allies (own team) including hero/towers in radius.
        allies = self._spatial.query_by_team(x, y, radius, team)
        for a in allies:
            if a.is_dead():
                continue
            a.heal(amount)
