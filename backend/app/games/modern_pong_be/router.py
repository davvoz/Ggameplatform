"""
Modern Pong Multiplayer WebSocket Router

Host-authoritative real-time game sessions with room matchmaking and coin betting.
"""

import uuid
import random
import asyncio
from typing import Dict, Optional
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws/modern-pong", tags=["modern-pong-multiplayer"])


# =============================================================================
# Room & Manager
# =============================================================================

class GameRoom:
    """A multiplayer Pong room — two players, host runs physics."""

    def __init__(self, room_code: str, host_id: str, host_name: str,
                 bet_amount: int = 0, rounds_to_win: int = 3,
                 stage_id: str = "default"):
        self.room_code = room_code
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id: Optional[str] = None
        self.guest_name: Optional[str] = None
        self.bet_amount = bet_amount
        self.rounds_to_win = rounds_to_win
        self.stage_id = stage_id
        self.connections: Dict[str, WebSocket] = {}
        self.created_at = datetime.now()
        self.host_char: Optional[str] = None
        self.guest_char: Optional[str] = None
        self.rematch_requests: set = set()

    @property
    def is_full(self) -> bool:
        return self.guest_id is not None

    @property
    def is_ready(self) -> bool:
        return len(self.connections) == 2

    def add_guest(self, guest_id: str, guest_name: str):
        self.guest_id = guest_id
        self.guest_name = guest_name

    async def broadcast(self, message: dict, exclude: str = None):
        for player_id, ws in list(self.connections.items()):
            if player_id != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to(self, player_id: str, message: dict):
        ws = self.connections.get(player_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass


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

    def create_room(self, host_id: str, host_name: str,
                    bet_amount: int = 0, rounds_to_win: int = 3,
                    stage_id: str = "default") -> GameRoom:
        code = self.generate_room_code()
        room = GameRoom(code, host_id, host_name, bet_amount, rounds_to_win, stage_id)
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

                room = room_manager.create_room(player_id, username, bet, rounds, stage_id)
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

                # Notify host that a player joined
                await room.send_to(room.host_id, {
                    "type": "playerJoined",
                    "username": username,
                })

                # Send room info to guest
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

                    # Notify opponent that this player is ready
                    await current_room.broadcast({
                        "type": "opponentReady",
                    }, exclude=player_id)

                    # If both have selected, send bothReady to each
                    if current_room.host_char and current_room.guest_char:
                        await current_room.send_to(current_room.host_id, {
                            "type": "bothReady",
                            "opponentCharId": current_room.guest_char,
                        })
                        await current_room.send_to(current_room.guest_id, {
                            "type": "bothReady",
                            "opponentCharId": current_room.host_char,
                        })

            # ----------------------------------------------------------
            # Relay: game state from host → guest  (host-authoritative)
            # ----------------------------------------------------------
            elif msg_type == "gameState":
                if current_room and player_id == current_room.host_id:
                    await current_room.broadcast(data, exclude=player_id)

            # ----------------------------------------------------------
            # Relay: input from guest → host
            # ----------------------------------------------------------
            elif msg_type == "input":
                if current_room and player_id != current_room.host_id:
                    await current_room.send_to(current_room.host_id, {
                        "type": "guestInput",
                        "dx": data.get("dx", 0),
                        "dy": data.get("dy", 0),
                    })

            # ----------------------------------------------------------
            # Goal scored (from host)
            # ----------------------------------------------------------
            elif msg_type == "goal":
                if current_room and player_id == current_room.host_id:
                    await current_room.broadcast(data, exclude=player_id)

            # ----------------------------------------------------------
            # Power-up collected (from host)
            # ----------------------------------------------------------
            elif msg_type == "powerUpCollected":
                if current_room and player_id == current_room.host_id:
                    await current_room.broadcast(data, exclude=player_id)

            # ----------------------------------------------------------
            # Rematch request
            # ----------------------------------------------------------
            elif msg_type == "rematch":
                if current_room:
                    current_room.rematch_requests.add(player_id)
                    if len(current_room.rematch_requests) >= 2:
                        # Both agreed — reset chars NOW, then notify
                        current_room.host_char = None
                        current_room.guest_char = None
                        current_room.rematch_requests.clear()
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
        pass
    finally:
        if current_room:
            current_room.connections.pop(player_id, None)
            await current_room.broadcast({
                "type": "opponentLeft",
            }, exclude=player_id)
            if not current_room.connections:
                room_manager.remove_room(current_room.room_code)
