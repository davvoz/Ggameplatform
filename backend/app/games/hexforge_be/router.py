"""
Hexforge API (mounted in main.py).

  GET  /api/hexforge/health
  GET  /api/hexforge/city/demo                 the test city + unit catalog
  POST /api/hexforge/battle                    attack the test city, get the replay

  GET  /api/hexforge/me                        your saved state (created on first visit)
  POST /api/hexforge/me/collect                collect what production buildings made
  POST /api/hexforge/me/buildings/{id}/move    move one of your buildings

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
from .player_service import ActionError, PlayerService, StaleState, public_state
from .schemas import BattleRequest, CollectRequest, MoveRequest
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
