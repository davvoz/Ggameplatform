"""
Hexforge: the training dummy, a little game that gives a hero XP.

A training session is fifteen seconds tapping the green targets that light
up on a dummy (never the red ones). The client reports it as ten beats, how
many perfect and how many good (two hits make a perfect beat); like the
anvil, it is not policed.

  xp        a session is worth up to XP_SHARE of the XP the hero needs for its
            next tier (15 for a recruit, 60 for an evolved hero): a perfect
            beat counts in full, a good one half.
  mastery   a hero at the top tier (ascended or fused) trains for mastery
            instead: up to MASTERY_SESSION points a session (see evolution).
  sessions  SESSIONS_PER_DAY per hero per day (UTC), so fighting stays the
            main way to grow.
  who       any fighting hero not at the forge and not hurt.

Pure functions over plain dicts.
"""

from __future__ import annotations

from . import evolution
from .catalog import HEROES
from .errors import ActionError

BEATS = 10
SESSIONS_PER_DAY = 3
XP_SHARE = 0.10
MASTERY_SESSION = 30
DAY = 86400


def day_of(now: float) -> int:
    return int(now // DAY)


def max_xp(hero: dict) -> int:
    """The most XP one session can give this hero: a share of its next tier's threshold."""
    nxt = evolution.next_tier(hero)
    return round(evolution.TIER_XP[nxt] * XP_SHARE) if nxt else 0


def max_mastery(hero: dict) -> int:
    """The most mastery one session can give: only heroes at the top tier train for it."""
    return MASTERY_SESSION if evolution.next_tier(hero) is None else 0


def sessions_left(hero: dict, now: float) -> int:
    done = hero.get("trained", {})
    return SESSIONS_PER_DAY - (done.get("count", 0) if done.get("day") == day_of(now) else 0)


def session_xp(hero: dict, perfect: int, good: int) -> int:
    return round(max_xp(hero) * (perfect + 0.5 * good) / BEATS)


def session_mastery(hero: dict, perfect: int, good: int) -> int:
    return round(max_mastery(hero) * (perfect + 0.5 * good) / BEATS)


def check(hero: dict, now: float) -> None:
    """Why this hero cannot train now, as an ActionError."""
    if hero["cls"] not in HEROES:
        raise ActionError("cannot_train")
    if hero.get("evolving"):
        raise ActionError("hero_evolving")
    if (hero.get("injured_until") or 0) > now:
        raise ActionError("hero_injured")
    if sessions_left(hero, now) <= 0:
        raise ActionError("no_sessions_left")


def train(heroes: list, hero_id: int, perfect: int, good: int, now: float) -> dict:
    """One session: the hero gains XP, or mastery at the top tier.
    Returns {xp, mastery, mastery_points, mastery_level, level_up, ready, sessions_left}."""
    hero = next((h for h in heroes if h["id"] == hero_id), None)
    if hero is None:
        raise ActionError("unknown_hero")
    if perfect < 0 or good < 0 or perfect + good > BEATS:
        raise ActionError("bad_score")
    check(hero, now)
    xp = session_xp(hero, perfect, good)
    hero["xp"] = hero.get("xp", 0) + xp
    before = evolution.mastery_level(hero)
    cap = evolution.MASTERY_LEVELS * evolution.MASTERY_PER_LEVEL
    points = min(cap, hero.get("mastery", 0) + session_mastery(hero, perfect, good))
    gained = points - hero.get("mastery", 0)
    if gained:
        hero["mastery"] = points
    today = day_of(now)
    done = hero.get("trained", {})
    hero["trained"] = {"day": today, "count": (done.get("count", 0) if done.get("day") == today else 0) + 1}
    level = evolution.mastery_level(hero)
    return {"xp": xp, "mastery": gained, "mastery_points": hero.get("mastery", 0), "mastery_level": level,
            "level_up": level > before, "ready": evolution.can_evolve(hero), "sessions_left": sessions_left(hero, now)}
