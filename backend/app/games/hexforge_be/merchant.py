"""
Hexforge: the travelling merchant.

Four offers a day, the same all day for a player and new at midnight (UTC):
two hourglass deals, one other bonus and one hero item delivered at once (no forge
time) at a discount. Each offer can be bought once that day.
"""

from __future__ import annotations

import random

from . import items
from .economy import MATERIALS
from .errors import ActionError

DAY = 86400
HOURGLASS_DEALS = (
    ("hourglass", 1, 250), ("hourglass", 2, 450), ("hourglass", 3, 600),
    ("hourglass", 4, 750), ("golden_hourglass", 1, 800),
)
BONUS_DEALS = (("salve", 1, 300), ("flask", 1, 350))
ITEM_DISCOUNT = 0.7


def day_of(now: float) -> int:
    return int(now // DAY)


def offers_for(seed: str, day: int) -> list[dict]:
    """The day's four offers: {id, gives: {materials|bonuses|item}, cost: {material: n}}."""
    rng = random.Random(f"{seed}:merchant:{day}")
    deals = [rng.choice(HOURGLASS_DEALS[:3]), rng.choice(HOURGLASS_DEALS[3:]), rng.choice(BONUS_DEALS)]
    offers = []
    for bonus, count, price in deals:
        a, b = rng.sample(MATERIALS, 2)
        offers.append({"gives": {"bonuses": {bonus: count}}, "cost": {a: price // 2, b: price - price // 2}})
    item = rng.choice(sorted(items.ITEMS))
    _, cost = items.RECIPES[item]
    offers.append({"gives": {"item": item}, "cost": {m: round(n * ITEM_DISCOUNT) for m, n in cost.items()}})
    for i, offer in enumerate(offers):
        offer["id"] = i
    return offers


def _state(city: dict, now: float) -> dict:
    state = city.setdefault("merchant", {"day": day_of(now), "bought": []})
    if state["day"] != day_of(now):
        state.update(day=day_of(now), bought=[])
    return state


def buy(city: dict, materials: dict, seed: str, offer_id: int, now: float) -> dict:
    state = _state(city, now)
    offer = next((o for o in offers_for(seed, state["day"]) if o["id"] == offer_id), None)
    if offer is None:
        raise ActionError("unknown_offer")
    if offer_id in state["bought"]:
        raise ActionError("sold_out")
    if any(materials.get(m, 0) < n for m, n in offer["cost"].items()):
        raise ActionError("not_enough_materials")
    gives = offer["gives"]
    if "item" in gives:
        items.ensure_items(city)
        if len(city["items"]) >= items.ITEM_LIMIT:
            raise ActionError("armoury_full")
    for m, n in offer["cost"].items():
        materials[m] -= n
    for m, n in gives.get("materials", {}).items():
        materials[m] = materials.get(m, 0) + n
    bonuses = city.setdefault("bonuses", {})
    for b, n in gives.get("bonuses", {}).items():
        bonuses[b] = bonuses.get(b, 0) + n
    if "item" in gives:
        items.add(city, gives["item"])
    state["bought"].append(offer_id)
    return offer


def public_merchant(city: dict, seed: str, now: float) -> dict:
    state = _state(city, now)
    offers = [{**o, "bought": o["id"] in state["bought"]} for o in offers_for(seed, state["day"])]
    return {"offers": offers, "next_at": (state["day"] + 1) * DAY}
