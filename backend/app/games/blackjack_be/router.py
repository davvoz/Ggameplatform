"""
Blackjack Backend Router
Server-authoritative Blackjack game with coin betting.
All game logic runs server-side to prevent cheating.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Annotated, Optional, List, Dict, Any
from sqlalchemy.orm import Session
import random
import time
import logging
import uuid

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService, ValidationError

DbSession = Annotated[Session, Depends(get_db)]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blackjack", tags=["Blackjack"])

# ─── Constants ────────────────────────────────────────────────────────
MIN_BET = 1
MAX_BET = 5000
BLACKJACK_PAYOUT = 2.5   # 3:2 payout for natural blackjack
NORMAL_PAYOUT = 2.0       # 1:1 payout for normal win
INSURANCE_PAYOUT = 3.0    # 2:1 payout for insurance

# ─── Card & Deck Logic ───────────────────────────────────────────────

SUITS = ["hearts", "diamonds", "clubs", "spades"]
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]


def create_deck(num_decks: int = 6) -> List[Dict[str, str]]:
    """Create a shuffled shoe of multiple decks."""
    deck = []
    for _ in range(num_decks):
        for suit in SUITS:
            for rank in RANKS:
                deck.append({"rank": rank, "suit": suit})
    random.shuffle(deck)
    return deck


def card_value(card: Dict[str, str]) -> int:
    """Get the numeric value of a card (Ace = 11, face = 10)."""
    rank = card["rank"]
    if rank in ("J", "Q", "K"):
        return 10
    if rank == "A":
        return 11
    return int(rank)


def hand_value(cards: List[Dict[str, str]]) -> int:
    """Calculate the best hand value, adjusting Aces from 11 to 1 as needed."""
    total = sum(card_value(c) for c in cards)
    aces = sum(1 for c in cards if c["rank"] == "A")
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total


def is_blackjack(cards: List[Dict[str, str]]) -> bool:
    """Check if a hand is a natural blackjack (2 cards, value 21)."""
    return len(cards) == 2 and hand_value(cards) == 21


def is_bust(cards: List[Dict[str, str]]) -> bool:
    """Check if a hand has busted (over 21)."""
    return hand_value(cards) > 21


def is_soft(cards: List[Dict[str, str]]) -> bool:
    """Check if hand is soft (an Ace counts as 11)."""
    total = sum(card_value(c) for c in cards)
    aces = sum(1 for c in cards if c["rank"] == "A")
    # If reducing an ace would still keep us <= 21, the hand is soft
    return aces > 0 and total <= 21


def can_split(cards: List[Dict[str, str]]) -> bool:
    """Check if hand can be split (exactly 2 cards of same value)."""
    return len(cards) == 2 and card_value(cards[0]) == card_value(cards[1])


def card_to_dict(card: Dict[str, str]) -> Dict[str, str]:
    """Serialize a card for the API response."""
    return {"rank": card["rank"], "suit": card["suit"]}


# ─── In-memory game sessions ─────────────────────────────────────────
# Key: game_id, Value: GameSession
active_games: Dict[str, "GameSession"] = {}

# Cleanup old games periodically
MAX_GAME_AGE_SECONDS = 3600  # 1 hour
MAX_ACTIVE_GAMES = 1000


class HandState:
    """State for a single hand (supports splits)."""
    def __init__(self, cards: List[Dict[str, str]], bet: int):
        self.cards = cards
        self.bet = bet
        self.stood = False
        self.doubled = False
        self.surrendered = False
        self.insurance_bet = 0
        self.result: Optional[str] = None   # win, lose, push, blackjack, bust, surrender
        self.payout: int = 0

    def to_dict(self, hide_value: bool = False) -> Dict[str, Any]:
        return {
            "cards": [card_to_dict(c) for c in self.cards],
            "value": hand_value(self.cards) if not hide_value else None,
            "bet": self.bet,
            "stood": self.stood,
            "doubled": self.doubled,
            "surrendered": self.surrendered,
            "is_bust": is_bust(self.cards),
            "is_blackjack": is_blackjack(self.cards),
            "result": self.result,
            "payout": self.payout,
        }


class GameSession:
    """Holds the state of a single Blackjack game."""
    def __init__(self, game_id: str, user_id: str, bet: int):
        self.game_id = game_id
        self.user_id = user_id
        self.initial_bet = bet
        self.created_at = time.time()
        self.status = "playing"  # playing | dealer_turn | resolved
        self.deck: List[Dict[str, str]] = create_deck()
        self.dealer_cards: List[Dict[str, str]] = []
        self.hands: List[HandState] = []
        self.active_hand_index = 0
        self.total_payout = 0
        self.resolved_at: Optional[float] = None

    def deal_card(self) -> Dict[str, str]:
        """Deal a card from the shoe, reshuffling if needed."""
        if len(self.deck) < 20:
            self.deck = create_deck()
        return self.deck.pop()

    def active_hand(self) -> Optional[HandState]:
        """Get the currently active hand."""
        if self.active_hand_index < len(self.hands):
            hand = self.hands[self.active_hand_index]
            if not hand.stood and not is_bust(hand.cards) and not hand.surrendered:
                return hand
        return None

    def advance_hand(self):
        """Move to the next hand (after stand/bust/double)."""
        self.active_hand_index += 1
        # Skip already-resolved hands
        while self.active_hand_index < len(self.hands):
            h = self.hands[self.active_hand_index]
            if not h.stood and not is_bust(h.cards) and not h.surrendered:
                break
            self.active_hand_index += 1

    def all_hands_done(self) -> bool:
        """Check if all player hands are resolved."""
        return all(
            h.stood or is_bust(h.cards) or h.surrendered or is_blackjack(h.cards)
            for h in self.hands
        )

    def to_dict(self, reveal_dealer: bool = False) -> Dict[str, Any]:
        """Serialize the game state for the API."""
        # During play, only show dealer's first card
        if reveal_dealer or self.status == "resolved":
            dealer_cards = [card_to_dict(c) for c in self.dealer_cards]
            dealer_value = hand_value(self.dealer_cards)
        else:
            dealer_cards = [card_to_dict(self.dealer_cards[0]), {"rank": "hidden", "suit": "hidden"}]
            dealer_value = card_value(self.dealer_cards[0])

        return {
            "game_id": self.game_id,
            "status": self.status,
            "dealer": {
                "cards": dealer_cards,
                "value": dealer_value,
                "is_blackjack": is_blackjack(self.dealer_cards) if reveal_dealer or self.status == "resolved" else False,
            },
            "hands": [h.to_dict() for h in self.hands],
            "active_hand_index": self.active_hand_index if self.status == "playing" else None,
            "available_actions": self._get_available_actions(),
            "total_payout": self.total_payout,
            "initial_bet": self.initial_bet,
        }

    def _get_available_actions(self) -> List[str]:
        """Get the available actions for the current hand."""
        if self.status != "playing":
            return []

        hand = self.active_hand()
        if hand is None:
            return []

        actions = ["hit", "stand"]

        # Double down: only on first 2 cards, not after split aces
        if len(hand.cards) == 2 and not hand.doubled:
            actions.append("double")

        # Split: only on first 2 cards of same value, max 4 hands
        if len(hand.cards) == 2 and can_split(hand.cards) and len(self.hands) < 4:
            actions.append("split")

        # Surrender: only on first 2 cards, first hand, no split
        if len(hand.cards) == 2 and len(self.hands) == 1 and not hand.doubled:
            actions.append("surrender")

        # Insurance: only when dealer shows Ace, first 2 cards, no existing insurance
        if (len(hand.cards) == 2
                and self.dealer_cards[0]["rank"] == "A"
                and hand.insurance_bet == 0):
            actions.append("insurance")

        return actions


# ─── Helper ──────────────────────────────────────────────────────────

def get_coin_service(db: Session) -> CoinService:
    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    return CoinService(coins_repo, transaction_repo)


def cleanup_old_games():
    """Remove stale game sessions."""
    now = time.time()
    stale_ids = [
        gid for gid, g in active_games.items()
        if now - g.created_at > MAX_GAME_AGE_SECONDS
    ]
    for gid in stale_ids:
        del active_games[gid]
    if stale_ids:
        logger.info(f"[Blackjack] Cleaned up {len(stale_ids)} stale games")


# ─── Pydantic Schemas ────────────────────────────────────────────────

class DealRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    bet: int = Field(..., ge=MIN_BET, le=MAX_BET)


class ActionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    game_id: str = Field(..., min_length=1)
    action: str = Field(..., pattern="^(hit|stand|double|split|surrender|insurance)$")


class GameStateResponse(BaseModel):
    game_id: str
    status: str
    dealer: Dict[str, Any]
    hands: List[Dict[str, Any]]
    active_hand_index: Optional[int] = None
    available_actions: List[str]
    total_payout: int
    initial_bet: int
    balance: Optional[int] = None


# ─── Dealer Logic ────────────────────────────────────────────────────

def play_dealer(game: GameSession):
    """Dealer draws cards according to standard rules (hit on soft 17)."""
    while hand_value(game.dealer_cards) < 17 or (
        hand_value(game.dealer_cards) == 17 and is_soft(game.dealer_cards)
    ):
        game.dealer_cards.append(game.deal_card())


def _resolve_hand(hand: "HandState", dealer_val: int, dealer_bj: bool, dealer_bust: bool):
    """Set result and payout for a single hand. Returns the payout awarded."""
    if hand.insurance_bet > 0 and dealer_bj:
        hand.payout += hand.insurance_bet * int(INSURANCE_PAYOUT)

    if hand.surrendered:
        hand.result = "surrender"
        hand.payout += hand.bet // 2
        return hand.payout

    if is_bust(hand.cards):
        hand.result = "bust"
        return hand.payout

    if is_blackjack(hand.cards):
        if dealer_bj:
            hand.result = "push"
            hand.payout += hand.bet
        else:
            hand.result = "blackjack"
            hand.payout += int(hand.bet * BLACKJACK_PAYOUT)
        return hand.payout

    if dealer_bj:
        hand.result = "lose"
        return hand.payout

    if dealer_bust:
        hand.result = "win"
        hand.payout += hand.bet * int(NORMAL_PAYOUT)
        return hand.payout

    player_val = hand_value(hand.cards)
    if player_val > dealer_val:
        hand.result = "win"
        hand.payout += hand.bet * int(NORMAL_PAYOUT)
    elif player_val < dealer_val:
        hand.result = "lose"
    else:
        hand.result = "push"
        hand.payout += hand.bet

    return hand.payout


def resolve_hands(game: "GameSession"):
    """Resolve each player hand against the dealer."""
    dealer_val = hand_value(game.dealer_cards)
    dealer_bj = is_blackjack(game.dealer_cards)
    dealer_bust = is_bust(game.dealer_cards)

    game.total_payout = sum(
        _resolve_hand(hand, dealer_val, dealer_bj, dealer_bust)
        for hand in game.hands
    )
    game.status = "resolved"
    game.resolved_at = time.time()


# ─── API Endpoints ───────────────────────────────────────────────────

@router.post("/deal", response_model=GameStateResponse, responses={
    400: {"description": "Insufficient balance or validation error"},
})
async def deal(
    req: DealRequest,
    db: DbSession,
):
    """Start a new Blackjack hand. Deducts the bet from user's balance."""
    cleanup_old_games()

    # Spend coins
    coin_service = get_coin_service(db)
    try:
        transaction = coin_service.spend_coins(
            user_id=req.user_id,
            amount=req.bet,
            transaction_type="blackjack_bet",
            source_id="blackjack",
            description=f"Blackjack bet: {req.bet} coins"
        )
        if transaction is None:
            raise HTTPException(status_code=400, detail="Insufficient balance")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create game
    game_id = str(uuid.uuid4())[:8]
    game = GameSession(game_id, req.user_id, req.bet)

    # Deal initial cards: player, dealer, player, dealer
    player_card1 = game.deal_card()
    dealer_card1 = game.deal_card()
    player_card2 = game.deal_card()
    dealer_card2 = game.deal_card()

    game.dealer_cards = [dealer_card1, dealer_card2]
    player_hand = HandState([player_card1, player_card2], req.bet)
    game.hands = [player_hand]

    # Check for natural blackjacks
    player_bj = is_blackjack(player_hand.cards)
    dealer_bj = is_blackjack(game.dealer_cards)

    if player_bj or dealer_bj:
        # Immediate resolution
        resolve_hands(game)
        # Pay out if player won
        if game.total_payout > 0:
            coin_service.award_coins(
                user_id=req.user_id,
                amount=game.total_payout,
                transaction_type="blackjack_win",
                source_id="blackjack",
                description=f"Blackjack payout: {game.total_payout} coins"
            )
    else:
        active_games[game_id] = game

    # Get updated balance
    balance_data = coin_service.get_user_balance(req.user_id)

    state = game.to_dict(reveal_dealer=(game.status == "resolved"))
    state["balance"] = balance_data["balance"]
    return GameStateResponse(**state)


def _do_hit(game: GameSession, hand: HandState):
    hand.cards.append(game.deal_card())
    if is_bust(hand.cards) or hand_value(hand.cards) == 21:
        hand.stood = True
        game.advance_hand()


def _do_stand(game: GameSession, hand: HandState):
    hand.stood = True
    game.advance_hand()


def _do_double(game: GameSession, hand: HandState, coin_service: CoinService, user_id: str):
    transaction = coin_service.spend_coins(
        user_id=user_id, amount=hand.bet,
        transaction_type="blackjack_double", source_id="blackjack",
        description=f"Blackjack double down: {hand.bet} coins"
    )
    if transaction is None:
        raise HTTPException(status_code=400, detail="Insufficient balance for double down")
    hand.bet *= 2
    hand.doubled = True
    hand.cards.append(game.deal_card())
    hand.stood = True
    game.advance_hand()


def _do_split(game: GameSession, hand: HandState, coin_service: CoinService, user_id: str):
    transaction = coin_service.spend_coins(
        user_id=user_id, amount=game.initial_bet,
        transaction_type="blackjack_split", source_id="blackjack",
        description=f"Blackjack split: {game.initial_bet} coins"
    )
    if transaction is None:
        raise HTTPException(status_code=400, detail="Insufficient balance for split")
    card1, card2 = hand.cards[0], hand.cards[1]
    hand.cards = [card1, game.deal_card()]
    new_hand = HandState([card2, game.deal_card()], game.initial_bet)
    game.hands.insert(game.active_hand_index + 1, new_hand)
    if card1["rank"] == "A":
        hand.stood = True
        new_hand.stood = True
        game.advance_hand()


def _do_surrender(game: GameSession, hand: HandState):
    hand.surrendered = True
    game.advance_hand()


def _do_insurance(hand: HandState, coin_service: CoinService, user_id: str):
    insurance_amount = hand.bet // 2
    transaction = coin_service.spend_coins(
        user_id=user_id, amount=insurance_amount,
        transaction_type="blackjack_insurance", source_id="blackjack",
        description=f"Blackjack insurance: {insurance_amount} coins"
    )
    if transaction is None:
        raise HTTPException(status_code=400, detail="Insufficient balance for insurance")
    hand.insurance_bet = insurance_amount


def _finalize_round(game: GameSession, coin_service: CoinService, user_id: str, game_id: str):
    if not game.all_hands_done():
        return
    game.status = "dealer_turn"
    play_dealer(game)
    resolve_hands(game)
    if game.total_payout > 0:
        coin_service.award_coins(
            user_id=user_id, amount=game.total_payout,
            transaction_type="blackjack_win", source_id="blackjack",
            description=f"Blackjack payout: {game.total_payout} coins"
        )
    active_games.pop(game_id, None)


@router.post("/action", response_model=GameStateResponse, responses={
    400: {"description": "Game already resolved, no active hand, or action not available"},
    403: {"description": "Not your game"},
    404: {"description": "Game not found or expired"},
})
async def action(
    req: ActionRequest,
    db: DbSession,
):
    """Perform a game action (hit, stand, double, split, surrender, insurance)."""
    game = active_games.get(req.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or expired")
    if game.user_id != req.user_id:
        raise HTTPException(status_code=403, detail="Not your game")
    if game.status != "playing":
        raise HTTPException(status_code=400, detail="Game already resolved")

    hand = game.active_hand()
    if hand is None:
        raise HTTPException(status_code=400, detail="No active hand")

    available = game._get_available_actions()
    if req.action not in available:
        raise HTTPException(
            status_code=400,
            detail=f"Action '{req.action}' not available. Available: {available}"
        )

    coin_service = get_coin_service(db)

    _dispatch = {
        "hit":       lambda: _do_hit(game, hand),
        "stand":     lambda: _do_stand(game, hand),
        "double":    lambda: _do_double(game, hand, coin_service, req.user_id),
        "split":     lambda: _do_split(game, hand, coin_service, req.user_id),
        "surrender": lambda: _do_surrender(game, hand),
        "insurance": lambda: _do_insurance(hand, coin_service, req.user_id),
    }
    _dispatch[req.action]()

    _finalize_round(game, coin_service, req.user_id, req.game_id)

    balance_data = coin_service.get_user_balance(req.user_id)
    state = game.to_dict(reveal_dealer=(game.status == "resolved"))
    state["balance"] = balance_data["balance"]
    return GameStateResponse(**state)


@router.get("/state", responses={
    403: {"description": "Not your game"},
    404: {"description": "Game not found or expired"},
})
async def get_game_state(game_id: str, user_id: str):
    """Get current state of an active game."""
    game = active_games.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or expired")
    if game.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your game")

    return game.to_dict()
