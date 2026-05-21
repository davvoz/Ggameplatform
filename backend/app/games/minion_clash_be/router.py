"""
Minion Clash — Deck Persistence Router
======================================

Server-authoritative deck save/load for Minion Clash.

Each user owns exactly MAX_SLOTS deck slots (4 by design).
The server is the single source of truth: it validates roster size,
hero existence, slot range and uniqueness of card IDs.
The client never decides what is a "valid" deck.

This module is intentionally isolated:
    * it knows about decks, slots and cards
    * it does NOT know about XP, rewards, social, achievements
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path as PathParam, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserGameDeck
from app.games.minion_clash_be.simulation.battle_session import BattleSession
from app.games.minion_clash_be.simulation.mp_constants import is_mp_supported

router = APIRouter(prefix="/api/minion-clash", tags=["minion-clash"])
ws_router = APIRouter(prefix="/ws/minion-clash", tags=["minion-clash-multiplayer"])
logger = logging.getLogger("minion_clash")

DbSession = Annotated[Session, Depends(get_db)]

# ─── Game-specific constants (mirror frontend GameConfig.BATTLE) ─────
GAME_ID = "minion_clash"
MAX_SLOTS = 4              # 4 deck slots per user (slot indices 0..3)
ROSTER_SIZE = 10           # GameConfig.BATTLE.ROSTER_SIZE
MAX_NAME_LEN = 32
MAX_CARD_ID_LEN = 64
MAX_HERO_ID_LEN = 64  # used by MP loadout validation only (not deck slots)

# Card / hero catalog is loaded lazily from the static game data.
_CARD_CATALOG: Optional[set[str]] = None
_HERO_CATALOG: Optional[set[str]] = None


def _load_id_set(file_path: Path, root_key: str) -> set[str]:
    """Read a JSON catalog file and return the set of entry IDs.

    Tolerates both ``{root_key: [...]}`` and bare list shapes. Returns an
    empty set on missing file or malformed payload.
    """
    if not file_path.exists():
        return set()
    try:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.warning("[minion_clash] failed to load %s: %s", file_path.name, exc)
        return set()
    items = payload.get(root_key, payload) if isinstance(payload, dict) else payload
    return {
        entry["id"]
        for entry in (items or [])
        if isinstance(entry, dict) and isinstance(entry.get("id"), str)
    }


def _load_catalogs() -> tuple[set[str], set[str]]:
    """Load valid card and hero IDs from the game's static data files.

    Cached after the first successful load. Defensive: missing files
    yield empty sets so deck save never breaks just because data moved.
    """
    global _CARD_CATALOG, _HERO_CATALOG
    if _CARD_CATALOG is not None and _HERO_CATALOG is not None:
        return _CARD_CATALOG, _HERO_CATALOG

    base = Path(__file__).resolve().parent.parent / "minion_clash" / "data"
    _CARD_CATALOG = _load_id_set(base / "cards.json", "cards")
    _HERO_CATALOG = _load_id_set(base / "heroes.json", "heroes")
    return _CARD_CATALOG, _HERO_CATALOG


# ─── Pydantic Schemas ────────────────────────────────────────────────

class DeckSlotIn(BaseModel):
    """Payload for saving a deck into a slot.

    Decks are pure card lists. The hero is chosen at run-time in
    HeroSelectState and is intentionally NOT bound to a saved deck.
    """
    user_id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(default="", max_length=MAX_NAME_LEN)
    card_ids: List[str] = Field(...)

    @field_validator("card_ids")
    @classmethod
    def _validate_cards(cls, v: List[str]) -> List[str]:
        if len(v) != ROSTER_SIZE:
            raise ValueError(f"deck must contain exactly {ROSTER_SIZE} cards")
        if any(not isinstance(c, str) or not c or len(c) > MAX_CARD_ID_LEN for c in v):
            raise ValueError("invalid card id in deck")
        if len(set(v)) != len(v):
            raise ValueError("deck contains duplicate cards")
        return v


class DeckSlotOut(BaseModel):
    slot: int
    name: str
    card_ids: List[str]
    updated_at: Optional[str] = None
    is_empty: bool


class DecksListOut(BaseModel):
    user_id: str
    game_id: str
    max_slots: int
    roster_size: int
    decks: List[DeckSlotOut]


# ─── Helpers ─────────────────────────────────────────────────────────

def _validate_slot(slot: int) -> None:
    if slot < 0 or slot >= MAX_SLOTS:
        raise HTTPException(
            status_code=400,
            detail=f"slot must be in range [0, {MAX_SLOTS - 1}]",
        )


def _validate_user_id(user_id: str) -> str:
    user_id = (user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if len(user_id) > 128:
        raise HTTPException(status_code=400, detail="user_id too long")
    return user_id


def _validate_against_catalog(hero_id: Optional[str], card_ids: List[str]) -> None:
    cards_catalog, heroes_catalog = _load_catalogs()
    if cards_catalog:
        unknown = [c for c in card_ids if c not in cards_catalog]
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=f"unknown card ids: {unknown[:5]}",
            )
    if hero_id and heroes_catalog and hero_id not in heroes_catalog:
        raise HTTPException(status_code=400, detail=f"unknown hero id: {hero_id}")


def _row_to_out(row: Optional[UserGameDeck], slot: int) -> DeckSlotOut:
    if row is None:
        return DeckSlotOut(
            slot=slot,
            name="",
            card_ids=[],
            updated_at=None,
            is_empty=True,
        )
    data = row.to_dict()
    return DeckSlotOut(
        slot=row.slot,
        name=data["name"],
        card_ids=data["card_ids"],
        updated_at=data["updated_at"],
        is_empty=False,
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_ERROR_400 = {"description": "Invalid request (slot, user_id, deck content or catalog mismatch)."}
_ERROR_500 = {"description": "Internal error while persisting the deck."}


# ─── Endpoints ─────────────────────────────────────────────

@router.get("/decks", responses={400: _ERROR_400})
def list_decks(user_id: str, db: DbSession) -> DecksListOut:
    """Return all MAX_SLOTS slots for the user. Missing slots come back empty."""
    uid = _validate_user_id(user_id)
    rows = (
        db.query(UserGameDeck)
        .filter(UserGameDeck.user_id == uid, UserGameDeck.game_id == GAME_ID)
        .all()
    )
    by_slot = {row.slot: row for row in rows if 0 <= row.slot < MAX_SLOTS}
    decks = [_row_to_out(by_slot.get(i), i) for i in range(MAX_SLOTS)]
    return DecksListOut(
        user_id=uid,
        game_id=GAME_ID,
        max_slots=MAX_SLOTS,
        roster_size=ROSTER_SIZE,
        decks=decks,
    )


@router.put("/decks/{slot}", responses={400: _ERROR_400, 500: _ERROR_500})
def save_deck(
    slot: Annotated[int, PathParam(ge=0, le=MAX_SLOTS - 1)],
    payload: DeckSlotIn,
    db: DbSession,
) -> DeckSlotOut:
    """Upsert a deck into the given slot for the user. Server-validated."""
    _validate_slot(slot)
    uid = _validate_user_id(payload.user_id)
    _validate_against_catalog(None, payload.card_ids)

    row = (
        db.query(UserGameDeck)
        .filter(
            UserGameDeck.user_id == uid,
            UserGameDeck.game_id == GAME_ID,
            UserGameDeck.slot == slot,
        )
        .one_or_none()
    )

    name = (payload.name or f"Deck {slot + 1}").strip()[:MAX_NAME_LEN]
    cards_json = json.dumps(payload.card_ids, separators=(",", ":"))
    now = _now_iso()

    if row is None:
        row = UserGameDeck(
            user_id=uid,
            game_id=GAME_ID,
            slot=slot,
            name=name,
            card_ids=cards_json,
            updated_at=now,
        )
        db.add(row)
    else:
        row.name = name
        row.card_ids = cards_json
        row.updated_at = now

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("[minion_clash] failed to save deck slot=%s user=%s", slot, uid)
        raise HTTPException(status_code=500, detail="failed to save deck") from exc

    db.refresh(row)
    return _row_to_out(row, slot)


@router.delete("/decks/{slot}", status_code=204, response_class=Response, responses={400: _ERROR_400})
def delete_deck(
    slot: Annotated[int, PathParam(ge=0, le=MAX_SLOTS - 1)],
    user_id: str,
    db: DbSession,
) -> Response:
    """Clear a deck slot for the user."""
    _validate_slot(slot)
    uid = _validate_user_id(user_id)

    db.query(UserGameDeck).filter(
        UserGameDeck.user_id == uid,
        UserGameDeck.game_id == GAME_ID,
        UserGameDeck.slot == slot,
    ).delete(synchronize_session=False)
    db.commit()
    # Idempotent: 204 regardless of whether a row existed.
    return Response(status_code=204)


# =============================================================================
# Multiplayer — Real-time WebSocket Relay
# =============================================================================
#
# Briscola-style lightweight relay: the server NEVER simulates the battle.
# Each client runs its own BattleWorld; we just route card-play events
# between the two peers. This module knows nothing about XP, rewards or
# social — only rooms, identity, hero/deck handshake and event forwarding.
#
# Mirror view ("each player sees self at bottom") is handled CLIENT-SIDE
# on the receiver: incoming (x, y) is reflected through arena center.
# The server payload stays opaque/coordinate-agnostic.
# =============================================================================

ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ROOM_CODE_LEN = 4
ROOM_MAX_AGE_MIN = 30
MAX_USERNAME_LEN = 32


def _validate_mp_deck(card_ids: List[str], hero_id: Optional[str]) -> None:
    """Re-use the same catalog/roster validation used by the REST endpoints,
    plus the A2.1 MP-supported subset filter (server-authoritative simulation
    only knows how to simulate this subset)."""
    if not isinstance(card_ids, list) or len(card_ids) != ROSTER_SIZE:
        raise ValueError(f"deck must contain exactly {ROSTER_SIZE} cards")
    if any(not isinstance(c, str) or not c or len(c) > MAX_CARD_ID_LEN for c in card_ids):
        raise ValueError("invalid card id in deck")
    if len(set(card_ids)) != len(card_ids):
        raise ValueError("deck contains duplicate cards")
    unsupported = [c for c in card_ids if not is_mp_supported(c)]
    if unsupported:
        raise ValueError(f"cards not supported in MP yet: {unsupported[:5]}")
    _validate_against_catalog(hero_id, card_ids)


class MultiplayerRoom:
    """A single 1v1 multiplayer room. Holds two peers and their handshake data."""

    def __init__(self, room_code: str, host_id: str, host_name: str):
        self.room_code = room_code
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id: Optional[str] = None
        self.guest_name: Optional[str] = None
        self.host_hero: Optional[str] = None
        self.guest_hero: Optional[str] = None
        self.host_deck: List[str] = []
        self.guest_deck: List[str] = []
        self.connections: Dict[str, WebSocket] = {}
        self.created_at = datetime.now(timezone.utc)
        self.match_started = False
        self.rematch_requests: set = set()
        self.outcomes: Dict[str, str] = {}  # player_id -> 'win'|'lose'|'timeout'
        # Server-authoritative battle simulation (A2.1). One session per match.
        self.session: Optional[BattleSession] = None

    @property
    def is_full(self) -> bool:
        return self.guest_id is not None

    def opponent_of(self, player_id: str) -> Optional[str]:
        if player_id == self.host_id:
            return self.guest_id
        if player_id == self.guest_id:
            return self.host_id
        return None

    def name_of(self, player_id: str) -> str:
        if player_id == self.host_id:
            return self.host_name
        if player_id == self.guest_id:
            return self.guest_name or "Guest"
        return "Player"

    def hero_of(self, player_id: str) -> Optional[str]:
        return self.host_hero if player_id == self.host_id else self.guest_hero

    def deck_of(self, player_id: str) -> List[str]:
        return self.host_deck if player_id == self.host_id else self.guest_deck

    def reset_for_rematch(self) -> None:
        self.match_started = False
        self.rematch_requests.clear()
        self.outcomes.clear()
        # Keep heroes/decks: rematch reuses the same loadouts.

    async def stop_session(self) -> None:
        """Cancel the running BattleSession (if any) and forget it."""
        if self.session is not None:
            try:
                await self.session.stop()
            except Exception:  # noqa: BLE001
                logger.debug("[minion_clash] session stop ignored")
            self.session = None

    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> None:
        for pid, ws in tuple(self.connections.items()):
            if pid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                logger.debug("[minion_clash] broadcast send failed pid=%s", pid)

    async def send_to(self, player_id: str, message: dict) -> None:
        ws = self.connections.get(player_id)
        if not ws:
            return
        try:
            await ws.send_json(message)
        except Exception:
            logger.debug("[minion_clash] send_to failed pid=%s", player_id)


class MultiplayerRoomManager:
    """In-memory registry of active multiplayer rooms."""

    def __init__(self) -> None:
        self.rooms: Dict[str, MultiplayerRoom] = {}

    def generate_room_code(self) -> str:
        while True:
            code = "".join(random.choices(ROOM_CODE_CHARS, k=ROOM_CODE_LEN))
            if code not in self.rooms:
                return code

    def create_room(self, host_id: str, host_name: str) -> MultiplayerRoom:
        code = self.generate_room_code()
        room = MultiplayerRoom(code, host_id, host_name)
        self.rooms[code] = room
        return room

    def get_room(self, code: str) -> Optional[MultiplayerRoom]:
        if not isinstance(code, str):
            return None
        return self.rooms.get(code.upper())

    def remove_room(self, code: str) -> None:
        self.rooms.pop(code, None)

    def cleanup_old_rooms(self) -> None:
        now = datetime.now(timezone.utc)
        stale = [
            code for code, r in self.rooms.items()
            if (now - r.created_at).total_seconds() / 60 > ROOM_MAX_AGE_MIN
            and not r.is_full
        ]
        for code in stale:
            del self.rooms[code]


_mp_manager = MultiplayerRoomManager()


# ─── Handshake helpers ───────────────────────────────────────────────

def _safe_username(raw: object) -> str:
    name = str(raw or "Player").strip()
    return (name[:MAX_USERNAME_LEN] or "Player")


def _extract_loadout(data: dict) -> tuple[Optional[str], List[str]]:
    """Pull (hero_id, card_ids) from a handshake payload, validating shape."""
    hero_id = data.get("heroId")
    if hero_id is not None and not isinstance(hero_id, str):
        raise ValueError("heroId must be a string")
    card_ids = data.get("deckIds") or data.get("cardIds") or []
    if not isinstance(card_ids, list):
        raise ValueError("deckIds must be a list")
    _validate_mp_deck(card_ids, hero_id)
    return hero_id, list(card_ids)


async def _start_match(room: MultiplayerRoom) -> None:
    """Notify both peers that the match begins, then spin up the
    server-authoritative BattleSession that owns the simulation.
    Each peer receives the OPPONENT's loadout for HUD/avatar rendering;
    the actual simulation runs server-side."""
    if room.match_started:
        return
    if room.guest_id is None or room.host_hero is None or room.guest_hero is None:
        return
    room.match_started = True
    seed = random.randint(1, 2**31 - 1)
    for pid in (room.host_id, room.guest_id):
        opp = room.opponent_of(pid) if pid is not None else None
        if pid is None or opp is None:
            continue
        await room.send_to(pid, {
            "type": "matchStart",
            "seed": seed,
            "opponentName": room.name_of(opp),
            "opponentHero": room.hero_of(opp),
            "opponentDeck": room.deck_of(opp),
        })

    # ── Spin up server-authoritative simulation ──────────────────
    async def _broadcast(seat_team: str, message: dict) -> None:
        # 'player' canonical seat = host, 'enemy' canonical seat = guest
        seat_id = room.host_id if seat_team == "player" else room.guest_id
        if seat_id is None:
            return
        await room.send_to(seat_id, message)

    await room.stop_session()
    room.session = BattleSession(
        host_id=room.host_id,
        host_hero_id=room.host_hero,
        host_deck=list(room.host_deck),
        guest_id=room.guest_id,
        guest_hero_id=room.guest_hero,
        guest_deck=list(room.guest_deck),
        broadcast=_broadcast,
        seed=seed,
    )
    room.session.start()


# ─── Message handlers ────────────────────────────────────────────────

async def _mp_create_room(websocket: WebSocket, player_id: str, data: dict,
                          current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    if current_room is not None:
        await websocket.send_json({"type": "error", "code": "ALREADY_IN_ROOM",
                                   "message": "Sei già in una stanza"})
        return current_room
    try:
        hero_id, card_ids = _extract_loadout(data)
    except (ValueError, HTTPException) as exc:
        await websocket.send_json({"type": "error", "code": "INVALID_LOADOUT",
                                   "message": str(getattr(exc, "detail", exc))})
        return None
    username = _safe_username(data.get("username"))
    room = _mp_manager.create_room(player_id, username)
    room.host_hero = hero_id
    room.host_deck = card_ids
    room.connections[player_id] = websocket
    await websocket.send_json({
        "type": "roomCreated",
        "roomCode": room.room_code,
        "playerId": player_id,
    })
    return room


async def _mp_join_room(websocket: WebSocket, player_id: str, data: dict,
                        current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    if current_room is not None:
        await websocket.send_json({"type": "error", "code": "ALREADY_IN_ROOM",
                                   "message": "Sei già in una stanza"})
        return current_room
    code = str(data.get("roomCode") or "").upper().strip()
    room = _mp_manager.get_room(code)
    if not room:
        await websocket.send_json({"type": "error", "code": "ROOM_NOT_FOUND",
                                   "message": "Stanza non trovata"})
        return None
    if room.is_full:
        await websocket.send_json({"type": "error", "code": "ROOM_FULL",
                                   "message": "Stanza piena"})
        return None
    try:
        hero_id, card_ids = _extract_loadout(data)
    except (ValueError, HTTPException) as exc:
        await websocket.send_json({"type": "error", "code": "INVALID_LOADOUT",
                                   "message": str(getattr(exc, "detail", exc))})
        return None
    username = _safe_username(data.get("username"))
    room.guest_id = player_id
    room.guest_name = username
    room.guest_hero = hero_id
    room.guest_deck = card_ids
    room.connections[player_id] = websocket
    await _start_match(room)
    return room


async def _mp_play_card(websocket: WebSocket, player_id: str, data: dict,
                        current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    """Forward the play to the server-authoritative BattleSession.
    The session validates mana/cooldown/zone/slot and emits the resulting
    spawn/event/state to BOTH peers. The legacy direct relay is gone."""
    if not current_room or not current_room.match_started or current_room.session is None:
        return current_room
    try:
        slot = int(data.get("slot"))
        card_id = str(data.get("cardId") or "")
        x = float(data.get("x"))
        y = float(data.get("y"))
    except (TypeError, ValueError):
        await websocket.send_json({"type": "error", "code": "BAD_PLAY_PAYLOAD",
                                   "message": "playCard payload malformed"})
        return current_room
    ok, err = await current_room.session.request_play_card(
        seat_id=player_id, slot=slot, card_id=card_id, x=x, y=y,
    )
    if not ok:
        await websocket.send_json({"type": "playRejected", "code": err, "slot": slot,
                                   "cardId": card_id})
    return current_room


async def _mp_rematch(websocket: WebSocket, player_id: str, data: dict,
                      current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    if not current_room:
        return current_room
    current_room.rematch_requests.add(player_id)
    await current_room.broadcast(
        {"type": "rematchRequested", "playerId": player_id},
        exclude=player_id,
    )
    if len(current_room.rematch_requests) >= 2 and current_room.is_full:
        current_room.reset_for_rematch()
        await _start_match(current_room)
    return current_room


async def _mp_leave(websocket: WebSocket, player_id: str, data: dict,
                    current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    """Forfeit during a match. Stops the running session and emits an
    authoritative 'outcome' (lose for leaver, win for opponent) — same code
    path as a natural match end — so both peers land in ResultState with the
    room intact and rematch handshake usable. The room is NOT destroyed:
    that only happens on real WebSocket disconnect."""
    if not current_room:
        return current_room
    await current_room.stop_session()
    opp_id = current_room.opponent_of(player_id)
    await current_room.send_to(player_id, {
        "type": "outcome", "result": "lose", "reason": "forfeit",
    })
    if opp_id is not None:
        await current_room.send_to(opp_id, {
            "type": "outcome", "result": "win", "reason": "opponent_forfeit",
        })
    return current_room


async def _mp_ping(websocket: WebSocket, player_id: str, data: dict,
                   current_room: Optional[MultiplayerRoom]) -> Optional[MultiplayerRoom]:
    await websocket.send_json({"type": "pong", "t": data.get("t")})
    return current_room


_MP_HANDLERS = {
    "createRoom": _mp_create_room,
    "joinRoom":   _mp_join_room,
    "playCard":   _mp_play_card,
    "rematch":    _mp_rematch,
    "leave":      _mp_leave,
    "ping":       _mp_ping,
}


@ws_router.websocket("")
async def minion_clash_ws_endpoint(websocket: WebSocket) -> None:
    """1v1 real-time multiplayer for Minion Clash — server-authoritative (A2.1).

    Wire protocol (JSON messages):
      Client → Server: createRoom, joinRoom, playCard, rematch, leave, ping
      Server → Client: roomCreated, matchStart, state, event, outcome,
                       playRejected, rematchRequested, opponentDisconnected,
                       error, pong
    """
    await websocket.accept()
    _mp_manager.cleanup_old_rooms()
    player_id = str(uuid.uuid4())
    current_room: Optional[MultiplayerRoom] = None
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            handler = _MP_HANDLERS.get(msg_type)
            if not handler:
                await websocket.send_json({"type": "error", "code": "UNKNOWN_TYPE",
                                           "message": f"unknown message type: {msg_type}"})
                continue
            current_room = await handler(websocket, player_id, data, current_room)
    except WebSocketDisconnect:
        if current_room:
            current_room.connections.pop(player_id, None)
            await current_room.stop_session()
            await current_room.broadcast({"type": "opponentDisconnected"}, exclude=player_id)
            _mp_manager.remove_room(current_room.room_code)
    except Exception as exc:  # pragma: no cover — defensive
        logger.exception("[minion_clash_ws] unexpected error: %s", exc)
        if current_room:
            await current_room.stop_session()
            _mp_manager.remove_room(current_room.room_code)
