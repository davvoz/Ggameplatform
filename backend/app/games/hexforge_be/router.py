"""
Hexforge: phase-1 battle prototype (mounted in main.py).

  GET  /api/hexforge/health
  GET  /api/hexforge/city/demo   → the test city + unit catalog
  POST /api/hexforge/battle      → simulates an attack on the test city,
                                   returns the replay log and the summary

Nothing is stored yet: every attack hits a fresh copy of the test city.
"""

from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from .catalog import public_catalog
from .demo_city import demo_city
from .schemas import BattleRequest
from .simulation import simulate

router = APIRouter(prefix="/api/hexforge", tags=["Hexforge"])
limiter = Limiter(key_func=get_remote_address)


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
