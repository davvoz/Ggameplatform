"""
Rainbow Rush: Stormrun — WEEK endpoint (mounted at /api/stormrun in main.py).

  GET /api/stormrun/week   → { week_id, seed }
  GET /api/stormrun/health
"""

from fastapi import APIRouter

from . import service

router = APIRouter(prefix="/api/stormrun", tags=["Stormrun"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "stormrun_week"}


@router.get("/week")
async def get_week():
    """The seed of the course everyone runs this week."""
    return service.current_week()
