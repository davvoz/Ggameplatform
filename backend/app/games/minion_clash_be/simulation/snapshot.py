"""
Snapshot builder. Produces the JSON-serializable `state` payload sent
to clients ~10 times per second.

Coordinates are CANONICAL (player team at bottom, y > BRIDGE_Y_CENTER).
The Room layer mirrors them per-recipient before sending so each
client always sees itself at the bottom.
"""

from __future__ import annotations

from typing import Any

from . import arena
from .entities import KIND_HERO, KIND_TOWER, KIND_UNIT, Entity
from .entity_manager import EntityManager
from .team_state import TeamState


def build_state(
    *,
    tick: int,
    t: float,
    time_left: float,
    teams: dict[str, TeamState],
    em: EntityManager,
) -> dict[str, Any]:
    """Build the canonical `state` payload (no per-client transformations)."""
    p = teams["player"]
    e = teams["enemy"]
    return {
        "type": "state",
        "tick": tick,
        "t": round(t, 3),
        "timeLeft": round(time_left, 2),
        "teams": {
            "player": _team_block(p),
            "enemy": _team_block(e),
        },
        "entities": [_entity_dict(en) for en in em.list() if not en.is_dead()],
    }


def _team_block(ts: TeamState) -> dict[str, Any]:
    return {
        "tower": {"hp": round(ts.tower.hp, 1), "maxHp": ts.tower.max_hp},
        "hero": {
            "hp": round(ts.hero.hp, 1),
            "maxHp": ts.hero.max_hp,
            "alive": ts.hero_alive,
            "respawnIn": round(ts.hero_respawn_in, 2),
        },
        "mana": {"cur": round(ts.mana.value, 2), "max": ts.mana.max},
        "cooldowns": {k: round(v, 2) for k, v in ts.cooldowns.snapshot().items()},
        "hand": list(ts.hand.slots),
    }


def _entity_dict(e: Entity) -> dict[str, Any]:
    base = {
        "id": e.id,
        "kind": e.kind,
        "team": e.team,
        "x": round(e.x, 1),
        "y": round(e.y, 1),
        "hp": round(e.hp, 1),
        "maxHp": e.max_hp,
        "defId": e.def_id,
        "facing": e.facing_x,
    }
    return base


# ─── Per-client mirroring ───────────────────────────────────────────
def mirror_state_for(state: dict[str, Any], swap_for_seat_team: str) -> dict[str, Any]:
    """Return a deep-enough copy of `state` from the perspective of the
    given seat. If `swap_for_seat_team == 'enemy'` (i.e. the guest sits
    on canonical enemy team), we mirror coordinates and swap team labels
    so the guest sees itself as 'player' at the bottom."""
    if swap_for_seat_team == "player":
        # Host: canonical view is already correct
        return state

    W = arena.VIEW_WIDTH
    H = arena.VIEW_HEIGHT
    out = {
        "type": state["type"],
        "tick": state["tick"],
        "t": state["t"],
        "timeLeft": state["timeLeft"],
        "teams": {
            "player": state["teams"]["enemy"],
            "enemy": state["teams"]["player"],
        },
        "entities": [
            {
                **e,
                "team": "enemy" if e["team"] == "player" else "player",
                "x": W - e["x"],
                "y": H - e["y"],
                "facing": -e["facing"],
            }
            for e in state["entities"]
        ],
    }
    return out


def mirror_event_for(event: dict[str, Any], swap_for_seat_team: str) -> dict[str, Any]:
    """Same coordinate/team mirror for one-shot events."""
    if swap_for_seat_team == "player":
        return event
    out = dict(event)
    if "team" in out:
        out["team"] = "enemy" if out["team"] == "player" else "player"
    if "x" in out and isinstance(out["x"], (int, float)):
        out["x"] = arena.VIEW_WIDTH - out["x"]
    if "y" in out and isinstance(out["y"], (int, float)):
        out["y"] = arena.VIEW_HEIGHT - out["y"]
    if "fromX" in out and isinstance(out["fromX"], (int, float)):
        out["fromX"] = arena.VIEW_WIDTH - out["fromX"]
    if "fromY" in out and isinstance(out["fromY"], (int, float)):
        out["fromY"] = arena.VIEW_HEIGHT - out["fromY"]
    return out
