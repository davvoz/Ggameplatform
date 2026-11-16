"""
Who is who, and the weekly challenge's standings as the game shows them.

A player's name is their Steem name when they have one (the game draws
their Steem avatar from it), else their username. The standings rank every
player's best checked run of the week, as the platform's weekly leaderboard
does: guests and banned players are left out there, so here too.
"""

from sqlalchemy.orm import Session

from app.models import User

from . import challenge as weekly
from .models import ApexDriveRace

CHALLENGE = "challenge"
# Names longer than this are cut (Steem names are at most 16).
NAME_LENGTH = 16
GUEST = "GUEST"


def _profile(user: User | None) -> dict:
    if user is None:
        return {"name": GUEST, "steem": None, "ranked": False}
    steem = user.steem_username or None
    name = (steem or user.username or GUEST)[:NAME_LENGTH]
    ranked = not user.is_anonymous and not user.banned
    return {"name": name if ranked else GUEST, "steem": steem if ranked else None, "ranked": ranked}


def profile(db: Session, user_id: str) -> dict:
    """The player's name, Steem name (for the avatar, or None), and whether their runs reach the leaderboard."""
    return _profile(db.get(User, user_id))


def _best_runs(db: Session, week_id: str) -> list:
    """Every ranked player's best run of the week, best first: [(user_id, score, time)]."""
    rows = (db.query(ApexDriveRace.user_id, ApexDriveRace.score, ApexDriveRace.time, ApexDriveRace.finished_at)
            .join(User, User.user_id == ApexDriveRace.user_id)
            .filter(ApexDriveRace.kind == CHALLENGE, ApexDriveRace.week_id == week_id,
                    ApexDriveRace.score.isnot(None), User.is_anonymous == 0, User.banned == 0)
            .all())
    best = {}
    for user_id, score, time, finished_at in rows:
        # a higher score wins; the same score, the one driven first
        kept = best.get(user_id)
        if kept is None or (score, -finished_at) > (kept[0], -kept[2]):
            best[user_id] = (score, time, finished_at)
    ordered = sorted(best.items(), key=lambda item: (-item[1][0], item[1][2]))
    return [(user_id, score, time) for user_id, (score, time, _) in ordered]


def leaderboard(db: Session, user_id: str, now: float, limit: int = 10) -> dict:
    """
    This week's standings: the first `limit` players, and the asking player's
    own place (`me`, also when it is beyond them; None before their first run).
    """
    info = weekly.challenge_of(now)
    runs = _best_runs(db, info["weekId"])
    shown = runs[:limit]
    ids = [uid for uid, _, _ in shown] + [user_id]
    users = {user.user_id: user for user in db.query(User).filter(User.user_id.in_(ids)).all()}

    def entry(rank: int, uid: str, score: int, time: float) -> dict:
        who = _profile(users.get(uid))
        return {"rank": rank, "name": who["name"], "steem": who["steem"], "score": score, "time": time,
                "me": uid == user_id}

    entries = [entry(i + 1, *run) for i, run in enumerate(shown)]
    mine = next((entry(i + 1, *run) for i, run in enumerate(runs) if run[0] == user_id), None)
    return {"weekId": info["weekId"], "trackId": info["trackId"], "players": len(runs), "entries": entries, "me": mine}
