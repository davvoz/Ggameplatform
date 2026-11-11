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
  GET  /api/hexforge/me/defenses               raids on your city, newest first
  POST /api/hexforge/me/defenses/seen          mark them all as read
  GET  /api/hexforge/me/defenses/{id}/replay   watch a raid on your city
  POST /api/hexforge/me/defenses/{id}/revenge  scout the raider
  POST /api/hexforge/me/rewards/login          today's reward of the 7-day calendar
  POST /api/hexforge/me/rewards/tasks/{id}/claim   a finished daily task
  POST /api/hexforge/me/rewards/chest          the weekly chest
  POST /api/hexforge/me/bonuses/use            spend a bonus on a job, a hero or the energy
  POST /api/hexforge/me/heroes/{id}/evolve     send a hero to the forge to evolve or ascend
  POST /api/hexforge/me/buildings/{id}/upgrade send a building type to the forge to gain a level
  POST /api/hexforge/me/heroes/{id}/dismiss    let a hero go for a bonus, freeing its slot
  POST /api/hexforge/me/heroes/{id}/explore    send an Explorer on a mission
  POST /api/hexforge/me/heroes/{id}/return     bring an Explorer home with its loot
  POST /api/hexforge/me/heroes/{id}/equip      give a hero an item from the armoury
  POST /api/hexforge/me/items/{id}/unequip     put an item back in the armoury
  POST /api/hexforge/me/items/{id}/upgrade     send an item to the forge to gain a level

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
from .schemas import (
    AimRequest, AttackRequest, BattleRequest, BonusRequest, CollectRequest, EquipRequest, EvolveRequest, ExploreRequest, ForgeRequest, UpgradeRequest,
    MoveRequest, PlaceRequest,
)
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
    service = PlayerService(db)
    state = service.load(user_id, now)
    return {"name": service.names([user_id])[user_id], **public_state(state, now)}


@router.post("/me/collect")
def collect_materials(body: CollectRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, gained, earned = PlayerService(db).collect(user_id, now, body.building_ids)
    except StaleState as error:
        raise _http_error(error) from error
    return {"gained": gained, **earned, **public_state(state, now)}


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



# ── defence log ────────────────────────────────────────────────────────
@router.get("/me/defenses")
def defense_log(user_id: CurrentUserId, db: Db, now: Now):
    return PlayerService(db).defense_log(user_id, now)


@router.post("/me/defenses/seen")
def mark_defenses_seen(user_id: CurrentUserId, db: Db):
    PlayerService(db).mark_defenses_seen(user_id)
    return {"ok": True}


@router.get("/me/defenses/{raid_id}/replay")
@limiter.limit("30/minute")
def defense_replay(request: Request, raid_id: int, user_id: CurrentUserId, db: Db):
    try:
        return PlayerService(db).defense_replay(user_id, raid_id)
    except ActionError as error:
        raise _http_error(error) from error


@router.post("/me/defenses/{raid_id}/revenge")
def revenge(raid_id: int, user_id: CurrentUserId, db: Db, now: Now):
    service = PlayerService(db)
    try:
        state = service.revenge(user_id, raid_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return _attack_screen(service, state, now)


# ── rewards and bonuses ────────────────────────────────────────────────
@router.post("/me/rewards/login")
def claim_login_reward(user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, got = PlayerService(db).claim_login(user_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"got": got, **public_state(state, now)}


@router.post("/me/rewards/tasks/{task_id}/claim")
def claim_task_reward(task_id: str, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, got = PlayerService(db).claim_task(user_id, task_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"got": got, **public_state(state, now)}


@router.post("/me/rewards/chest")
def claim_weekly_chest(user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, got = PlayerService(db).claim_chest(user_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"got": got, **public_state(state, now)}


@router.post("/me/bonuses/use")
def use_bonus(body: BonusRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, used = PlayerService(db).use_bonus(user_id, body.bonus, now, job_id=body.job_id,
                                                  hero_id=body.hero_id, energy=body.energy)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {"used": used, **public_state(state, now)}


@router.post("/me/heroes/{hero_id}/evolve")
def evolve_hero(hero_id: int, body: EvolveRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).evolve_hero(user_id, hero_id, body.form, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/buildings/{building_id}/upgrade")
def upgrade_building(building_id: int, body: UpgradeRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).upgrade_building(user_id, building_id, body.path, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/heroes/{hero_id}/dismiss")
def dismiss_hero(hero_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, gift = PlayerService(db).dismiss_hero(user_id, hero_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {**public_state(state, now), "gift": gift}


@router.post("/me/heroes/{hero_id}/explore")
def explore(hero_id: int, body: ExploreRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).explore(user_id, hero_id, body.mission, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/heroes/{hero_id}/return")
def explorer_return(hero_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state, loot = PlayerService(db).explorer_return(user_id, hero_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return {**public_state(state, now), "loot": loot}


# ── items ──────────────────────────────────────────────────────────────
@router.post("/me/heroes/{hero_id}/equip")
def equip_item(hero_id: int, body: EquipRequest, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).equip_item(user_id, hero_id, body.item_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/items/{item_id}/unequip")
def unequip_item(item_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).unequip_item(user_id, item_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)


@router.post("/me/items/{item_id}/upgrade")
def upgrade_item(item_id: int, user_id: CurrentUserId, db: Db, now: Now):
    try:
        state = PlayerService(db).upgrade_item(user_id, item_id, now)
    except (ActionError, StaleState) as error:
        raise _http_error(error) from error
    return public_state(state, now)
