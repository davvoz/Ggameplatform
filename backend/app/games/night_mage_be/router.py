"""
Night Mage API (mounted in main.py).

  GET  /api/night_mage/health
  GET  /api/night_mage/invaders?count=6     other players' invaders for one night
  POST /api/night_mage/invaders             send an invader {kind, wave}       (session)
  POST /api/night_mage/invaders/report      what invaders did in a night {outcomes}
  GET  /api/night_mage/me/invaders          what my invaders did              (session)

Scores reach the leaderboard through the platform's normal session flow.
"""

import random
import time
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app.user_auth import CurrentUserId, get_current_user_id

from . import service

router = APIRouter(prefix="/api/night_mage", tags=["Night Mage"])
limiter = Limiter(key_func=get_remote_address)


def get_now() -> float:
    """The server clock; tests override it."""
    return time.time()


def get_rng() -> random.Random:
    """Randomness for handing out invaders; tests override it."""
    return random.Random()


def optional_user_id(session_token: Annotated[Optional[str], Cookie()] = None) -> Optional[str]:
    """The player, when signed in; anyone may receive invaders."""
    if not session_token:
        return None
    try:
        return get_current_user_id(session_token)
    except HTTPException:
        return None


Db = Annotated[Session, Depends(get_db)]
Now = Annotated[float, Depends(get_now)]
Rng = Annotated[random.Random, Depends(get_rng)]
MaybeUser = Annotated[Optional[str], Depends(optional_user_id)]


class SendRequest(BaseModel):
    kind: Literal["bat", "warrior", "archer", "brawler"]
    wave: int = Field(ge=0, le=10_000)


class OutcomeIn(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    damage: int = Field(ge=0, le=100)
    slain: bool = False
    killedMage: bool = False


class ReportRequest(BaseModel):
    outcomes: list[OutcomeIn] = Field(max_length=service.MAX_HANDED_OUT)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "night_mage_invasions"}


@router.get("/invaders")
@limiter.limit("60/minute")
def get_invaders(request: Request, db: Db, now: Now, rng: Rng, viewer: MaybeUser,
                 count: Annotated[int, Query(ge=0, le=service.MAX_HANDED_OUT)] = 6):
    return {"invaders": service.hand_out(db, viewer, count, now, rng)}


@router.post("/invaders")
@limiter.limit("20/minute")
def send_invader(request: Request, body: SendRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        invader = service.send(db, user_id, body.kind, body.wave, now)
    except service.InvasionError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, error.code) from error
    return {"invader": {"id": invader.id, "kind": invader.kind, "level": invader.level, "expires_at": invader.expires_at}}


@router.post("/invaders/report")
@limiter.limit("30/minute")
def report_outcomes(request: Request, body: ReportRequest, db: Db):
    outcomes = [service.Outcome(o.id, o.damage, o.slain, o.killedMage) for o in body.outcomes]
    return {"counted": service.record(db, outcomes)}


@router.get("/me/invaders")
def my_invaders(user_id: CurrentUserId, db: Db, now: Now):
    return service.inbox(db, user_id, now)
