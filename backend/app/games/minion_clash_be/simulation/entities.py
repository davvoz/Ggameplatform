"""
Server-side entity hierarchy: Entity, Unit, Hero, Tower, Projectile.

Feature parity with the SP simulation: status effects (slow, dot, buff,
taunt), auras (heal/buff/slow/dot), onDeath summons, on-hit slow,
low-HP rage, taunt-aware target acquisition, static units (moveSpeed=0),
siege bonus on ranged attacks.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Optional

from . import arena
from .status_effects import StatusBag

if TYPE_CHECKING:
    from .battle_session import SimWorld

# ─── Kinds ───────────────────────────────────────────────────────────
KIND_UNIT = "unit"
KIND_HERO = "hero"
KIND_TOWER = "tower"
KIND_PROJECTILE = "projectile"

# Aura tick cadence (seconds) — auras don't need 60 Hz precision.
_AURA_TICK_INTERVAL = 0.25


_NEXT_ID = 1


def _next_id() -> int:
    global _NEXT_ID
    eid = _NEXT_ID
    _NEXT_ID += 1
    return eid


# ─── Base ────────────────────────────────────────────────────────────
@dataclass
class Entity:
    team: str
    kind: str
    x: float
    y: float
    hp: float
    max_hp: float
    radius: float
    def_id: str = ""           # for client renderer (unit/hero/tower id)
    facing_x: int = 1
    id: int = field(default_factory=_next_id)
    _dead: bool = False
    status: StatusBag = field(default_factory=StatusBag)

    def is_dead(self) -> bool:
        return self._dead

    def mark_dead(self) -> None:
        self._dead = True

    def take_damage(self, amount: float, world: "SimWorld") -> None:
        if self._dead or amount <= 0:
            return
        self.hp -= amount
        if self.hp <= 0:
            self.hp = 0.0
            self._dead = True
            if world is not None:
                world.events.append({
                    "type": "entityDied",
                    "id": self.id,
                    "kind": self.kind,
                    "team": self.team,
                })
        elif world is not None and self.kind == KIND_TOWER:
            world.events.append({
                "type": "towerHit",
                "id": self.id,
                "team": self.team,
            })

    def heal(self, amount: float) -> None:
        if self._dead:
            return
        self.hp = min(self.max_hp, self.hp + amount)

    def update(self, dt: float, world: "SimWorld") -> None:  # pragma: no cover - overridden
        pass


# ─── Projectile ──────────────────────────────────────────────────────
@dataclass
class Projectile(Entity):
    target_id: int = 0
    target_x: float = 0.0
    target_y: float = 0.0
    speed: float = 360.0
    damage: float = 1.0
    siege_bonus: float = 1.0
    color: str = "#ffffff"
    _life: float = 0.0

    def update(self, dt: float, world: "SimWorld") -> None:
        self._life += dt
        if self._life > arena.PROJECTILE_MAX_LIFETIME:
            self.mark_dead()
            return
        target = world.entities.by_id(self.target_id)
        if target and not target.is_dead():
            self.target_x = target.x
            self.target_y = target.y
        dx = self.target_x - self.x
        dy = self.target_y - self.y
        dist = math.hypot(dx, dy)
        step = self.speed * dt
        if dist <= step + self.radius:
            self._impact(target, world)
            self.mark_dead()
            return
        self.x += (dx / dist) * step
        self.y += (dy / dist) * step

    def _impact(self, target: Optional[Entity], world: "SimWorld") -> None:
        if target is None or target.is_dead():
            return
        dmg = self.damage
        if target.kind == KIND_TOWER:
            dmg *= self.siege_bonus
        target.take_damage(dmg, world)


# ─── Unit ────────────────────────────────────────────────────────────
class Unit(Entity):
    """Generic minion. Full feature parity with the SP simulation:
    auras, onDeath summons, on-hit slow, low-HP rage, taunt-aware
    targeting, static units, siege bonus.
    """

    def __init__(self, *, team: str, x: float, y: float, def_dict: dict[str, Any]):
        super().__init__(
            team=team,
            kind=KIND_UNIT,
            x=x,
            y=y,
            hp=float(def_dict["hp"]),
            max_hp=float(def_dict["hp"]),
            radius=float(def_dict.get("radius", 8)),
            def_id=str(def_dict.get("id", "")),
        )
        self.facing_x = -1 if team == "player" else 1
        self.def_dict = def_dict
        self._target_id: int = 0
        self._scan_t: float = 0.0
        self._attack_cd: float = 0.0
        self._is_flying: bool = "flying" in (def_dict.get("tags") or [])
        self._move_speed: float = float(def_dict.get("moveSpeed", 60))
        self._atk_range: float = float(def_dict.get("attackRange", 20))
        self._atk_interval: float = float(def_dict.get("attackInterval", 1.0))
        self._atk_dmg: float = float(def_dict.get("attackDamage", 0))
        self._atk_kind: str = str(def_dict.get("attackKind", "melee"))
        self._proj_speed: float = float(def_dict.get("projectileSpeed", 360))
        self._hp_regen: float = float(def_dict.get("hpRegen", 0) or 0)
        self._siege_bonus: float = float(def_dict.get("siegeBonus", 1.0) or 1.0)
        # Static = no movement (war_banner). attackKind 'support' = no attack.
        self._static: bool = self._move_speed <= 0
        self._is_support: bool = self._atk_kind == "support"
        # Behavior dictionaries (None when absent → cheap update path).
        self._on_hit_def: Optional[dict[str, Any]] = def_dict.get("onHitEffect")
        self._on_death_def: Optional[dict[str, Any]] = def_dict.get("onDeath")
        self._aura_def: Optional[dict[str, Any]] = def_dict.get("auraEffect")
        self._taunt_radius: float = float(def_dict.get("tauntRadius", 0) or 0)
        self._low_hp_below: float = float(def_dict.get("lowHpRageBelow", 0) or 0)
        self._low_hp_mult: float = float(def_dict.get("lowHpRageMult", 1.0) or 1.0)
        self._aura_t: float = 0.0
        self._taunt_aura_t: float = 0.0
        # Goal = enemy tower position (canonical)
        if team == "player":
            self._goal_x, self._goal_y = arena.enemy_tower_pos()
        else:
            self._goal_x, self._goal_y = arena.player_tower_pos()

    # ── Damage / death override (onDeath summon) ───────────────
    def take_damage(self, amount: float, world: "SimWorld") -> None:
        was_alive = not self._dead
        super().take_damage(amount, world)
        if was_alive and self._dead and self._on_death_def is not None:
            self._trigger_on_death(world)

    def _trigger_on_death(self, world: "SimWorld") -> None:
        d = self._on_death_def or {}
        if d.get("type") != "summon":
            return
        unit_id = d.get("unitId")
        if not unit_id:
            return
        try:
            world.spawn.enqueue_unit(
                team=self.team, unit_id=unit_id,
                x=self.x, y=self.y,
                count=int(d.get("count", 1)),
                spread=float(d.get("spread", 18)),
            )
        except (KeyError, ValueError):
            return  # unknown unit id — fail soft

    # ── Effective stats (slow, buff, rage) ─────────────────────
    def _effective_speed(self) -> float:
        return self._move_speed * self.status.slow_factor()

    def _effective_damage(self) -> float:
        dmg = self._atk_dmg * self.status.damage_mult()
        if self._low_hp_below > 0 and self.max_hp > 0:
            if (self.hp / self.max_hp) <= self._low_hp_below:
                dmg *= self._low_hp_mult
        return dmg

    # ── Update ─────────────────────────────────────────────────
    def update(self, dt: float, world: "SimWorld") -> None:
        if self.is_dead():
            return
        # Status (DoT, expirations) — may kill us this tick
        self.status.tick(dt, world.now, self, world)
        if self.is_dead():
            return
        self._update_periodic_effects(dt, world)
        # Static support unit: no movement, no attack — done.
        if self._static and self._is_support:
            return
        target = self._acquire_target(world, dt)
        self._engage_target(target, dt, world)

    def _update_periodic_effects(self, dt: float, world: "SimWorld") -> None:
        if self._hp_regen > 0:
            self.heal(self._hp_regen * dt)
        if self._attack_cd > 0:
            self._attack_cd -= dt
        if self._aura_def is not None:
            self._aura_t -= dt
            if self._aura_t <= 0:
                self._aura_t = _AURA_TICK_INTERVAL
                self._tick_aura(world)
        if self._taunt_radius > 0:
            self._taunt_aura_t -= dt
            if self._taunt_aura_t <= 0:
                self._taunt_aura_t = _AURA_TICK_INTERVAL
                self._tick_taunt(world)

    def _engage_target(self, target: Optional[Entity], dt: float, world: "SimWorld") -> None:
        if target is None:
            if not self._static:
                self._move_toward(self._goal_x, self._goal_y, dt)
            return
        dx = target.x - self.x
        dy = target.y - self.y
        reach = self._atk_range + target.radius
        if dx * dx + dy * dy <= reach * reach:
            self._face(target.x)
            if self._attack_cd <= 0 and not self._is_support:
                self._attack(target, world)
                self._attack_cd = self._atk_interval
            return
        if not self._static:
            self._move_toward(target.x, target.y, dt)

    def _acquire_target(self, world: "SimWorld", dt: float) -> Optional[Entity]:
        # Forced taunt target wins until expiry.
        forced_id = self.status.taunter_id(world.now)
        if forced_id:
            forced = world.entities.by_id(forced_id)
            if forced is not None and not forced.is_dead():
                self._target_id = forced.id
                return forced

        self._scan_t -= dt
        target = world.entities.by_id(self._target_id) if self._target_id else None
        if self._scan_t <= 0 or target is None or target.is_dead():
            self._scan_t = arena.TARGET_SCAN_INTERVAL
            target = world.spatial.find_nearest_enemy(
                self, arena.opposing(self.team), self._atk_range + 60
            )
            self._target_id = target.id if target else 0
        return target

    def _attack(self, target: Entity, world: "SimWorld") -> None:
        dmg = self._effective_damage()
        if self._atk_kind == "melee":
            target.take_damage(dmg, world)
            world.events.append({
                "type": "meleeHit",
                "team": self.team,
                "srcId": self.id,
                "targetId": target.id,
            })
            self._apply_on_hit(target, world)
        elif self._atk_kind == "ranged":
            world.combat.fire_projectile(
                team=self.team,
                from_x=self.x,
                from_y=self.y,
                target=target,
                damage=dmg,
                speed=self._proj_speed,
                siege_bonus=self._siege_bonus,
            )
            world.events.append({
                "type": "projectile",
                "team": self.team,
                "fromX": self.x,
                "fromY": self.y,
                "targetId": target.id,
            })
            # On-hit fires on impact ideally; for simplicity apply on cast
            # (matches SP simulation's "on attack" semantics for snipers).
            self._apply_on_hit(target, world)

    def _apply_on_hit(self, target: Entity, world: "SimWorld") -> None:
        d = self._on_hit_def
        if d is None or target.is_dead():
            return
        if d.get("type") == "slow" and hasattr(target, "status"):
            target.status.apply_slow(
                float(d.get("factor", 0.5)),
                float(d.get("duration", 1.0)),
                world.now,
            )

    # ── Auras ──────────────────────────────────────────────────
    def _tick_aura(self, world: "SimWorld") -> None:
        d = self._aura_def or {}
        a_type = d.get("type")
        handler = self._AURA_HANDLERS.get(a_type)
        if handler is None:
            return
        radius = float(d.get("radius", 100))
        team_filter = d.get("team", "ally")
        target_team = self.team if team_filter == "ally" else arena.opposing(self.team)
        targets = world.spatial.query_by_team(self.x, self.y, radius, target_team)
        handler(self, d, targets, world)

    def _aura_heal(self, d: dict[str, Any], targets: list[Entity], world: "SimWorld") -> None:
        del world
        amount = float(d.get("amountPerSecond", 0)) * _AURA_TICK_INTERVAL
        if amount <= 0:
            return
        for t in targets:
            if t.is_dead() or t is self:
                continue
            t.heal(amount)

    def _aura_buff(self, d: dict[str, Any], targets: list[Entity], world: "SimWorld") -> None:
        mult = float(d.get("damageMult", 1.0))
        dur = _AURA_TICK_INTERVAL * 2
        for t in targets:
            if self._can_apply_status(t):
                t.status.apply_buff(mult, dur, world.now)

    def _aura_slow(self, d: dict[str, Any], targets: list[Entity], world: "SimWorld") -> None:
        factor = float(d.get("factor", 0.7))
        dur = _AURA_TICK_INTERVAL * 2
        for t in targets:
            if self._can_apply_status(t, allow_self=False):
                t.status.apply_slow(factor, dur, world.now)

    def _aura_dot(self, d: dict[str, Any], targets: list[Entity], world: "SimWorld") -> None:
        dps = float(d.get("damagePerSecond", 0))
        dur = _AURA_TICK_INTERVAL * 2
        for t in targets:
            if self._can_apply_status(t, allow_self=False):
                t.status.apply_dot(dps, dur, world.now)

    def _can_apply_status(self, t: Entity, allow_self: bool = True) -> bool:
        if t.is_dead() or not hasattr(t, "status"):
            return False
        if not allow_self and t is self:
            return False
        return True

    _AURA_HANDLERS = {
        "heal": _aura_heal,
        "buff": _aura_buff,
        "slow": _aura_slow,
        "dot": _aura_dot,
    }

    def _tick_taunt(self, world: "SimWorld") -> None:
        targets = world.spatial.query_by_team(
            self.x, self.y, self._taunt_radius, arena.opposing(self.team)
        )
        for t in targets:
            if t.is_dead() or not hasattr(t, "status"):
                continue
            if t.kind == KIND_TOWER:
                continue   # towers ignore taunts
            t.status.apply_taunt(self.id, _AURA_TICK_INTERVAL * 2, world.now)

    # ── Movement ───────────────────────────────────────────────
    def _move_toward(self, tx: float, ty: float, dt: float) -> None:
        wx, wy = self._waypoint(tx, ty)
        dx = wx - self.x
        dy = wy - self.y
        dist = math.hypot(dx, dy)
        if dist < 0.5:
            return
        step = min(dist, self._effective_speed() * dt)
        self.x += (dx / dist) * step
        self.y += (dy / dist) * step
        self._face(self.x + (dx / dist))

    def _waypoint(self, tx: float, ty: float) -> tuple[float, float]:
        """Route ground units through the bridge gap. Flying skip."""
        if self._is_flying:
            return tx, ty
        on_player_side = self.y > arena.BRIDGE_Y_CENTER
        target_same_side = (ty > arena.BRIDGE_Y_CENTER) == on_player_side
        if target_same_side:
            return tx, ty
        bridge_cx = (arena.BRIDGE_LEFT_X + arena.BRIDGE_RIGHT_X) / 2
        desired_x = max(arena.BRIDGE_LEFT_X + 12, min(arena.BRIDGE_RIGHT_X - 12, bridge_cx))
        return desired_x, arena.BRIDGE_Y_CENTER

    def _face(self, anchor_x: float) -> None:
        delta = anchor_x - self.x
        if delta > 0:
            self.facing_x = 1
        elif delta < 0:
            self.facing_x = -1


# ─── Hero ────────────────────────────────────────────────────────────
class Hero(Entity):
    """Patrol around home tower; engage nearest enemy in detection range."""

    def __init__(self, *, team: str, x: float, y: float, def_dict: dict[str, Any]):
        super().__init__(
            team=team,
            kind=KIND_HERO,
            x=x,
            y=y,
            hp=float(def_dict["hp"]),
            max_hp=float(def_dict["hp"]),
            radius=float(def_dict.get("radius", 12)),
            def_id=str(def_dict.get("id", "")),
        )
        self.facing_x = -1 if team == "player" else 1
        self.def_dict = def_dict
        self._home_x = x
        self._home_y = y
        self._patrol_radius = 90.0
        self._detect_radius = 220.0
        self._patrol_angle = 0.0
        self._patrol_x, self._patrol_y = self._next_patrol_point()
        self._scan_t = 0.0
        self._target_id = 0
        self._attack_cd = 0.0
        self._move_speed = float(def_dict.get("moveSpeed", 70))
        self._atk_range = float(def_dict.get("attackRange", 30))
        self._atk_interval = float(def_dict.get("attackInterval", 1.0))
        self._atk_dmg = float(def_dict.get("attackDamage", 10))
        self._atk_kind = str(def_dict.get("attackKind", "melee"))
        self._proj_speed = float(def_dict.get("projectileSpeed", 360))
        self._hp_regen = float(def_dict.get("hpRegen", 0) or 0)

    def update(self, dt: float, world: "SimWorld") -> None:
        if self.is_dead():
            return
        # Status (DoT, expirations) — may kill us this tick
        self.status.tick(dt, world.now, self, world)
        if self.is_dead():
            return
        if self._hp_regen > 0:
            self.heal(self._hp_regen * dt)
        if self._attack_cd > 0:
            self._attack_cd -= dt
        target = self._resolve_target(dt, world)
        if target is not None:
            self._engage_target(target, dt, world)
            return
        self._patrol(dt)

    def _resolve_target(self, dt: float, world: "SimWorld") -> Optional[Entity]:
        forced_id = self.status.taunter_id(world.now)
        if forced_id:
            forced = world.entities.by_id(forced_id)
            if forced is not None and not forced.is_dead():
                self._target_id = forced.id
                return forced
            return None
        target = world.entities.by_id(self._target_id) if self._target_id else None
        self._scan_t -= dt
        if self._scan_t <= 0 or target is None or target.is_dead():
            self._scan_t = arena.TARGET_SCAN_INTERVAL
            target = world.spatial.find_nearest_enemy(
                self, arena.opposing(self.team), self._detect_radius
            )
            self._target_id = target.id if target else 0
        return target

    def _engage_target(self, target: Entity, dt: float, world: "SimWorld") -> None:
        dx = target.x - self.x
        dy = target.y - self.y
        reach = self._atk_range + target.radius
        if dx * dx + dy * dy <= reach * reach:
            self._face(target.x)
            if self._attack_cd <= 0:
                self._attack(target, world)
                self._attack_cd = self._atk_interval
            return
        self._move_toward(target.x, target.y, dt)

    def _patrol(self, dt: float) -> None:
        dpx = self._patrol_x - self.x
        dpy = self._patrol_y - self.y
        if dpx * dpx + dpy * dpy < 36:
            self._patrol_x, self._patrol_y = self._next_patrol_point()
        self._move_toward(self._patrol_x, self._patrol_y, dt)

    def _attack(self, target: Entity, world: "SimWorld") -> None:
        dmg = self._atk_dmg * self.status.damage_mult()
        if self._atk_kind == "melee":
            target.take_damage(dmg, world)
            world.events.append({
                "type": "meleeHit",
                "team": self.team,
                "srcId": self.id,
                "targetId": target.id,
            })
        elif self._atk_kind == "ranged":
            world.combat.fire_projectile(
                team=self.team,
                from_x=self.x,
                from_y=self.y,
                target=target,
                damage=dmg,
                speed=self._proj_speed,
                siege_bonus=1.0,
            )
            world.events.append({
                "type": "projectile",
                "team": self.team,
                "fromX": self.x,
                "fromY": self.y,
                "targetId": target.id,
            })

    def _move_toward(self, tx: float, ty: float, dt: float) -> None:
        dx = tx - self.x
        dy = ty - self.y
        dist = math.hypot(dx, dy)
        if dist < 0.5:
            return
        speed = self._move_speed * self.status.slow_factor()
        step = min(dist, speed * dt)
        self.x += (dx / dist) * step
        self.y += (dy / dist) * step
        self._face(self.x + (dx / dist))

    def _next_patrol_point(self) -> tuple[float, float]:
        # Deterministic enough for server: rotate by a fixed angle each pick
        self._patrol_angle += math.pi * 0.6
        return (
            self._home_x + math.cos(self._patrol_angle) * self._patrol_radius,
            self._home_y + math.sin(self._patrol_angle) * self._patrol_radius * 0.6,
        )

    def _face(self, anchor_x: float) -> None:
        delta = anchor_x - self.x
        if delta > 0:
            self.facing_x = 1
        elif delta < 0:
            self.facing_x = -1


# ─── Tower ───────────────────────────────────────────────────────────
class Tower(Entity):
    """Static defensive structure. Picks nearest enemy in range, fires."""

    def __init__(self, *, team: str, x: float, y: float, def_dict: dict[str, Any]):
        super().__init__(
            team=team,
            kind=KIND_TOWER,
            x=x,
            y=y,
            hp=float(def_dict["hp"]),
            max_hp=float(def_dict["hp"]),
            radius=float(def_dict.get("radius", 28)),
            def_id="tower",
        )
        self.def_dict = def_dict
        self._attack_cd = 0.0
        self._scan_t = 0.0
        self._target_id = 0
        self._atk_range = float(def_dict.get("attackRange", 170))
        self._atk_interval = float(def_dict.get("attackInterval", 1.0))
        self._atk_dmg = float(def_dict.get("attackDamage", 30))
        self._proj_speed = float(def_dict.get("projectileSpeed", 420))

    def update(self, dt: float, world: "SimWorld") -> None:
        if self.is_dead():
            return
        if self._attack_cd > 0:
            self._attack_cd -= dt
        self._scan_t -= dt
        target = world.entities.by_id(self._target_id) if self._target_id else None
        out_of_range = False
        if target and not target.is_dead():
            dx = target.x - self.x
            dy = target.y - self.y
            out_of_range = dx * dx + dy * dy > self._atk_range * self._atk_range
        if self._scan_t <= 0 or target is None or target.is_dead() or out_of_range:
            self._scan_t = 0.25
            target = world.spatial.find_nearest_enemy(
                self, arena.opposing(self.team), self._atk_range
            )
            self._target_id = target.id if target else 0

        if target is not None and self._attack_cd <= 0:
            world.combat.fire_projectile(
                team=self.team,
                from_x=self.x,
                from_y=self.y,
                target=target,
                damage=self._atk_dmg,
                speed=self._proj_speed,
                siege_bonus=1.0,
            )
            world.events.append({
                "type": "projectile",
                "team": self.team,
                "fromX": self.x,
                "fromY": self.y,
                "targetId": target.id,
            })
            self._attack_cd = self._atk_interval
