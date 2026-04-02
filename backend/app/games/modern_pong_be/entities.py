"""
Server-side game entities for Modern Pong.

Each entity mirrors its client-side counterpart and carries only the
state required for authoritative physics simulation — no rendering logic.
"""

import math
import random

from .game_constants import (
    ARENA_LEFT, ARENA_RIGHT, ARENA_TOP, ARENA_BOTTOM, ARENA_MID_Y,
    BALL_RADIUS, BALL_BASE_SPEED, BALL_MAX_SPEED, BALL_ACCELERATION,
    CHARACTER_HALF, POWERUP_RADIUS, SUPER_CHARGE_MAX,
)

# ── Character roster ─────────────────────────────────────────────

CHARACTERS = {
    "blaze":  {"id": "blaze",  "strength": 9,  "speed": 5,  "spin": 4,  "passiveSize": 1},
    "frost":  {"id": "frost",  "strength": 4,  "speed": 6,  "spin": 10, "passiveSize": 1},
    "shadow": {"id": "shadow", "strength": 5,  "speed": 10, "spin": 5,  "passiveSize": 1},
    "tank":   {"id": "tank",   "strength": 10, "speed": 4,  "spin": 3,  "passiveSize": 1.3},
    "spark":  {"id": "spark",  "strength": 6,  "speed": 8,  "spin": 6,  "passiveSize": 1},
    "venom":  {"id": "venom",  "strength": 5,  "speed": 5,  "spin": 9,  "passiveSize": 1},
}

POWERUP_TYPE_IDS = ("fireball", "shield", "multiball", "grow", "freeze", "magnet", "speed")


# ── Ball ─────────────────────────────────────────────────────────

class ServerBall:
    """Server-side ball with full physics."""

    __slots__ = (
        "x", "y", "vx", "vy", "radius", "speed",
        "fireball", "fireball_timer", "frozen",
        "wall_hit", "magnet_target_y", "magnet_timer",
        "shadow_blaze_timer",
    )

    def __init__(self):
        self.radius: float = BALL_RADIUS
        self.reset(1)

    # ── lifecycle ────────────────────────────────────

    def reset(self, direction: int):
        self.x = (ARENA_LEFT + ARENA_RIGHT) / 2
        self.y = ARENA_MID_Y
        self.speed = BALL_BASE_SPEED
        angle = (random.random() * 0.5 - 0.25) * math.pi
        self.vx = math.sin(angle) * self.speed
        self.vy = math.cos(angle) * self.speed * direction
        self.fireball = False
        self.fireball_timer = 0.0
        self.frozen = True
        self.wall_hit = False
        self.magnet_target_y = None
        self.magnet_timer = 0.0
        self.shadow_blaze_timer = 0.0

    def freeze(self):
        self.frozen = True

    def unfreeze(self):
        self.frozen = False

    # ── effects ──────────────────────────────────────

    def set_fireball(self, duration: float):
        self.fireball = True
        self.fireball_timer = duration

    def consume_fireball(self) -> bool:
        if not self.fireball:
            return False
        self.fireball = False
        self.fireball_timer = 0.0
        return True

    def set_magnet(self, target_y: float, duration: float):
        self.magnet_target_y = target_y
        self.magnet_timer = duration

    def set_shadow_blaze(self, duration: float):
        self.shadow_blaze_timer = duration

    def clear_shadow_blaze(self):
        self.shadow_blaze_timer = 0.0

    # ── physics ──────────────────────────────────────

    def accelerate(self):
        self.speed = min(self.speed * BALL_ACCELERATION, BALL_MAX_SPEED)
        mag = math.sqrt(self.vx * self.vx + self.vy * self.vy)
        if mag > 0:
            self.vx = (self.vx / mag) * self.speed
            self.vy = (self.vy / mag) * self.speed

    def update(self, dt: float):
        """Advance ball physics by *dt* seconds."""
        if self.frozen:
            return

        self.x += self.vx * dt
        self.y += self.vy * dt

        # Wall bouncing
        self.wall_hit = False
        if self.x - self.radius <= ARENA_LEFT:
            self.x = ARENA_LEFT + self.radius
            self.vx = abs(self.vx)
            self.wall_hit = True
        elif self.x + self.radius >= ARENA_RIGHT:
            self.x = ARENA_RIGHT - self.radius
            self.vx = -abs(self.vx)
            self.wall_hit = True

        # Fireball timer
        if self.fireball:
            self.fireball_timer -= dt
            if self.fireball_timer <= 0:
                self.fireball = False
                self.fireball_timer = 0.0

        # Magnet pull
        if self.magnet_timer > 0:
            self.magnet_timer -= dt
            if self.magnet_timer <= 0:
                self.magnet_target_y = None
            elif self.magnet_target_y is not None:
                dy = self.magnet_target_y - self.y
                sign = 1.0 if dy > 0 else -1.0
                pull = 120 + min(abs(dy), 200) * 0.5
                self.vy += sign * pull * dt
                center_x = (ARENA_LEFT + ARENA_RIGHT) / 2
                self.vx += (center_x - self.x) * 0.3 * dt

        # Shadow blaze timer
        if self.shadow_blaze_timer > 0:
            self.shadow_blaze_timer -= dt
            if self.shadow_blaze_timer <= 0:
                self.shadow_blaze_timer = 0.0

    def check_goal(self) -> int:
        """Returns 1 (bottom scores), -1 (top scores), or 0 (in play)."""
        if self.y - self.radius <= ARENA_TOP:
            return 1
        if self.y + self.radius >= ARENA_BOTTOM:
            return -1
        return 0

    # ── serialization ────────────────────────────────

    def get_state(self) -> dict:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "vx": round(self.vx, 1),
            "vy": round(self.vy, 1),
            "fx": {
                "fireball": self.fireball,
                "fireballTimer": round(self.fireball_timer * 1000),
                "shadowBlaze": self.shadow_blaze_timer > 0,
                "shadowBlazeTimer": round(self.shadow_blaze_timer * 1000),
                "frozen": self.frozen,
            },
        }


# ── Player ───────────────────────────────────────────────────────

class ServerPlayer:
    """Server-side character with input processing and effect timers."""

    __slots__ = (
        "x", "y", "char_id", "is_top",
        "strength", "speed_stat", "spin", "passive_size",
        "size_multiplier", "speed_multiplier", "controls_reversed",
        "stun_timer", "super_charge", "_effects",
        "_init_x", "_init_y",
    )

    def __init__(self, char_id: str, is_top: bool):
        data = CHARACTERS.get(char_id, CHARACTERS["blaze"])
        self.char_id: str = data["id"]
        self.is_top: bool = is_top
        self.strength: int = data["strength"]
        self.speed_stat: int = data["speed"]
        self.spin: int = data["spin"]
        self.passive_size: float = data.get("passiveSize", 1)

        self.size_multiplier: float = 1.0
        self.speed_multiplier: float = 1.0
        self.controls_reversed: bool = False
        self.stun_timer: float = 0.0
        self.super_charge: int = 0
        self._effects: dict = {}

        self._init_x = (ARENA_LEFT + ARENA_RIGHT) / 2
        if is_top:
            self._init_y = ARENA_TOP + (ARENA_MID_Y - ARENA_TOP) * 0.4
        else:
            self._init_y = ARENA_MID_Y + (ARENA_BOTTOM - ARENA_MID_Y) * 0.6
        self.x = self._init_x
        self.y = self._init_y

    # ── derived stats ────────────────────────────────

    @property
    def hitbox_radius(self) -> float:
        return CHARACTER_HALF * self.size_multiplier * self.passive_size

    @property
    def move_speed(self) -> float:
        return (80 + self.speed_stat * 18) * self.speed_multiplier

    @property
    def hit_strength(self) -> float:
        return 0.8 + self.strength * 0.08

    @property
    def spin_factor(self) -> float:
        return self.spin * 0.04

    @property
    def super_ready(self) -> bool:
        return self.super_charge >= SUPER_CHARGE_MAX

    # ── movement ─────────────────────────────────────

    def move(self, dx: float, dy: float, dt: float):
        """Apply clamped directional input. *dt* in seconds."""
        if self.stun_timer > 0:
            return
        actual_dx = -dx if self.controls_reversed else dx
        actual_dy = -dy if self.controls_reversed else dy
        speed = self.move_speed
        self.x += actual_dx * speed * dt
        self.y += actual_dy * speed * dt
        self._clamp_position()

    def _clamp_position(self):
        r = self.hitbox_radius
        self.x = max(ARENA_LEFT + r, min(ARENA_RIGHT - r, self.x))
        if self.is_top:
            self.y = max(ARENA_TOP + r, min(ARENA_MID_Y - r, self.y))
        else:
            self.y = max(ARENA_MID_Y + r, min(ARENA_BOTTOM - r, self.y))

    def reset_position(self):
        self.x = self._init_x
        self.y = self._init_y
        self.clear_effects()

    # ── effects ──────────────────────────────────────

    def apply_effect(self, name: str, duration: float, properties: dict | None = None):
        props = properties or {}
        self._effects[name] = {"remaining": duration, **props}
        if "sizeMultiplier" in props:
            self.size_multiplier = props["sizeMultiplier"]
        if "speedMultiplier" in props:
            self.speed_multiplier = props["speedMultiplier"]
        if "controlsReversed" in props:
            self.controls_reversed = props["controlsReversed"]

    def stun(self, duration: float):
        self.stun_timer = duration

    def clear_effects(self):
        self._effects.clear()
        self.size_multiplier = 1.0
        self.speed_multiplier = 1.0
        self.controls_reversed = False
        self.stun_timer = 0.0

    def charge_super(self, amount: int):
        self.super_charge = min(SUPER_CHARGE_MAX, self.super_charge + amount)

    def consume_super(self) -> bool:
        if self.super_charge < SUPER_CHARGE_MAX:
            return False
        self.super_charge = 0
        return True

    # ── tick update ──────────────────────────────────

    def update(self, dt: float):
        """Tick stun and timed effects. *dt* in seconds."""
        if self.stun_timer > 0:
            self.stun_timer = max(0.0, self.stun_timer - dt)

        expired = []
        for name, effect in self._effects.items():
            effect["remaining"] -= dt
            if effect["remaining"] <= 0:
                expired.append(name)
        for name in expired:
            del self._effects[name]
            if name in ("giant", "shrink"):
                self.size_multiplier = 1.0
            if name == "speed":
                self.speed_multiplier = 1.0
            if name == "mirror":
                self.controls_reversed = False

    # ── serialization ────────────────────────────────

    def get_state(self) -> dict:
        return {
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "fx": {
                "stunTimer": round(self.stun_timer * 1000),
                "superCharge": self.super_charge,
                "sizeMultiplier": self.size_multiplier,
                "speedMultiplier": self.speed_multiplier,
                "controlsReversed": self.controls_reversed,
            },
        }


# ── Power-up ─────────────────────────────────────────────────────

class ServerPowerUp:
    """Collectible power-up placed on the arena."""

    __slots__ = ("type_id", "x", "y", "alive", "net_id")

    def __init__(self, type_id: str, x: float, y: float, net_id: int):
        self.type_id = type_id
        self.x = x
        self.y = y
        self.alive = True
        self.net_id = net_id

    @property
    def radius(self) -> float:
        return POWERUP_RADIUS

    def collect(self):
        self.alive = False


# ── Field objects ────────────────────────────────────────────────

class ServerShield:
    """One-hit barrier at the goal line."""

    __slots__ = ("x", "y", "width", "height", "alive", "is_top")

    def __init__(self, is_top: bool):
        self.is_top = is_top
        self.x = (ARENA_LEFT + ARENA_RIGHT) / 2
        self.y = ARENA_TOP + 3 if is_top else ARENA_BOTTOM - 3
        self.width = 60.0
        self.height = 6.0
        self.alive = True

    def destroy(self):
        self.alive = False


class ServerSuperShield:
    """Full-width barrier (Tank super) — absorbs 3 hits."""

    __slots__ = ("x", "y", "width", "height", "alive", "is_top", "hits_remaining")

    def __init__(self, is_top: bool):
        self.is_top = is_top
        self.x = (ARENA_LEFT + ARENA_RIGHT) / 2
        self.y = ARENA_TOP + 3 if is_top else ARENA_BOTTOM - 3
        self.width = float(ARENA_RIGHT - ARENA_LEFT - 20)
        self.height = 8.0
        self.hits_remaining = 3
        self.alive = True

    def hit(self):
        self.hits_remaining -= 1
        if self.hits_remaining <= 0:
            self.alive = False

    def destroy(self):
        self.alive = False


# ── Obstacle ─────────────────────────────────────────────────────

class ServerObstacle:
    """Non-destructible arena block (AABB)."""

    __slots__ = ("x", "y", "width", "height")

    def __init__(self, definition: dict):
        self.x: float = float(definition["x"])
        self.y: float = float(definition["y"])
        self.width: float = float(definition["w"])
        self.height: float = float(definition["h"])

    def overlap_x(self, cx: float, r: float) -> float:
        """X-axis penetration depth for collision axis selection."""
        if cx < self.x:
            return self.x - (cx - r)
        if cx > self.x + self.width:
            return (cx + r) - (self.x + self.width)
        return r + self.width

    def overlap_y(self, cy: float, r: float) -> float:
        """Y-axis penetration depth for collision axis selection."""
        if cy < self.y:
            return self.y - (cy - r)
        if cy > self.y + self.height:
            return (cy + r) - (self.y + self.height)
        return r + self.height
