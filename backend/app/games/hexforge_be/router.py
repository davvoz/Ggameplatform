"""
Hexforge API (mounted in main.py).

  GET  /api/hexforge/health
  GET  /api/hexforge/city/demo                 the test city + unit catalog
  POST /api/hexforge/battle                    attack the test city, get the replay

  GET  /api/hexforge/me                        your saved state (created on first visit)
  POST /api/hexforge/me/collect                collect what production buildings made
  POST /api/hexforge/me/buildings/{id}/move    move one of your buildings
  POST /api/hexforge/me/forge                  start forging a recipe
  POST /api/hexforge/me/forge/{job}/claim      collect a finished job
  POST /api/hexforge/me/place                  place a building from storage
  POST /api/hexforge/me/buildings/{id}/dismantle   remove it, refund half the recipe
  GET  /api/hexforge/me/outposts               computer outposts, progress, energy
  POST /api/hexforge/me/outposts/{id}/attack   attack with 4 of your heroes
  POST /api/hexforge/me/buildings/{id}/aim     which hero a tower shoots first
  POST /api/hexforge/me/defense/test           standard raids against your city
  POST /api/hexforge/me/rivals/find            scout a player to attack
  POST /api/hexforge/me/rivals/attack          attack the scouted player
  GET  /api/hexforge/me/leaderboard            best players by trophies, and your rank

The /me routes need the platform session cookie.
"""

import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app.user_auth import CurrentUserId

from .catalog import public_catalog
from .demo_city import demo_city
from . import outposts
from .player_service import ActionError, PlayerService, StaleState, public_state
from .schemas import AimRequest, AttackRequest, BattleRequest, CollectRequest, ForgeRequest, MoveRequest, PlaceRequest
from .simulation import simulate

router = APIRouter(prefix="/api/hexforge", tags=["Hexforge"])
limiter = Limiter(key_func=get_remote_address)


def get_now() -> float:
    """The server clock; tests override it."""
    return time.time()


Db = Annotated[Session, Depends(get_db)]
Now = Annotated[float, Depends(get_now)]


@router.get("/health")
async def health():
    return {"status": "ok", "service": "hexforge_battle"}


@router.get("/city/demo")
async def get_demo_city():
    return {"city": demo_city(), "catalog": public_catalog()}


@router.post("/battle")
@limiter.limit("60/minute")
async def run_battle(request: Request, body: BattleRequest):
    city = demo_city()
    battle = simulate(city, list(body.squad), body.side, body.priority, body.tactic)
    return {"city": city, "setup": body.model_dump(), **battle}


# ── the player's own city ──────────────────────────────────────────────
def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, StaleState):
        return HTTPException(status.HTTP_409_CONFLICT, "state_changed_retry")
    return HTTPException(status.HTTP_400_BAD_REQUEST, error.code)


@router.get("/me")
def get_my_state(user_id: CurrentUserId, db: Db, now: Now):
    state = PlayerService(db).load(user_id, now)
    return public_state(state, now)


@router.post("/me/collect")
def collect_materials(body: CollectRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, gained = PlayerService(db).collect(user_id, now, body.building_ids)
    except StaleState as error:
        raise _http_error(error) from error
    return {"gained": gained, **public_state(state, now)}


@router.post("/me/buildings/{building_id}/move")
def move_building(building_id: int, body: MoveRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).move_building(user_id, building_id, body.x, body.y, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/forge")
def start_forging(body: ForgeRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).start_forging(user_id, body.recipe, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/forge/{job_id}/claim")
def claim_forged(job_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, claimed = PlayerService(db).claim_forged(user_id, job_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"claimed": claimed, **public_state(state, now)}


@router.post("/me/place")
def place_building(body: PlaceRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).place_building(user_id, body.type, body.x, body.y, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/buildings/{building_id}/dismantle")
def dismantle_building(building_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, refund = PlayerService(db).dismantle_building(user_id, building_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"refund": refund, **public_state(state, now)}


@router.get("/me/outposts")
def list_outposts(user_id: CurrentUserId, db: Db, now: Now):
    service = PlayerService(db)
    state = service.load(user_id, now)
    return _attack_screen(service, state, now)


@router.post("/me/outposts/{outpost_id}/attack")
@limiter.limit("30/minute")
def attack_outpost(request: Request, outpost_id: int, body: AttackRequest,
                   user_id: CurrentUserId, db: Db, now: Now):
    service = PlayerService(db)
    try:
        state, battle = service.attack_outpost(
            user_id, outpost_id, list(body.hero_ids), body.side, body.priority, body.tactic, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"battle": battle, **_attack_screen(service, state, now)}


@router.post("/me/buildings/{building_id}/aim")
def set_tower_aim(building_id: int, body: AimRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).set_aim(user_id, building_id, body.aim, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/defense/test")
@limiter.limit("20/minute")
def run_my_defense_test(request: Request, user_id: CurrentUserId, db: Db, now: Now):
    return PlayerService(db).defense_test(user_id, now)


# ── PvP ────────────────────────────────────────────────────────────────
def _attack_screen(service: PlayerService, state, now: float) -> dict:
    """Everything the Attack tab shows: outposts, the scouted rival, your state."""
    return {"outposts": outposts.public_outposts(state.city), "rival": service.rival_view(state, now),
            **public_state(state, now)}


@router.post("/me/rivals/find")
@limiter.limit("30/minute")
def find_rival(request: Request, user_id: CurrentUserId, db: Db, now: Now):
    service = PlayerService(db)
    try:
        state = service.find_rival(user_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return _attack_screen(service, state, now)


@router.post("/me/rivals/attack")
@limiter.limit("30/minute")
def attack_rival(request: Request, body: AttackRequest, user_id: CurrentUserId, db: Db, now: Now):
    service = PlayerService(db)
    try:
        state, battle = service.attack_rival(
            user_id, list(body.hero_ids), body.side, body.priority, body.tactic, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"battle": battle, **_attack_screen(service, state, now)}


@router.get("/me/leaderboard")
def leaderboard(user_id: CurrentUserId, db: Db, now: Now):
    return PlayerService(db).leaderboard(user_id, now)
