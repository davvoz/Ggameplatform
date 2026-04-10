"""
Modern Pong Multiplayer WebSocket Router

Server-authoritative real-time game sessions with room matchmaking
and coin betting.  The server runs the full physics simulation;
both clients are symmetric "input senders / state renderers".
"""

import asyncio
import json
import logging
import uuid
import random
from typing import Dict, Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .game_simulation import GameSimulation

router = APIRouter(prefix="/ws/modern-pong", tags=["modern-pong-multiplayer"])
logger = logging.getLogger("modern_pong")


# =============================================================================
# Room & Manager
# =============================================================================

class GameRoom:
    """A multiplayer Pong room — two players, server runs physics."""

    def __init__(
        self,
        room_code: str,
        host_id: str,
        host_name: str,
        bet_amount: int = 0,
        rounds_to_win: int = 3,
        stage_id: str = "default",
        stage_obstacles: list | None = None,
    ):
        self.room_code = room_code
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id: Optional[str] = None
        self.guest_name: Optional[str] = None
        self.bet_amount = bet_amount
        self.rounds_to_win = rounds_to_win
        self.stage_id = stage_id
        self.stage_obstacles: list = stage_obstacles or []
        self.connections: Dict[str, WebSocket] = {}
        self.created_at = datetime.now()
        self.host_char: Optional[str] = None
        self.guest_char: Optional[str] = None
        self.rematch_requests: set = set()
        self.simulation: Optional[GameSimulation] = None
        self._sim_task: Optional[asyncio.Task] = None

    @property
    def is_full(self) -> bool:
        return self.guest_id is not None

    def get_role(self, player_id: str) -> str:
        """Host = bottom, guest = top."""
        return "bottom" if player_id == self.host_id else "top"

    def add_guest(self, guest_id: str, guest_name: str):
        self.guest_id = guest_id
        self.guest_name = guest_name

    async def broadcast(self, message: dict, exclude: str | None = None):
        """Send *message* to all connected clients (optionally excluding one)."""
        targets = [
            ws for pid, ws in self.connections.items() if pid != exclude
        ]
        if not targets:
            return
        # Serialise once, send the same bytes to every client in parallel
        payload = json.dumps(message, separators=(',', ':'))
        await asyncio.gather(
            *(self._safe_send_text(ws, payload) for ws in targets),
        )

    async def broadcast_raw(self, payload: str):
        """Send a pre-serialised JSON string to all connected clients."""
        if not self.connections:
            return
        await asyncio.gather(
            *(self._safe_send_text(ws, payload)
              for ws in self.connections.values()),
        )

    @staticmethod
    async def _safe_send_text(ws: WebSocket, text: str):
        try:
            await ws.send_text(text)
        except Exception:
            pass

    async def send_to(self, player_id: str, message: dict):
        ws = self.connections.get(player_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    # ── Server-authoritative simulation ──────────────────────────

    def start_game(self):
        """Create and start the authoritative simulation."""
        self.simulation = GameSimulation(
            rounds_to_win=self.rounds_to_win,
            stage_obstacles=self.stage_obstacles,
            event_callback=self._on_simulation_event,
        )
        # Host = bottom character, guest = top character
        self.simulation.setup(
            top_char_id=self.guest_char,
            bottom_char_id=self.host_char,
        )
        self._sim_task = asyncio.create_task(self._run_simulation())

    async def _run_simulation(self):
        """Wrapper that catches unexpected simulation errors."""
        try:
            await self.simulation.run()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Simulation crashed in room %s", self.room_code)

    async def stop_game(self):
        """Gracefully stop the running simulation."""
        if self.simulation:
            self.simulation.stop()
        if self._sim_task and not self._sim_task.done():
            self._sim_task.cancel()
            try:
                await self._sim_task
            except asyncio.CancelledError:
                raise

    async def _on_simulation_event(self, event_type: str, data: dict):
        """Relay simulation events to **both** connected clients.

        Hot-path events (tick) are pre-serialised once and sent as raw
        text to avoid double JSON encoding.
        """
        msg = {"type": event_type, **data}
        payload = json.dumps(msg, separators=(',', ':'))
        await self.broadcast_raw(payload)

    def reset_for_rematch(self):
        self.host_char = None
        self.guest_char = None
        self.rematch_requests.clear()
        self.simulation = None
        self._sim_task = None


class RoomManager:
    """Manages all active Pong rooms."""

    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}

    def generate_room_code(self) -> str:
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            code = "".join(random.choices(chars, k=4))
            if code not in self.rooms:
                return code

    def create_room(
        self,
        host_id: str,
        host_name: str,
        bet_amount: int = 0,
        rounds_to_win: int = 3,
        stage_id: str = "default",
        stage_obstacles: list | None = None,
    ) -> GameRoom:
        code = self.generate_room_code()
        room = GameRoom(
            code, host_id, host_name, bet_amount,
            rounds_to_win, stage_id, stage_obstacles,
        )
        self.rooms[code] = room
        return room

    def get_room(self, code: str) -> Optional[GameRoom]:
        return self.rooms.get(code.upper())

    def remove_room(self, code: str):
        self.rooms.pop(code, None)

    def cleanup_old_rooms(self, max_age_minutes: int = 30):
        now = datetime.now()
        stale = [
            code for code, room in self.rooms.items()
            if (now - room.created_at).total_seconds() / 60 > max_age_minutes
            and not room.is_full
        ]
        for code in stale:
            del self.rooms[code]


room_manager = RoomManager()


# =============================================================================
# WebSocket Endpoint
# =============================================================================

@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    player_id = str(uuid.uuid4())
    current_room: Optional[GameRoom] = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # ----------------------------------------------------------
            # Create room
            # ----------------------------------------------------------
            if msg_type == "createRoom":
                username = str(data.get("username", "Player"))[:32]
                bet = max(0, int(data.get("betAmount", 0)))
                rounds = min(7, max(1, int(data.get("roundsToWin", 3))))
                stage_id = str(data.get("stageId", "default"))[:32]
                obstacles = _sanitize_obstacles(data.get("stageObstacles"))

                room = room_manager.create_room(
                    player_id, username, bet, rounds, stage_id, obstacles,
                )
                room.connections[player_id] = websocket
                current_room = room

                await websocket.send_json({
                    "type": "roomCreated",
                    "roomCode": room.room_code,
                    "playerId": player_id,
                })

            # ----------------------------------------------------------
            # Join room
            # ----------------------------------------------------------
            elif msg_type == "joinRoom":
                room_code = str(data.get("roomCode", "")).upper()[:4]
                username = str(data.get("username", "Player"))[:32]

                room = room_manager.get_room(room_code)

                if not room:
                    await websocket.send_json({
                        "type": "error",
                        "code": "ROOM_NOT_FOUND",
                        "message": "Room not found",
                    })
                    continue

                if room.is_full:
                    await websocket.send_json({
                        "type": "error",
                        "code": "ROOM_FULL",
                        "message": "Room is full",
                    })
                    continue

                room.add_guest(player_id, username)
                room.connections[player_id] = websocket
                current_room = room

                await room.send_to(room.host_id, {
                    "type": "playerJoined",
                    "username": username,
                })

                await websocket.send_json({
                    "type": "joinedRoom",
                    "roomCode": room.room_code,
                    "playerId": player_id,
                    "opponentName": room.host_name,
                    "betAmount": room.bet_amount,
                    "roundsToWin": room.rounds_to_win,
                    "stageId": room.stage_id,
                })

            # ----------------------------------------------------------
            # Character selected (from multiCharSelect screen)
            # ----------------------------------------------------------
            elif msg_type == "charSelected":
                if current_room:
                    char_id = str(data.get("characterId", "blaze"))[:16]

                    if player_id == current_room.host_id:
                        current_room.host_char = char_id
                    else:
                        current_room.guest_char = char_id

                    await current_room.broadcast({
                        "type": "opponentReady",
                    }, exclude=player_id)

                    # Both selected — send bothReady, then start simulation
                    if current_room.host_char and current_room.guest_char:
                        await current_room.send_to(current_room.host_id, {
                            "type": "bothReady",
                            "opponentCharId": current_room.guest_char,
                        })
                        await current_room.send_to(current_room.guest_id, {
                            "type": "bothReady",
                            "opponentCharId": current_room.host_char,
                        })
                        current_room.start_game()

            # ----------------------------------------------------------
            # Ping / pong — RTT measurement
            # ----------------------------------------------------------
            elif msg_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "t": data.get("t", 0),
                })

            # ----------------------------------------------------------
            # Player input → forwarded to simulation
            # ----------------------------------------------------------
            elif msg_type == "input":
                if current_room and current_room.simulation:
                    role = current_room.get_role(player_id)
                    current_room.simulation.apply_input(
                        role,
                        data.get("dx", 0),
                        data.get("dy", 0),
                    )

            # ----------------------------------------------------------
            # Rematch request
            # ----------------------------------------------------------
            elif msg_type == "rematch":
                if current_room:
                    current_room.rematch_requests.add(player_id)
                    if len(current_room.rematch_requests) >= 2:
                        await current_room.stop_game()
                        current_room.reset_for_rematch()
                        await current_room.broadcast({
                            "type": "rematchAccepted",
                        })
                    else:
                        await current_room.broadcast({
                            "type": "rematchRequested",
                            "playerId": player_id,
                        }, exclude=player_id)

            # ----------------------------------------------------------
            # Leave room
            # ----------------------------------------------------------
            elif msg_type == "leave":
                if current_room:
                    await current_room.stop_game()
                    await current_room.broadcast({
                        "type": "opponentLeft",
                    }, exclude=player_id)
                    current_room.connections.pop(player_id, None)
                    if not current_room.connections:
                        room_manager.remove_room(current_room.room_code)
                    current_room = None

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS error for player %s", player_id)
    finally:
        if current_room:
            await current_room.stop_game()
            current_room.connections.pop(player_id, None)
            await current_room.broadcast({
                "type": "opponentLeft",
            }, exclude=player_id)
            if not current_room.connections:
                room_manager.remove_room(current_room.room_code)


# =============================================================================
# Helpers
# =============================================================================

_MAX_OBSTACLES = 10


def _sanitize_obstacles(raw: list | None) -> list[dict]:
    """Validate and clamp obstacle definitions from the client."""
    if not isinstance(raw, list):
        return []
    result = []
    for item in raw[:_MAX_OBSTACLES]:
        if not isinstance(item, dict):
            continue
        try:
            result.append({
                "x": float(item["x"]),
                "y": float(item["y"]),
                "w": max(1, min(200, float(item["w"]))),
                "h": max(1, min(200, float(item["h"]))),
            })
        except (KeyError, TypeError, ValueError):
            continue
    return result
