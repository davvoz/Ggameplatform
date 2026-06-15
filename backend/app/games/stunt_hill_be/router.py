"""
Stunt Hill ranked — WEEK endpoint (mounted at /api/stunt-hill in main.py).

  GET /api/stunt-hill/week    → { week_id, map_index, map_id, map_name, seed }
  GET /api/stunt-hill/health

Scores are NOT stored here: ranked runs go to the platform leaderboard through
the normal session-end flow, validated by app.game_score_validators.
"""

from fastapi import APIRouter

from . import service

router = APIRouter(prefix="/api/stunt-hill", tags=["Stunt Hill Ranked"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "stunt_hill_week"}


@router.get("/week")
async def get_week():
    """The map + seed everyone competes on this week (server-authoritative)."""
    return service.current_week()
