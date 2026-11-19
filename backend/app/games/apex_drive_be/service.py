"""
Apex Drive on the database: loading and saving careers, the shop, starting
and finishing races and challenge runs, and handing a run's score to the
platform's leaderboard (game_score_validators) once.
"""

import json
import uuid

from sqlalchemy.orm import Session

from . import challenge as weekly
from . import economy as eco
from . import rules
from .career import Career, CareerError
from .models import ApexDriveCareer, ApexDriveRace

CAREER, CHALLENGE = "career", "challenge"


# ---- careers

def load_career(db: Session, user_id: str) -> Career:
    row = db.get(ApexDriveCareer, user_id)
    return Career.from_dict(json.loads(row.data)) if row else Career.new()


def save_career(db: Session, user_id: str, career: Career, now: float) -> None:
    row = db.get(ApexDriveCareer, user_id)
    if row is None:
        row = ApexDriveCareer(user_id=user_id)
        db.add(row)
    row.data = json.dumps(career.to_dict())
    row.updated_at = now
    db.commit()


def shop(db: Session, user_id: str, action, now: float) -> tuple:
    """Runs a shop action (career -> answer) and saves when it went through."""
    career = load_career(db, user_id)
    answer = action(career)
    if answer == "ok":
        save_career(db, user_id, career, now)
    return answer, career


# ---- races

def _start(db: Session, stats: dict, now: float, **race_fields) -> ApexDriveRace:
    """A race starting now, with the car's stats (user_id, kind, track_id, seed, week_id)."""
    race = ApexDriveRace(id=str(uuid.uuid4()), stats=json.dumps(stats), started_at=now, claimed=False, **race_fields)
    db.add(race)
    db.commit()
    return race


def _open_race(db: Session, user_id: str, race_id: str, kind: str) -> ApexDriveRace:
    race = db.get(ApexDriveRace, race_id)
    if race is None or race.user_id != user_id or race.kind != kind:
        raise CareerError("unknown_race")
    if race.finished_at is not None:
        raise CareerError("finished")
    return race


def start_race(db: Session, user_id: str, track_id: str, now: float) -> ApexDriveRace:
    career = load_career(db, user_id)
    if not career.is_track_open(track_id):
        raise CareerError("locked")
    return _start(db, career.stats(), now, user_id=user_id, kind=CAREER, track_id=track_id, seed=career.races + 1)


def finish_race(db: Session, user_id: str, race_id: str, result: dict, now: float) -> tuple:
    """Checks and pays a career race: (payout, career)."""
    race = _open_race(db, user_id, race_id, CAREER)
    rules.check_career_race(eco.track(race.track_id), json.loads(race.stats), result, now - race.started_at)
    race.finished_at = now
    career = load_career(db, user_id)
    payout = career.finish_race(race.track_id, result["position"], result.get("bestLap"), result["cash"])
    save_career(db, user_id, career, now)
    return payout, career


# ---- the weekly challenge

def best_run(db: Session, user_id: str, week_id: str) -> ApexDriveRace | None:
    return (db.query(ApexDriveRace)
            .filter(ApexDriveRace.user_id == user_id, ApexDriveRace.kind == CHALLENGE,
                    ApexDriveRace.week_id == week_id, ApexDriveRace.score.isnot(None))
            .order_by(ApexDriveRace.score.desc()).first())


def last_raced_week(db: Session, week_id: str) -> tuple | None:
    """The latest week up to `week_id` with a challenge run, and its track (that of its latest run)."""
    row = (db.query(ApexDriveRace.week_id, ApexDriveRace.track_id)
           .filter(ApexDriveRace.kind == CHALLENGE, ApexDriveRace.week_id <= week_id)
           .order_by(ApexDriveRace.week_id.desc(), ApexDriveRace.started_at.desc()).first())
    return (weekly.week_index(row.week_id), row.track_id) if row else None


def this_week(db: Session, now: float) -> dict:
    """This week's challenge: the track after the last week raced."""
    return weekly.challenge_of(now, last_raced_week(db, weekly.week_of(now)[0]))


def challenge_info(db: Session, user_id: str, now: float) -> dict:
    info = this_week(db, now)
    best = best_run(db, user_id, info["weekId"])
    return {**info, "best": {"time": best.time, "score": best.score} if best else None}


def start_challenge(db: Session, user_id: str, now: float) -> tuple:
    info = this_week(db, now)
    stats = load_career(db, user_id).stats()
    race = _start(db, stats, now, user_id=user_id, kind=CHALLENGE, track_id=info["trackId"], seed=info["seed"],
                  week_id=info["weekId"])
    return race, info


def finish_challenge(db: Session, user_id: str, race_id: str, time: float, best_lap, now: float) -> dict:
    race = _open_race(db, user_id, race_id, CHALLENGE)
    if race.week_id != weekly.week_of(now)[0]:
        raise CareerError("week_over")
    track = eco.track(race.track_id)
    rules.check_challenge_run(track, json.loads(race.stats), time, best_lap, now - race.started_at)
    race.finished_at = now
    race.time = round(time, 3)
    race.score = weekly.score_of(track, race.time)
    db.commit()
    best = best_run(db, user_id, race.week_id)
    return {"raceId": race.id, "score": race.score, "time": race.time, "best": {"time": best.time, "score": best.score}}


def claim_run(db: Session, race_id, score: int, user_id: str | None, now: float) -> str | None:
    """
    A challenge run's score going to the leaderboard: it must be this player's,
    of this week, checked, reported with the same score, and only once.
    Returns why not, or None.
    """
    race = db.get(ApexDriveRace, str(race_id)) if race_id else None
    if race is None or race.kind != CHALLENGE or race.score is None:
        return "no checked challenge run"
    if user_id is not None and race.user_id != user_id:
        return "run of another player"
    if race.week_id != weekly.week_of(now)[0]:
        return "run of another week"
    if race.claimed:
        return "run already counted"
    if race.score != score:
        return "score differs from the checked run"
    race.claimed = True
    db.commit()
    return None
