"""
Hexforge: speed-up bonuses and the daily and weekly rewards that hand them out.

  bonuses   kept in an inventory until used, on anything that recharges:
              hourglass         -15 min on a forge job, a hurt hero or the energy
              golden_hourglass  -1 h, same targets
              salve             heals a hurt hero at once
              flask             +1 energy charge (never above the maximum)
  login     a 7-day calendar: one reward per day, growing; the 7th is the
            biggest. A missed day loses nothing: the next visit claims the
            next day. After day 7 it starts again.
  tasks     3 tasks a day, picked from a pool (the same 3 all day for a
            player); each pays XP and a bonus once done and claimed.
  weekly    a chest that opens after CHEST_GOAL tasks claimed in the week.

Days and weeks are UTC (weeks start on Monday). Everything lives inside the
city JSON (`city["bonuses"]`, `city["rewards"]`), added by `ensure_rewards`.
Pure functions over plain dicts; XP goes through `progress.gain`.
"""

from __future__ import annotations

import random

from . import progress
from .errors import ActionError
from .outposts import ENERGY_MAX, settle_energy

DAY = 86400
CHEST_GOAL = 12

BONUSES = {
    "hourglass": {"seconds": 900},
    "golden_hourglass": {"seconds": 3600},
    "salve": {},
    "flask": {},
}
HOURGLASSES = ("hourglass", "golden_hourglass")


def _reward(xp=0, bonuses=None, **materials):
    return {"xp": xp, "bonuses": bonuses or {}, "materials": materials}


LOGIN_CALENDAR = (
    _reward(10, rune_stone=80, scrap=80),
    _reward(10, {"hourglass": 1}),
    _reward(15, mana=60, chips=40),
    _reward(15, {"salve": 1}),
    _reward(20, {"golden_hourglass": 1}, rune_stone=100, scrap=100),
    _reward(20, {"flask": 1}),
    _reward(40, {"golden_hourglass": 2, "flask": 1, "salve": 1},
            rune_stone=200, scrap=200, mana=120, chips=80),
)

# task id -> (event it counts, goal, reward)
TASKS = {
    "collect_times": ("collect", 4, _reward(25, {"hourglass": 1})),
    "collect_units": ("collect_units", 400, _reward(25, rune_stone=60, scrap=60, mana=40, chips=30)),
    "forge": ("forge", 2, _reward(25, {"hourglass": 1})),
    "claim": ("claim", 2, _reward(25, mana=60, chips=40)),
    "attack": ("attack", 2, _reward(25, {"flask": 1})),
    "win": ("win", 1, _reward(30, {"salve": 1})),
}
TASKS_PER_DAY = 3

WEEKLY_CHEST = _reward(100, {"golden_hourglass": 2, "salve": 2, "flask": 2},
                       rune_stone=300, scrap=300, mana=200, chips=150)


def day_of(now: float) -> int:
    return int(now // DAY)


def week_of(now: float) -> int:
    return (day_of(now) + 3) // 7          # day 0 (1 Jan 1970) was a Thursday


def ensure_rewards(city: dict, seed: str, now: float) -> None:
    """Add the inventory and the reward trackers; roll the day's tasks and the week over."""
    city.setdefault("bonuses", {})
    rewards = city.setdefault("rewards", {"login": {"streak": 0, "last_day": None}})
    today = day_of(now)
    if rewards.get("day") != today:
        pool = sorted(TASKS)
        picked = random.Random(f"{seed}:{today}").sample(pool, TASKS_PER_DAY)
        rewards["day"] = today
        rewards["tasks"] = [{"id": t, "progress": 0, "claimed": False} for t in picked]
    week = week_of(now)
    if rewards.get("week") != week:
        rewards["week"] = week
        rewards["week_done"] = 0
        rewards["chest_claimed"] = False


# ── handing things out ─────────────────────────────────────────────────
def grant(city: dict, materials: dict, reward: dict) -> dict:
    """Give a reward; returns it with the levels its XP reached."""
    for material, amount in reward["materials"].items():
        materials[material] = materials.get(material, 0) + amount
    for bonus, count in reward["bonuses"].items():
        city["bonuses"][bonus] = city["bonuses"].get(bonus, 0) + count
    levels = progress.gain(city, materials, reward["xp"])
    return {**reward, "levels": levels}


def record(city: dict, event: str, amount: int = 1) -> None:
    """Count something the player did towards today's tasks."""
    for task in city["rewards"]["tasks"]:
        kind, goal, _ = TASKS[task["id"]]
        if kind == event:
            task["progress"] = min(goal, task["progress"] + amount)


def claim_login(city: dict, materials: dict, now: float) -> dict:
    login = city["rewards"]["login"]
    if login["last_day"] == day_of(now):
        raise ActionError("already_claimed")
    reward = LOGIN_CALENDAR[login["streak"] % len(LOGIN_CALENDAR)]
    login["streak"] += 1
    login["last_day"] = day_of(now)
    return grant(city, materials, reward)


def claim_task(city: dict, materials: dict, task_id: str) -> dict:
    task = next((t for t in city["rewards"]["tasks"] if t["id"] == task_id), None)
    if task is None:
        raise ActionError("unknown_task")
    if task["claimed"]:
        raise ActionError("already_claimed")
    _, goal, reward = TASKS[task_id]
    if task["progress"] < goal:
        raise ActionError("not_done")
    task["claimed"] = True
    city["rewards"]["week_done"] += 1
    return grant(city, materials, reward)


def claim_chest(city: dict, materials: dict) -> dict:
    rewards = city["rewards"]
    if rewards["chest_claimed"]:
        raise ActionError("already_claimed")
    if rewards["week_done"] < CHEST_GOAL:
        raise ActionError("not_done")
    rewards["chest_claimed"] = True
    return grant(city, materials, WEEKLY_CHEST)


# ── using bonuses ──────────────────────────────────────────────────────
def use_bonus(city: dict, heroes: list, bonus: str, now: float, *,
              job_id: int | None = None, hero_id: int | None = None, energy: bool = False) -> dict:
    """Spend one bonus on one target; returns what changed."""
    if bonus not in BONUSES:
        raise ActionError("unknown_bonus")
    if city["bonuses"].get(bonus, 0) <= 0:
        raise ActionError("no_bonus")
    if [job_id is not None, hero_id is not None, bool(energy)].count(True) != 1:
        raise ActionError("bad_target")
    if job_id is not None:
        result = _speed_up_job(city, bonus, job_id, now)
    elif hero_id is not None:
        result = _treat_hero(heroes, bonus, hero_id, now)
    else:
        result = _boost_energy(city, bonus, now)
    city["bonuses"][bonus] -= 1
    if city["bonuses"][bonus] == 0:
        del city["bonuses"][bonus]
    return result


def _speed_up_job(city: dict, bonus: str, job_id: int, now: float) -> dict:
    if bonus not in HOURGLASSES:
        raise ActionError("wrong_bonus")
    job = next((j for j in city["forge"]["jobs"] if j["id"] == job_id), None)
    if job is None:
        raise ActionError("unknown_job")
    if job["ready_at"] <= now:
        raise ActionError("nothing_to_speed_up")
    job["ready_at"] = max(now, job["ready_at"] - BONUSES[bonus]["seconds"])
    return {"job": job_id, "ready_at": job["ready_at"]}


def _treat_hero(heroes: list, bonus: str, hero_id: int, now: float) -> dict:
    if bonus not in (*HOURGLASSES, "salve"):
        raise ActionError("wrong_bonus")
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    if hero.get("injured_until", 0) <= now:
        raise ActionError("nothing_to_speed_up")
    until = now if bonus == "salve" else max(now, hero["injured_until"] - BONUSES[bonus]["seconds"])
    if until <= now:
        hero.pop("injured_until", None)
    else:
        hero["injured_until"] = until
    return {"hero": hero_id, "injured_until": hero.get("injured_until")}


def _boost_energy(city: dict, bonus: str, now: float) -> dict:
    if bonus not in (*HOURGLASSES, "flask"):
        raise ActionError("wrong_bonus")
    energy = city["energy"]
    settle_energy(energy, now)
    if energy["charges"] >= ENERGY_MAX:
        raise ActionError("energy_full")
    if bonus == "flask":
        energy["charges"] += 1
        if energy["charges"] >= ENERGY_MAX:
            energy["updated_at"] = now
    else:
        energy["updated_at"] -= BONUSES[bonus]["seconds"]   # the next charge comes that much sooner
        settle_energy(energy, now)
    return {"energy": energy["charges"]}


# ── what the client sees ───────────────────────────────────────────────
def public_rewards(city: dict, now: float) -> dict:
    rewards = city["rewards"]
    login = rewards["login"]
    today = day_of(now)
    claimable = login["last_day"] != today
    tasks = []
    for t in rewards["tasks"]:
        kind, goal, reward = TASKS[t["id"]]
        tasks.append({"id": t["id"], "goal": goal, "progress": t["progress"], "claimed": t["claimed"],
                      "reward": reward})
    return {
        "login": {
            # the calendar day to claim today (1..7), or the one claimed today
            "day": (login["streak"] - (0 if claimable else 1)) % len(LOGIN_CALENDAR) + 1,
            "claimable": claimable,
            "calendar": list(LOGIN_CALENDAR),
        },
        "tasks": tasks,
        "tasks_reset_at": (today + 1) * DAY,
        "weekly": {"done": rewards["week_done"], "goal": CHEST_GOAL, "claimed": rewards["chest_claimed"],
                   "reward": WEEKLY_CHEST, "reset_at": ((rewards["week"] + 1) * 7 - 3) * DAY},
    }


def ready_count(city: dict, now: float) -> int:
    """How many rewards wait to be claimed (the badge on the Rewards button)."""
    rewards = city["rewards"]
    count = int(rewards["login"]["last_day"] != day_of(now))
    count += sum(1 for t in rewards["tasks"]
                 if not t["claimed"] and t["progress"] >= TASKS[t["id"]][1])
    count += int(not rewards["chest_claimed"] and rewards["week_done"] >= CHEST_GOAL)
    return count

