"""
Hexforge: the anvil, a little game to play while the forge works.

Tap "Hammer" on a forge job: a marker swings across a bar and the player
strikes 5 times. Each perfect strike takes 2 % of the job's whole time off,
each good one 0.8 %; three rounds per job at most (up to 30 % in all). Five
perfect strikes may also leave an Hourglass behind. The client reports the
strikes; like the rest of the game's casual rewards, it is not policed.
"""

from __future__ import annotations

import random

from .errors import ActionError

ROUNDS_PER_JOB = 3
STRIKES = 5
PERFECT_SHARE = 0.02
GOOD_SHARE = 0.008
BONUS_CHANCE = 0.3            # an Hourglass, on a round of five perfect strikes


def hammer(city: dict, job_id: int, perfect: int, good: int, now: float,
           rng: random.Random | None = None) -> dict:
    job = next((j for j in city["forge"]["jobs"] if j["id"] == job_id), None)
    if job is None:
        raise ActionError("unknown_job")
    if job["ready_at"] <= now:
        raise ActionError("already_ready")
    if job.get("hammered", 0) >= ROUNDS_PER_JOB:
        raise ActionError("no_rounds_left")
    if perfect < 0 or good < 0 or perfect + good > STRIKES:
        raise ActionError("bad_score")
    full = job.setdefault("full", job["ready_at"] - job["started_at"])   # the time it had before any hammering
    cut = min(round(full * (perfect * PERFECT_SHARE + good * GOOD_SHARE)), max(0, round(job["ready_at"] - now)))
    job["ready_at"] -= cut
    job["hammered"] = job.get("hammered", 0) + 1
    bonus = None
    if perfect == STRIKES and (rng or random.Random()).random() < BONUS_CHANCE:
        bonus = "hourglass"
        bonuses = city.setdefault("bonuses", {})
        bonuses[bonus] = bonuses.get(bonus, 0) + 1
    return {"cut": cut, "bonus": bonus, "rounds_left": ROUNDS_PER_JOB - job["hammered"]}
