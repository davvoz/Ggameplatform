"""
Night Mage invasions: sending invaders, handing them out to other players'
nights, and adding up what they did there.

The rules mirror the game's (`js/app/Game.js` sendLevel, `js/config/Tuning.js`
INVADER): a run that reached wave 3 may send one monster; its level grows by
one every 4 waves, up to 5. Scores are not validated (no anti-cheat by design);
the numbers a report can add are clamped so one report cannot do much.
"""

import random
import uuid
from dataclasses import dataclass

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import User

from .models import NightMageInvader

KINDS = ("bat", "warrior", "archer", "brawler")
LIFETIME = 2 * 24 * 3600
MAX_ACTIVE = 3
MIN_WAVE = 3
WAVES_PER_LEVEL = 4
MAX_LEVEL = 5
MAX_HANDED_OUT = 8
MAX_DAMAGE_PER_RUN = 5
INBOX_DAYS = 7


class InvasionError(Exception):
    """A request the rules do not allow; `code` goes back to the game."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Outcome:
    """What one invader did in one night."""
    id: str
    damage: int
    slain: bool
    killed_mage: bool


def level_for_wave(wave: int) -> int:
    """The level of the invader a run may send, 0 when the run was too short."""
    if wave < MIN_WAVE:
        return 0
    return min(MAX_LEVEL, 1 + (wave - MIN_WAVE) // WAVES_PER_LEVEL)


def names(db: Session, user_ids: list) -> dict:
    """Display names; players without one get a stable placeholder."""
    if not user_ids:
        return {}
    rows = (db.query(User.user_id, User.username, User.steem_username)
            .filter(User.user_id.in_(user_ids)).all())
    found = {uid: username or steem for uid, username, steem in rows}
    return {uid: found.get(uid) or f"Mage {uid[-4:].upper()}" for uid in user_ids}


def _active(db: Session, now: float):
    return db.query(NightMageInvader).filter(NightMageInvader.expires_at > now)


def send(db: Session, user_id: str, kind: str, wave: int, now: float) -> NightMageInvader:
    """Sends an invader; the oldest one retires when the player already has the most allowed."""
    if kind not in KINDS:
        raise InvasionError("unknown_kind")
    level = level_for_wave(wave)
    if level == 0:
        raise InvasionError("wave_too_low")
    mine = (_active(db, now).filter(NightMageInvader.owner_id == user_id)
            .order_by(NightMageInvader.created_at).all())
    for old in mine[: max(0, len(mine) - MAX_ACTIVE + 1)]:
        old.expires_at = now
    invader = NightMageInvader(
        id=uuid.uuid4().hex, owner_id=user_id, kind=kind, level=level,
        created_at=now, expires_at=now + LIFETIME,
        appearances=0, hits=0, kills=0, slain=0,
    )
    db.add(invader)
    db.commit()
    return invader


def hand_out(db: Session, viewer_id, count: int, now: float, rng: random.Random) -> list:
    """
    Invaders for one night: other players' (never the viewer's own), at most
    one per owner, the least seen first so every invader gets its chance.
    """
    count = max(0, min(MAX_HANDED_OUT, count))
    query = _active(db, now)
    if viewer_id:
        query = query.filter(NightMageInvader.owner_id != viewer_id)
    pool = query.order_by(NightMageInvader.appearances, NightMageInvader.created_at).limit(count * 6).all()
    rng.shuffle(pool)
    pool.sort(key=lambda inv: inv.appearances)
    chosen, owners = [], set()
    for invader in pool:
        if invader.owner_id in owners:
            continue
        chosen.append(invader)
        owners.add(invader.owner_id)
        if len(chosen) == count:
            break
    for invader in chosen:
        invader.appearances += 1
    db.commit()
    owner_names = names(db, list(owners))
    return [{"id": inv.id, "kind": inv.kind, "level": inv.level, "name": owner_names[inv.owner_id]} for inv in chosen]


def record(db: Session, outcomes: list) -> int:
    """Adds what invaders did in a night. Unknown ids are skipped. @returns how many were counted."""
    by_id = {o.id: o for o in outcomes}
    if not by_id:
        return 0
    rows = db.query(NightMageInvader).filter(NightMageInvader.id.in_(list(by_id))).all()
    for invader in rows:
        outcome = by_id[invader.id]
        invader.hits += max(0, min(MAX_DAMAGE_PER_RUN, outcome.damage))
        invader.kills += 1 if outcome.killed_mage else 0
        invader.slain += 1 if outcome.slain else 0
    db.commit()
    return len(rows)


def inbox(db: Session, user_id: str, now: float) -> dict:
    """What the player's invaders of the last days did, all added up."""
    since = now - INBOX_DAYS * 24 * 3600
    mine = db.query(NightMageInvader).filter(NightMageInvader.owner_id == user_id,
                                             NightMageInvader.created_at > since)
    hits, kills, slain, seen = mine.with_entities(
        func.coalesce(func.sum(NightMageInvader.hits), 0),
        func.coalesce(func.sum(NightMageInvader.kills), 0),
        func.coalesce(func.sum(NightMageInvader.slain), 0),
        func.coalesce(func.sum(NightMageInvader.appearances), 0),
    ).one()
    active = mine.filter(NightMageInvader.expires_at > now).order_by(NightMageInvader.created_at.desc()).all()
    return {
        "totals": {"hits": int(hits), "kills": int(kills), "slain": int(slain), "seen": int(seen), "active": len(active)},
        "active": [{"id": inv.id, "kind": inv.kind, "level": inv.level, "expires_at": inv.expires_at,
                    "hits": inv.hits, "kills": inv.kills, "slain": inv.slain, "seen": inv.appearances} for inv in active],
    }
