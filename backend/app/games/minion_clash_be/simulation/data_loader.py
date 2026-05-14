"""
Catalog loader for cards / units / heroes / tower stats.

Exposes a single `DataRegistry` with cached lookups. Reads the same
JSON files the client uses, so gameplay numbers stay in lock-step
with single-player.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("minion_clash.simulation")


class DataRegistry:
    """In-memory catalog of cards, units, heroes and tower stats."""

    def __init__(self, data_dir: Path):
        self._dir = data_dir
        self._cards: dict[str, dict[str, Any]] = {}
        self._units: dict[str, dict[str, Any]] = {}
        self._heroes: dict[str, dict[str, Any]] = {}
        self._tower: dict[str, Any] = {}
        self._load_all()

    # ─── Loaders ────────────────────────────────────────────────────
    def _load_all(self) -> None:
        cards_payload = self._read_json("cards.json")
        for entry in cards_payload.get("cards", []):
            cid = entry.get("id")
            if isinstance(cid, str):
                self._cards[cid] = entry

        units_payload = self._read_json("units.json")
        units_obj = units_payload.get("units", {}) if isinstance(units_payload, dict) else {}
        if isinstance(units_obj, dict):
            for uid, udef in units_obj.items():
                if isinstance(udef, dict):
                    enriched = dict(udef)
                    enriched.setdefault("id", uid)
                    self._units[uid] = enriched

        heroes_payload = self._read_json("heroes.json")
        for entry in heroes_payload.get("heroes", []):
            hid = entry.get("id")
            if isinstance(hid, str):
                self._heroes[hid] = entry

        tower_payload = self._read_json("towers.json")
        if isinstance(tower_payload, dict):
            self._tower = tower_payload.get("tower", {}) or {}

    def _read_json(self, name: str) -> dict[str, Any]:
        path = self._dir / name
        if not path.exists():
            logger.warning("[simulation] missing data file: %s", path)
            return {}
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            logger.warning("[simulation] failed to parse %s: %s", name, exc)
            return {}

    # ─── Lookups ────────────────────────────────────────────────────
    def get_card(self, card_id: str) -> dict[str, Any]:
        card = self._cards.get(card_id)
        if not card:
            raise KeyError(f"unknown card: {card_id}")
        return card

    def get_unit(self, unit_id: str) -> dict[str, Any]:
        unit = self._units.get(unit_id)
        if not unit:
            raise KeyError(f"unknown unit: {unit_id}")
        return unit

    def get_hero(self, hero_id: str) -> dict[str, Any]:
        hero = self._heroes.get(hero_id)
        if not hero:
            raise KeyError(f"unknown hero: {hero_id}")
        return hero

    def get_tower_def(self) -> dict[str, Any]:
        return self._tower


# ─── Module-level cache (single shared instance) ───────────────────
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "minion_clash" / "data"
_REGISTRY: DataRegistry | None = None


def get_registry() -> DataRegistry:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = DataRegistry(_DATA_DIR)
    return _REGISTRY
