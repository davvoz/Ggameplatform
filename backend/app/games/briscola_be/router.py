"""
Briscola Multiplayer WebSocket Router

Handles real-time multiplayer game sessions for Briscola.
"""

import json
import uuid
import random
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter(prefix="/ws/briscola", tags=["briscola-multiplayer"])


# =============================================================================
# Game State Models
# =============================================================================

class Card:
    """Represents a playing card"""
    
    SUITS = ['denari', 'coppe', 'bastoni', 'spade']
    VALUES = list(range(1, 11))
    POINTS = {1: 11, 3: 10, 10: 4, 9: 3, 8: 2, 2: 0, 4: 0, 5: 0, 6: 0, 7: 0}
    STRENGTH = {1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1}
    
    def __init__(self, suit: str, value: int):
        self.suit = suit
        self.value = value
        self.id = f"{suit}_{value}"
    
    @property
    def points(self) -> int:
        return self.POINTS.get(self.value, 0)
    
    @property
    def strength(self) -> int:
        return self.STRENGTH.get(self.value, 0)
    
    def to_dict(self) -> dict:
        return {"suit": self.suit, "value": self.value, "id": self.id}
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Card':
        return cls(data['suit'], data['value'])


class Deck:
    """Manages the card deck"""
    
    def __init__(self):
        self.cards: List[Card] = []
        self.reset()
    
    def reset(self):
        self.cards = []
        for suit in Card.SUITS:
            for value in Card.VALUES:
                self.cards.append(Card(suit, value))
    
    def shuffle(self):
        random.shuffle(self.cards)
    
    def draw(self) -> Optional[Card]:
        return self.cards.pop() if self.cards else None
    
    def draw_multiple(self, count: int) -> List[Card]:
        return [self.draw() for _ in range(min(count, len(self.cards)))]
    
    def peek_bottom(self) -> Optional[Card]:
        return self.cards[0] if self.cards else None
    
    def take_bottom(self) -> Optional[Card]:
        return self.cards.pop(0) if self.cards else None
    
    @property
    def remaining(self) -> int:
        return len(self.cards)


class GameState:
    """Manages the state of a Briscola game"""
    
    def __init__(self, player1_id: str, player2_id: str):
        self.player1_id = player1_id
        self.player2_id = player2_id
        
        self.deck = Deck()
        self.deck.shuffle()
        
        self.player1_hand: List[Card] = []
        self.player2_hand: List[Card] = []
        self.player1_captured: List[Card] = []
        self.player2_captured: List[Card] = []
        
        self.player1_score = 0
        self.player2_score = 0
        
        self.briscola: Optional[Card] = None
        self.briscola_suit: Optional[str] = None
        
        self.current_player_id: str = ""
        self.first_player_in_round: str = ""
        self.played_card_1: Optional[Card] = None
        self.played_card_2: Optional[Card] = None
        self.round_lead_suit: Optional[str] = None
        
        self.is_game_over = False
        self.winner_id: Optional[str] = None
    
    def initialize(self):
        """Initialize the game"""
        # Deal cards
        self.player1_hand = self.deck.draw_multiple(3)
        self.player2_hand = self.deck.draw_multiple(3)
        
        # Set briscola
        self.briscola = self.deck.peek_bottom()
        self.briscola_suit = self.briscola.suit if self.briscola else None
        
        # Random first player
        self.current_player_id = random.choice([self.player1_id, self.player2_id])
        self.first_player_in_round = self.current_player_id
    
    def get_hand(self, player_id: str) -> List[Card]:
        if player_id == self.player1_id:
            return self.player1_hand
        return self.player2_hand
    
    def get_opponent_id(self, player_id: str) -> str:
        return self.player2_id if player_id == self.player1_id else self.player1_id
    
    def play_card(self, player_id: str, card_id: str) -> dict:
        """Play a card and return the result"""
        if player_id != self.current_player_id:
            return {"success": False, "error": "Not your turn"}
        
        hand = self.get_hand(player_id)
        card = next((c for c in hand if c.id == card_id), None)
        
        if not card:
            return {"success": False, "error": "Card not in hand"}
        
        # Remove from hand
        hand.remove(card)
        
        if self.played_card_1 is None:
            # First card of round
            self.played_card_1 = card
            self.round_lead_suit = card.suit
            self.first_player_in_round = player_id
            self.current_player_id = self.get_opponent_id(player_id)
            
            return {
                "success": True,
                "round_complete": False,
                "card": card.to_dict(),
                "next_player": self.current_player_id
            }
        else:
            # Second card - resolve round
            self.played_card_2 = card
            result = self._resolve_round()
            return result
    
    def _resolve_round(self) -> dict:
        """Resolve the current round"""
        card1 = self.played_card_1
        card2 = self.played_card_2
        
        # Determine winner
        winner_id = self._determine_round_winner(card1, card2)
        points = card1.points + card2.points
        
        # Award points
        if winner_id == self.player1_id:
            self.player1_score += points
            self.player1_captured.extend([card1, card2])
        else:
            self.player2_score += points
            self.player2_captured.extend([card1, card2])
        
        # Draw new cards
        self._draw_cards(winner_id)
        
        # Clear table
        played_1 = card1.to_dict()
        played_2 = card2.to_dict()
        self.played_card_1 = None
        self.played_card_2 = None
        self.round_lead_suit = None
        
        # Winner starts next round
        self.current_player_id = winner_id
        self.first_player_in_round = winner_id
        
        # Check game over
        if len(self.player1_hand) == 0 and len(self.player2_hand) == 0:
            # Ricalcola i punteggi dalle carte catturate per sicurezza
            calculated_p1 = sum(c.points for c in self.player1_captured)
            calculated_p2 = sum(c.points for c in self.player2_captured)
            
            print(f"[Briscola] Final score verification - P1: {self.player1_score} (calculated: {calculated_p1}), P2: {self.player2_score} (calculated: {calculated_p2})")
            
            # Usa i punteggi calcolati
            self.player1_score = calculated_p1
            self.player2_score = calculated_p2
            
            self._end_game()
        
        return {
            "success": True,
            "round_complete": True,
            "card": played_2,
            "round_winner": winner_id,
            "points_won": points,
            "player1_score": self.player1_score,
            "player2_score": self.player2_score,
            "is_game_over": self.is_game_over,
            "game_winner": self.winner_id,
            "next_player": self.current_player_id
        }
    
    def _determine_round_winner(self, card1: Card, card2: Card) -> str:
        """Determine who wins the round"""
        # Card2 is played second
        is_card1_briscola = card1.suit == self.briscola_suit
        is_card2_briscola = card2.suit == self.briscola_suit
        
        if is_card2_briscola and not is_card1_briscola:
            return self.get_opponent_id(self.first_player_in_round)
        elif is_card1_briscola and not is_card2_briscola:
            return self.first_player_in_round
        elif is_card1_briscola and is_card2_briscola:
            if card2.strength > card1.strength:
                return self.get_opponent_id(self.first_player_in_round)
            return self.first_player_in_round
        else:
            # Neither is briscola
            if card2.suit == card1.suit and card2.strength > card1.strength:
                return self.get_opponent_id(self.first_player_in_round)
            return self.first_player_in_round
    
    def _draw_cards(self, winner_id: str):
        """Draw cards after round (winner draws first)"""
        loser_id = self.get_opponent_id(winner_id)
        
        # No cards left to draw
        if self.deck.remaining == 0:
            return
        
        # Winner draws first
        if self.deck.remaining > 0:
            card = self.deck.draw()
            if card:
                self.get_hand(winner_id).append(card)
                print(f"[Briscola] Winner {winner_id} drew {card.id}")
        
        # Loser draws second
        if self.deck.remaining > 0:
            card = self.deck.draw()
            if card:
                self.get_hand(loser_id).append(card)
                print(f"[Briscola] Loser {loser_id} drew {card.id}")
        
        # Clear briscola reference when deck is empty
        if self.deck.remaining == 0:
            self.briscola = None
    
    def _end_game(self):
        """End the game and determine winner"""
        self.is_game_over = True
        
        if self.player1_score > self.player2_score:
            self.winner_id = self.player1_id
        elif self.player2_score > self.player1_score:
            self.winner_id = self.player2_id
        else:
            self.winner_id = None  # Draw
    
    def get_state_for_player(self, player_id: str) -> dict:
        """Get game state from a player's perspective"""
        hand = self.get_hand(player_id)
        opponent_hand_count = len(self.player2_hand if player_id == self.player1_id else self.player1_hand)
        
        return {
            "your_hand": [c.to_dict() for c in hand],
            "opponent_card_count": opponent_hand_count,
            "briscola": self.briscola.to_dict() if self.briscola else None,
            "briscola_suit": self.briscola_suit,
            "deck_remaining": self.deck.remaining + (1 if self.briscola else 0),
            "your_score": self.player1_score if player_id == self.player1_id else self.player2_score,
            "opponent_score": self.player2_score if player_id == self.player1_id else self.player1_score,
            "is_your_turn": self.current_player_id == player_id,
            "played_card_1": self.played_card_1.to_dict() if self.played_card_1 else None,
            "played_card_2": self.played_card_2.to_dict() if self.played_card_2 else None,
            "is_game_over": self.is_game_over,
            "winner": self.winner_id
        }


# =============================================================================
# Room Management
# =============================================================================

class GameRoom:
    """Represents a multiplayer game room"""
    
    def __init__(self, room_code: str, host_id: str, host_name: str):
        self.room_code = room_code
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id: Optional[str] = None
        self.guest_name: Optional[str] = None
        self.game: Optional[GameState] = None
        self.connections: Dict[str, WebSocket] = {}
        self.created_at = datetime.now()
    
    @property
    def is_full(self) -> bool:
        return self.guest_id is not None
    
    @property
    def is_ready(self) -> bool:
        return len(self.connections) == 2
    
    def add_guest(self, guest_id: str, guest_name: str):
        self.guest_id = guest_id
        self.guest_name = guest_name
    
    def start_game(self):
        self.game = GameState(self.host_id, self.guest_id)
        self.game.initialize()
    
    def get_opponent_name(self, player_id: str) -> str:
        if player_id == self.host_id:
            return self.guest_name or "Guest"
        return self.host_name
    
    async def broadcast(self, message: dict, exclude: str = None):
        for player_id, ws in self.connections.items():
            if player_id != exclude:
                try:
                    await ws.send_json(message)
                except:
                    pass


class RoomManager:
    """Manages all game rooms"""
    
    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}
    
    def generate_room_code(self) -> str:
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            code = ''.join(random.choices(chars, k=4))
            if code not in self.rooms:
                return code
    
    def create_room(self, host_id: str, host_name: str) -> GameRoom:
        code = self.generate_room_code()
        room = GameRoom(code, host_id, host_name)
        self.rooms[code] = room
        return room
    
    def get_room(self, code: str) -> Optional[GameRoom]:
        return self.rooms.get(code.upper())
    
    def remove_room(self, code: str):
        if code in self.rooms:
            del self.rooms[code]
    
    def cleanup_old_rooms(self, max_age_minutes: int = 30):
        now = datetime.now()
        to_remove = []
        for code, room in self.rooms.items():
            age = (now - room.created_at).total_seconds() / 60
            if age > max_age_minutes and not room.game:
                to_remove.append(code)
        for code in to_remove:
            del self.rooms[code]


# Global room manager
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
            
            if msg_type == "createRoom":
                username = data.get("username", "Player")
                room = room_manager.create_room(player_id, username)
                room.connections[player_id] = websocket
                current_room = room
                
                await websocket.send_json({
                    "type": "roomCreated",
                    "roomCode": room.room_code,
                    "playerId": player_id
                })
            
            elif msg_type == "joinRoom":
                room_code = data.get("roomCode", "").upper()
                username = data.get("username", "Player")
                
                room = room_manager.get_room(room_code)
                
                if not room:
                    await websocket.send_json({
                        "type": "error",
                        "code": "ROOM_NOT_FOUND",
                        "message": "Stanza non trovata"
                    })
                    continue
                
                if room.is_full:
                    await websocket.send_json({
                        "type": "error",
                        "code": "ROOM_FULL",
                        "message": "Stanza piena"
                    })
                    continue
                
                room.add_guest(player_id, username)
                room.connections[player_id] = websocket
                current_room = room
                
                # Notify host
                await room.broadcast({
                    "type": "playerJoined",
                    "username": username,
                    "playerId": player_id
                }, exclude=player_id)
                
                # Send confirmation to guest
                await websocket.send_json({
                    "type": "playerJoined",
                    "username": room.host_name,
                    "playerId": player_id
                })
                
                # Start game
                room.start_game()
                
                print(f"[Briscola WS] Game started - current_player: {room.game.current_player_id}")
                
                # Send game start to both players
                for pid, ws in room.connections.items():
                    opponent_name = room.get_opponent_name(pid)
                    state = room.game.get_state_for_player(pid)
                    
                    print(f"[Briscola WS] Sending gameStart to {pid}: is_your_turn={state['is_your_turn']}")
                    
                    await ws.send_json({
                        "type": "gameStart",
                        "opponentName": opponent_name,
                        "gameState": state
                    })
            
            elif msg_type == "playCard":
                if not current_room or not current_room.game:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Nessuna partita in corso"
                    })
                    continue
                
                card_id = data.get("card", {}).get("id")
                if not card_id:
                    continue
                
                result = current_room.game.play_card(player_id, card_id)
                
                if not result.get("success"):
                    await websocket.send_json({
                        "type": "error",
                        "message": result.get("error", "Errore")
                    })
                    continue
                
                # Broadcast card played to all players with their specific turn info
                for pid, ws in current_room.connections.items():
                    is_next = result.get("next_player") == pid
                    print(f"[Briscola WS] Sending cardPlayed to {pid}: isYourTurn={is_next}, next_player={result.get('next_player')}")
                    await ws.send_json({
                        "type": "cardPlayed",
                        "playerId": player_id,
                        "card": result.get("card"),
                        "roundComplete": result.get("round_complete", False),
                        "isYourTurn": is_next
                    })
                
                if result.get("round_complete"):
                    # Send round result
                    await current_room.broadcast({
                        "type": "roundEnd",
                        "winner": result.get("round_winner"),
                        "points": result.get("points_won"),
                        "player1Score": result.get("player1_score"),
                        "player2Score": result.get("player2_score")
                    })
                    
                    # Send updated hands
                    for pid, ws in current_room.connections.items():
                        state = current_room.game.get_state_for_player(pid)
                        await ws.send_json({
                            "type": "stateUpdate",
                            "state": state
                        })
                    
                    if result.get("is_game_over"):
                        winner = result.get("game_winner")
                        await current_room.broadcast({
                            "type": "gameEnd",
                            "winner": winner,
                            "player1Score": result.get("player1_score"),
                            "player2Score": result.get("player2_score")
                        })
                        
                        # Cleanup room
                        room_manager.remove_room(current_room.room_code)
            
            elif msg_type == "leave":
                if current_room:
                    await current_room.broadcast({
                        "type": "opponentDisconnected"
                    }, exclude=player_id)
                    room_manager.remove_room(current_room.room_code)
                    current_room = None
    
    except WebSocketDisconnect:
        if current_room:
            # Notify opponent
            await current_room.broadcast({
                "type": "opponentDisconnected"
            }, exclude=player_id)
            room_manager.remove_room(current_room.room_code)
    
    except Exception as e:
        print(f"[Briscola WS] Error: {e}")
        if current_room:
            room_manager.remove_room(current_room.room_code)
