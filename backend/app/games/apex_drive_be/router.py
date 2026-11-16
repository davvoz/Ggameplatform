"""
Apex Drive API (mounted in main.py). Every career lives here; the game shows
it and asks for every change.

  GET  /api/apex_drive/health
  GET  /api/apex_drive/me                              the career
  GET  /api/apex_drive/me/profile                      my name, Steem name, whether I am ranked
  POST /api/apex_drive/me/parts/{category}             buy the next tier        -> {answer, career}
  POST /api/apex_drive/me/mods/{mod_id}                buy a mod                -> {answer, career}
  PUT  /api/apex_drive/me/fitted   {mods}              fit exactly these mods   -> {answer, career}
  POST /api/apex_drive/me/races    {trackId}           start a career race      -> {raceId, seed}
  POST /api/apex_drive/me/races/{id}/finish  {position, bestLap, cash}          -> {payout, career}
  GET  /api/apex_drive/challenge                       this week's track and my best
  GET  /api/apex_drive/challenge/leaderboard           this week's standings and my place
  POST /api/apex_drive/challenge/races                 start a run              -> {raceId, seed, trackId, weekId, laps}
  POST /api/apex_drive/challenge/races/{id}/finish  {time, bestLap}             -> {score, time, best}

A refused request answers 400 with the rule's code. Challenge scores reach the
leaderboard through the platform's session flow, checked by
app/game_score_validators.py against the run finished here.
"""

import time
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app.user_auth import CurrentUserId

from . import service, standings
from .career import CareerError

router = APIRouter(prefix="/api/apex_drive", tags=["Apex Drive"])
limiter = Limiter(key_func=get_remote_address)

ID = Annotated[str, Field(min_length=1, max_length=40)]


def get_now() -> float:
    """The server clock; tests override it."""
    return time.time()


Db = Annotated[Session, Depends(get_db)]
Now = Annotated[float, Depends(get_now)]


class FittedRequest(BaseModel):
    mods: list[ID] = Field(max_length=12)


class StartRequest(BaseModel):
    trackId: ID


class FinishRequest(BaseModel):
    position: int = Field(ge=1, le=99)
    bestLap: Optional[float] = Field(default=None, gt=0, le=36_000)
    cash: int = Field(ge=0, le=1_000_000)


class RunRequest(BaseModel):
    time: float = Field(gt=0, le=36_000)
    bestLap: Optional[float] = Field(default=None, gt=0, le=36_000)


def _refused(error: CareerError) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, error.code)


def _shop(db: Session, user_id: str, action, now: float) -> dict:
    try:
        answer, career = service.shop(db, user_id, action, now)
    except CareerError as error:
        raise _refused(error) from error
    return {"answer": answer, "career": career.to_dict()}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "apex_drive"}


@router.get("/me")
def my_career(user_id: CurrentUserId, db: Db):
    return {"career": service.load_career(db, user_id).to_dict()}


@router.post("/me/parts/{category}")
@limiter.limit("60/minute")
def buy_part(request: Request, category: str, user_id: CurrentUserId, db: Db, now: Now):
    return _shop(db, user_id, lambda career: career.buy_part(category), now)


@router.post("/me/mods/{mod_id}")
@limiter.limit("60/minute")
def buy_mod(request: Request, mod_id: str, user_id: CurrentUserId, db: Db, now: Now):
    return _shop(db, user_id, lambda career: career.buy_mod(mod_id), now)


@router.put("/me/fitted")
@limiter.limit("120/minute")
def fit_mods(request: Request, body: FittedRequest, user_id: CurrentUserId, db: Db, now: Now):
    return _shop(db, user_id, lambda career: career.set_fitted(body.mods), now)


@router.post("/me/races")
@limiter.limit("30/minute")
def start_race(request: Request, body: StartRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        race = service.start_race(db, user_id, body.trackId, now)
    except CareerError as error:
        raise _refused(error) from error
    return {"raceId": race.id, "seed": race.seed}


@router.post("/me/races/{race_id}/finish")
@limiter.limit("30/minute")
def finish_race(request: Request, race_id: str, body: FinishRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        payout, career = service.finish_race(db, user_id, race_id, body.model_dump(), now)
    except CareerError as error:
        raise _refused(error) from error
    return {"payout": payout, "career": career.to_dict()}


@router.get("/me/profile")
def my_profile(user_id: CurrentUserId, db: Db):
    return standings.profile(db, user_id)


@router.get("/challenge")
def challenge(user_id: CurrentUserId, db: Db, now: Now):
    return service.challenge_info(db, user_id, now)


@router.get("/challenge/leaderboard")
@limiter.limit("60/minute")
def challenge_leaderboard(request: Request, user_id: CurrentUserId, db: Db, now: Now):
    return standings.leaderboard(db, user_id, now)


@router.post("/challenge/races")
@limiter.limit("30/minute")
def start_run(request: Request, user_id: CurrentUserId, db: Db, now: Now):
    race, info = service.start_challenge(db, user_id, now)
    return {"raceId": race.id, "seed": race.seed, "trackId": race.track_id, "weekId": race.week_id, "laps": info["laps"]}


@router.post("/challenge/races/{race_id}/finish")
@limiter.limit("30/minute")
def finish_run(request: Request, race_id: str, body: RunRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        return service.finish_challenge(db, user_id, race_id, body.time, body.bestLap, now)
    except CareerError as error:
        raise _refused(error) from error
