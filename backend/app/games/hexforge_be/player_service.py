"""
Hexforge: a player's saved state and the actions that change it.

Every action loads the row, applies a pure rule from `economy`, and saves
with a version check. A save that loses a race raises StaleState and changes
nothing; the client simply retries with fresh state.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import economy
from .catalog import BUILDINGS
from .models import HexforgePlayer


class StaleState(Exception):
    """Another request saved this player first."""


class ActionError(Exception):
    """The action breaks a game rule; `code` says which."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass
class PlayerState:
    user_id: str
    city: dict
    heroes: list
    materials: dict
    version: int


class PlayerService:
    def __init__(self, db: Session):
        self.db = db

    # ── load / save ────────────────────────────────────────────────────
    def load(self, user_id: str, now: float) -> PlayerState:
        """The player's state, creating the starter city on first visit."""
        row = self.db.get(HexforgePlayer, user_id)
        if row is None:
            row = HexforgePlayer(
                user_id=user_id,
                city_json=json.dumps(economy.starter_city(now)),
                heroes_json=json.dumps(economy.starter_heroes()),
                materials_json=json.dumps(economy.STARTING_MATERIALS),
                version=1,
                created_at=now,
                updated_at=now,
            )
            self.db.add(row)
            try:
                self.db.commit()
            except IntegrityError:
                # a parallel first visit created the row: use that one
                self.db.rollback()
                row = self.db.get(HexforgePlayer, user_id)
        return PlayerState(
            user_id=row.user_id,
            city=json.loads(row.city_json),
            heroes=json.loads(row.heroes_json),
            materials=json.loads(row.materials_json),
            version=row.version,
        )

    def save(self, state: PlayerState, now: float) -> None:
        updated = (
            self.db.query(HexforgePlayer)
            .filter(HexforgePlayer.user_id == state.user_id,
                    HexforgePlayer.version == state.version)
            .update({
                HexforgePlayer.city_json: json.dumps(state.city),
                HexforgePlayer.heroes_json: json.dumps(state.heroes),
                HexforgePlayer.materials_json: json.dumps(state.materials),
                HexforgePlayer.version: state.version + 1,
                HexforgePlayer.updated_at: now,
            }, synchronize_session=False)
        )
        if updated != 1:
            self.db.rollback()
            raise StaleState()
        self.db.commit()
        state.version += 1

    # ── actions ────────────────────────────────────────────────────────
    def collect(self, user_id: str, now: float, building_ids=None) -> tuple[PlayerState, dict]:
        state = self.load(user_id, now)
        gained = economy.collect(state.city, state.materials, now, building_ids)
        if any(gained.values()):
            self.save(state, now)
        return state, gained

    def move_building(self, user_id: str, building_id: int, x: int, y: int, now: float) -> PlayerState:
        state = self.load(user_id, now)
        building = next((b for b in state.city["buildings"] if b["id"] == building_id), None)
        if building is None:
            raise ActionError("unknown_building")
        error = economy.placement_error(state.city, building["type"], x, y, ignore_id=building_id)
        if error:
            raise ActionError(error)
        building["x"], building["y"] = x, y
        self.save(state, now)
        return state


def public_state(state: PlayerState, now: float) -> dict:
    """What the client sees: buildings with size, HP and what they have made."""
    buildings = []
    for b in state.city["buildings"]:
        spec = BUILDINGS[b["type"]]
        item = {"id": b["id"], "type": b["type"], "x": b["x"], "y": b["y"],
                "size": spec.size, "hp": spec.hp}
        if b["type"] in economy.PRODUCTION:
            material, per_hour = economy.PRODUCTION[b["type"]]
            item["production"] = {
                "material": material,
                "per_hour": per_hour,
                "pending": economy.pending(b, now),
                "capacity": economy.capacity(b["type"]),
            }
        buildings.append(item)
    return {
        "city": {"grid": state.city["grid"], "buildings": buildings},
        "heroes": state.heroes,
        "materials": state.materials,
        "version": state.version,
        "server_time": now,
    }
