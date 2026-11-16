"""
A player's career: credits, the parts installed, the mods owned and fitted,
the best result on every track, the races run. The shop's rules (prices,
slots, energy), the unlocking of tracks and worlds and the prizes are the
game's own (js/sim/Career.js), here as the authority: the game shows them,
the server decides them.

Pure: plain data in and out (from_dict / to_dict), no database.
"""

from dataclasses import dataclass, field

from . import economy as eco

# What a shop action answers, as the game's garage words it.
OK, CREDITS, MAX, OWNED, MISSING, SLOTS, ENERGY = "ok", "credits", "max", "owned", "missing", "slots", "energy"


class CareerError(Exception):
    """A request the rules do not allow; `code` goes back to the game."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _tier(category: str, value) -> int:
    top = len(eco.economy()["parts"][category]) - 1
    return max(0, min(top, value)) if isinstance(value, int) and not isinstance(value, bool) else 0


@dataclass
class Career:
    credits: int
    parts: dict
    owned: list = field(default_factory=list)
    fitted: list = field(default_factory=list)
    results: dict = field(default_factory=dict)
    races: int = 0

    @classmethod
    def new(cls) -> "Career":
        return cls.from_dict({})

    @classmethod
    def from_dict(cls, data: dict) -> "Career":
        rules = eco.economy()
        credits = data.get("credits")
        owned = [m for m in dict.fromkeys(data.get("owned") or []) if m in rules["mods"]]
        career = cls(
            credits=credits if isinstance(credits, int) and credits >= 0 else rules["startCredits"],
            parts={category: _tier(category, (data.get("parts") or {}).get(category)) for category in rules["parts"]},
            owned=owned,
            fitted=[m for m in dict.fromkeys(data.get("fitted") or []) if m in owned],
            results=dict(data.get("results") or {}),
            races=int(data.get("races") or 0),
        )
        # rules may have changed since the save: drop the mods the bay no longer holds
        while career.fitted and career._over_bay(career.fitted):
            career.fitted.pop()
        return career

    def to_dict(self) -> dict:
        return {
            "credits": self.credits,
            "parts": dict(self.parts),
            "owned": list(self.owned),
            "fitted": list(self.fitted),
            "results": dict(self.results),
            "races": self.races,
        }

    def stats(self, mods: list | None = None) -> dict:
        return eco.stats_of(self.parts, self.fitted if mods is None else mods)

    # ---- parts and mods

    def buy_part(self, category: str) -> str:
        tiers = eco.economy()["parts"].get(category)
        if tiers is None:
            raise CareerError("unknown_part")
        tier = self.parts[category] + 1
        if tier >= len(tiers):
            return MAX
        if tiers[tier]["price"] > self.credits:
            return CREDITS
        self.credits -= tiers[tier]["price"]
        self.parts[category] = tier
        return OK

    def buy_mod(self, mod_id: str) -> str:
        mod = eco.economy()["mods"].get(mod_id)
        if mod is None:
            raise CareerError("unknown_mod")
        if mod_id in self.owned:
            return OWNED
        if mod["price"] > self.credits:
            return CREDITS
        self.credits -= mod["price"]
        self.owned.append(mod_id)
        return OK

    def _energy(self, mods: list) -> int:
        return sum(eco.economy()["mods"][m]["energy"] for m in mods)

    def _over_bay(self, mods: list) -> str | None:
        """Why these mods do not fit the bay (slots, energy), or None."""
        stats = eco.stats_of(self.parts, [])
        if len(mods) > stats["slots"]:
            return SLOTS
        if self._energy(mods) > stats["energy"]:
            return ENERGY
        return None

    def set_fitted(self, mods: list) -> str:
        """Fits exactly these mods, in this order, when they are owned and the bay holds them."""
        if len(set(mods)) != len(mods) or any(m not in self.owned for m in mods):
            return MISSING
        problem = self._over_bay(mods)
        if problem:
            return problem
        self.fitted = list(mods)
        return OK

    # ---- tracks and worlds

    def _podium(self, track_id: str) -> bool:
        result = self.results.get(track_id)
        return bool(result) and result.get("best", 99) <= eco.economy()["podium"]

    def is_world_open(self, index: int) -> bool:
        return index == 0 or all(self._podium(t) for t in eco.worlds()[index - 1]["tracks"])

    def is_track_open(self, track_id: str) -> bool:
        for index, world in enumerate(eco.worlds()):
            if track_id in world["tracks"]:
                at = world["tracks"].index(track_id)
                return self.is_world_open(index) and (at == 0 or self._podium(world["tracks"][at - 1]))
        return False

    def world_of(self, track_id: str) -> dict:
        return next(w for w in eco.worlds() if track_id in w["tracks"])

    def finish_race(self, track_id: str, position: int, best_lap: float | None, cash: int) -> dict:
        """Pays a race and records it (checked beforehand: see rules.check_career_race)."""
        prizes = eco.economy()["prizes"]
        prize = round(prizes[position - 1] * self.world_of(track_id)["prizeScale"]) if position <= len(prizes) else 0
        self.credits += prize + cash
        self.races += 1
        old = self.results.get(track_id) or {}
        new_best = not old or position < old.get("best", 99)
        new_lap = best_lap is not None and (not old.get("bestLap") or best_lap < old["bestLap"])
        self.results[track_id] = {
            "best": min(position, old.get("best", position)),
            "bestLap": best_lap if new_lap else old.get("bestLap"),
        }
        return {"prize": prize, "cash": cash, "total": prize + cash, "newBest": new_best, "newLap": new_lap}
