"""
Engine constants — mirror of `GameConfig.BATTLE` / `GameConfig.ARENA`.

Keep numeric values in sync with `minion_clash/js/config/GameConfig.js`.
Server is canonical: 'player' team = bottom half (y > BRIDGE_Y_CENTER).
"""

from __future__ import annotations

# ─── View ────────────────────────────────────────────────────────────
VIEW_WIDTH = 480
VIEW_HEIGHT = 800

# ─── Arena geometry ──────────────────────────────────────────────────
ARENA_TOP = 80
ARENA_BOTTOM = 720
BRIDGE_Y_CENTER = 400
BRIDGE_HEIGHT = 56
BRIDGE_LEFT_X = 130
BRIDGE_RIGHT_X = 350
ENEMY_TOWER_X = 240
ENEMY_TOWER_Y = 130
PLAYER_TOWER_X = 240
PLAYER_TOWER_Y = 670
PLAYER_HERO_SPAWN_X = 240
PLAYER_HERO_SPAWN_Y = 600
ENEMY_HERO_SPAWN_X = 240
ENEMY_HERO_SPAWN_Y = 200
SUMMON_ZONE_TOP = 410
SUMMON_ZONE_BOTTOM = 700
SUMMON_ZONE_LEFT = 20
SUMMON_ZONE_RIGHT = 460

# ─── Battle ──────────────────────────────────────────────────────────
ROSTER_SIZE = 10
MAX_MANA = 10
START_MANA = 4
MANA_REGEN_PER_SEC = 1.0
MATCH_TIME_LIMIT = 240.0          # seconds
SPATIAL_CELL = 64
SEPARATION_FORCE = 30.0
TARGET_SCAN_INTERVAL = 0.2

# ─── Projectile ──────────────────────────────────────────────────────
PROJECTILE_RADIUS = 4.0
PROJECTILE_MAX_LIFETIME = 4.0

# ─── Server tick (NOT in client config) ──────────────────────────────
TICK_HZ = 20
TICK_DT = 1.0 / TICK_HZ
SNAPSHOT_EVERY_N_TICKS = 1        # 20 Hz snapshots


def is_in_team_half(team: str, _x: float, y: float) -> bool:
    """Validate a card-drop coordinate is in the team's own half (canonical)."""
    if team == "player":
        return y >= SUMMON_ZONE_TOP
    return y <= SUMMON_ZONE_TOP


def opposing(team: str) -> str:
    if team == "player":
        return "enemy"
    if team == "enemy":
        return "player"
    raise ValueError(f"unknown team: {team}")


def player_tower_pos() -> tuple[float, float]:
    return (PLAYER_TOWER_X, PLAYER_TOWER_Y)


def enemy_tower_pos() -> tuple[float, float]:
    return (ENEMY_TOWER_X, ENEMY_TOWER_Y)


def player_hero_spawn() -> tuple[float, float]:
    return (PLAYER_HERO_SPAWN_X, PLAYER_HERO_SPAWN_Y)


def enemy_hero_spawn() -> tuple[float, float]:
    return (ENEMY_HERO_SPAWN_X, ENEMY_HERO_SPAWN_Y)
