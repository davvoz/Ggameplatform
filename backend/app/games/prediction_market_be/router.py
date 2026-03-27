"""
Prediction Market Backend Router
Manages rounds, BTC price fetching, bet placement, and odds calculation.
Uses Binance public API for BTC price (free, no API key needed).
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Annotated, Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import asyncio
import httpx
import math
import time
import logging
import uuid
import json

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService, ValidationError

DbSession = Annotated[Session, Depends(get_db)]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prediction-market", tags=["Prediction Market"])

# ─── Constants ────────────────────────────────────────────────────────
ROUND_DURATION_SECONDS = 300       # 5 minutes
BETTING_PHASE_SECONDS = 240        # First 4 minutes: bets open
LOCK_PHASE_SECONDS = 60            # Last 1 minute: locked, no new bets
MIN_BET = 1
MAX_BET = 500
HOUSE_EDGE = 0.05                  # 5% house edge
MAX_PAYOUT = 10.0                  # max 10x payout cap
TIME_DECAY_MIN = 0.30              # at end of betting, payouts are 30% of normal

# Volatility model constants
# BTC annualized vol ~60%. We convert to per-second vol for time-based odds.
BTC_ANNUAL_VOL = 0.60
SECONDS_IN_YEAR = 365.25 * 24 * 3600
BTC_VOL_PER_SEC = BTC_ANNUAL_VOL / math.sqrt(SECONDS_IN_YEAR)
# Sensitivity multiplier: amplifies how much small price moves affect odds.
# Real BTC vol on 5-min windows is tiny (~0.02-0.1%), making odds almost always ~50/50.
# This multiplier makes small real-world moves produce more interesting odds swings.
ODDS_SENSITIVITY = 1.0

# ─── In-memory round state ───────────────────────────────────────────
# In production you'd use Redis, but for this single-instance game this is fine.

class RoundState:
    """Holds the state for the current round."""
    def __init__(self):
        self.round_id: Optional[str] = None
        self.start_time: Optional[float] = None
        self.lock_price: Optional[float] = None   # price when round started (target)
        self.close_price: Optional[float] = None
        self.status: str = "waiting"               # waiting | betting | locked | resolved
        self.bets: List[Dict[str, Any]] = []
        self.resolved_at: Optional[float] = None
        self.frozen_odds: Optional[Dict[str, float]] = None  # odds frozen at lock time

    def to_dict(self):
        return {
            "round_id": self.round_id,
            "start_time": self.start_time,
            "lock_price": self.lock_price,
            "close_price": self.close_price,
            "status": self.status,
            "total_bets": len(self.bets),
            "resolved_at": self.resolved_at,
        }

current_round = RoundState()
round_history: List[Dict[str, Any]] = []   # last N resolved rounds
background_tasks: set = set()              # keep strong references to asyncio tasks

# ─── BTC Price Cache & WebSocket ─────────────────────────────────────
_price_cache = {"price": None, "timestamp": 0}

# Global price history buffer (shared across rounds so chart has data on entry)
_price_history: List[Dict[str, Any]] = []   # [{timestamp, price}]
MAX_PRICE_HISTORY = 600  # ~10 min at 1/sec

# WebSocket state
_ws_task = None
_ws_connected = False


def start_btc_websocket():
    """Start the persistent Binance WebSocket connection."""
    global _ws_task
    if _ws_task is None or _ws_task.done():
        _ws_task = asyncio.create_task(_btc_websocket_loop())
        logger.info("[PredictionMarket] Binance WebSocket task created")


async def _btc_websocket_loop():
    """Maintain a persistent WebSocket to Binance for real-time BTC price."""
    global _ws_connected
    import websockets

    ws_url = "wss://stream.binance.com:9443/ws/btcusdt@trade"

    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10) as ws:
                _ws_connected = True
                logger.info("[PredictionMarket] Binance WebSocket connected")
                async for raw in ws:
                    data = json.loads(raw)
                    price = float(data["p"])
                    now = time.time()
                    _price_cache["price"] = price
                    _price_cache["timestamp"] = now
                    # Throttle history to ~1 update/sec
                    if not _price_history or (now - _price_history[-1]["timestamp"]) >= 1.0:
                        _price_history.append({"timestamp": now, "price": price})
                        if len(_price_history) > MAX_PRICE_HISTORY:
                            _price_history.pop(0)
        except Exception as e:
            _ws_connected = False
            logger.warning(f"[PredictionMarket] WebSocket disconnected: {e}. Reconnecting in 3s...")
            await asyncio.sleep(3)


async def get_btc_price() -> float:
    """Get BTC/USDT price. Uses WebSocket-fed cache, falls back to REST."""
    now = time.time()
    # If cache is fresh (WebSocket keeps it updated), return immediately
    if _price_cache["price"] and (now - _price_cache["timestamp"]) < 5:
        return _price_cache["price"]

    # Fallback to REST if WebSocket hasn't provided data yet
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
            resp.raise_for_status()
            price = float(resp.json()["price"])
            _price_cache["price"] = price
            _price_cache["timestamp"] = now
            _price_history.append({"timestamp": now, "price": price})
            if len(_price_history) > MAX_PRICE_HISTORY:
                _price_history.pop(0)
            return price
    except Exception as e:
        logger.error(f"Failed to fetch BTC price via REST: {e}")
        if _price_cache["price"]:
            return _price_cache["price"]
        raise HTTPException(status_code=503, detail="BTC price unavailable")


# ─── Odds Calculation ────────────────────────────────────────────────

def calculate_odds(current_price: float, lock_price: float, seconds_remaining: float) -> Dict[str, float]:
    """
    Calculate dynamic odds for UP / DOWN based on:
    1. Distance of current price from the lock (target) price
    2. Time remaining in the round
    3. Time decay — payouts shrink as betting phase runs out (rewards early bettors)
    
    Uses a simplified Black-Scholes-flavoured probability model.
    Returns payout multipliers for UP and DOWN.
    """
    if seconds_remaining <= 0:
        # Round ended — no more betting
        return {"up": 1.0, "down": 1.0}

    # Price change as a fraction
    price_ratio = current_price / lock_price if lock_price else 1.0
    log_return = math.log(price_ratio) if price_ratio > 0 else 0.0

    # Expected volatility over remaining time
    sigma = BTC_VOL_PER_SEC * math.sqrt(seconds_remaining)

    # Probability that price ends above lock_price (standard normal CDF approx)
    # log_return is amplified by ODDS_SENSITIVITY so small real-world moves
    # produce meaningful odds swings on these short timeframes
    if sigma > 0:
        d = (log_return * ODDS_SENSITIVITY) / sigma
        # Fast CDF approximation (Abramowitz & Stegun)
        prob_up = _norm_cdf(d)
    else:
        prob_up = 1.0 if current_price >= lock_price else 0.0

    prob_down = 1.0 - prob_up

    # Clamp probabilities (no min floor — allow very high prob / low payout)
    prob_up = max(0.02, min(0.98, prob_up))
    prob_down = max(0.02, min(0.98, prob_down))

    # Time fraction: how much betting time is left (1.0 at start → 0.0 at lock)
    betting_time_left = max(0, seconds_remaining - LOCK_PHASE_SECONDS)
    time_fraction = betting_time_left / BETTING_PHASE_SECONDS  # 1.0 → 0.0

    # Dynamic MAX cap: decreases so BOTH odds go down over time
    # Start: MAX_PAYOUT (10x), Lock: 2.0x
    ENDGAME_MAX = 2.0
    max_payout_now = round(ENDGAME_MAX + (MAX_PAYOUT - ENDGAME_MAX) * time_fraction, 2)

    # Dynamic MIN floor: decreases so the favoured side stays interesting early
    # Start: 1.80x, Lock: 1.01x
    EARLY_MIN = 1.80
    FINAL_MIN = 1.01
    min_payout_now = round(FINAL_MIN + (EARLY_MIN - FINAL_MIN) * time_fraction, 2)

    # Profit decay: also linear — multiplies only the profit portion (above 1.0x)
    time_mult = TIME_DECAY_MIN + (1.0 - TIME_DECAY_MIN) * time_fraction

    # Fair payout with house edge (before time decay)
    fair_up = (1.0 / prob_up) * (1.0 - HOUSE_EDGE)
    fair_down = (1.0 / prob_down) * (1.0 - HOUSE_EDGE)

    # Time decay on PROFIT only (the part above 1.0x), not the whole payout.
    payout_up = round(1.0 + (fair_up - 1.0) * time_mult, 2)
    payout_down = round(1.0 + (fair_down - 1.0) * time_mult, 2)

    # Clamp between dynamic floor and dynamic cap
    payout_up = round(max(min_payout_now, min(max_payout_now, payout_up)), 2)
    payout_down = round(max(min_payout_now, min(max_payout_now, payout_down)), 2)

    return {
        "up": payout_up,
        "down": payout_down,
        "prob_up": round(prob_up * 100, 1),
        "prob_down": round(prob_down * 100, 1),
    }


def _norm_cdf(x: float) -> float:
    """Approximation of the standard normal CDF."""
    # Using the logistic approximation: Φ(x) ≈ 1 / (1 + e^(-1.7 * x))
    return 1.0 / (1.0 + math.exp(-1.7 * x))


# ─── Helper: get coin service ────────────────────────────────────────

def get_coin_service(db: Session) -> CoinService:
    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    return CoinService(coins_repo, transaction_repo)


def get_user_id_from_request(request: Request) -> str:
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


# ─── Pydantic Schemas ────────────────────────────────────────────────

class PlaceBetRequest(BaseModel):
    direction: str = Field(..., pattern="^(up|down)$")
    amount: int = Field(..., ge=MIN_BET, le=MAX_BET)
    user_id: str = Field(..., min_length=1)

class PlaceBetResponse(BaseModel):
    bet_id: str
    direction: str
    amount: int
    locked_odds: float
    potential_win: int
    round_id: str

class RoundInfoResponse(BaseModel):
    round_id: Optional[str] = None
    status: str
    lock_price: Optional[float] = None
    current_price: Optional[float] = None
    close_price: Optional[float] = None
    seconds_remaining: Optional[float] = None
    betting_seconds_remaining: Optional[float] = None
    odds: Optional[Dict[str, float]] = None
    total_bets: int
    start_time: Optional[float] = None

class RoundHistoryEntry(BaseModel):
    round_id: str
    lock_price: float
    close_price: float
    result: str  # "up" | "down"
    start_time: float
    resolved_at: float

class UserBetInfo(BaseModel):
    bet_id: str
    round_id: str
    direction: str
    amount: int
    locked_odds: float
    potential_win: int
    result: Optional[str] = None
    won: Optional[bool] = None
    payout: Optional[int] = None


# ─── Round Management ────────────────────────────────────────────────

async def start_new_round():
    """Start a new prediction round."""
    global current_round, _price_history
    
    price = await get_btc_price()
    
    # Clear price history so chart resets each round
    _price_history.clear()
    
    current_round = RoundState()
    current_round.round_id = str(uuid.uuid4())[:8]
    current_round.start_time = time.time()
    current_round.lock_price = price
    current_round.status = "betting"
    current_round.bets = []
    
    logger.info(f"[PredictionMarket] New round {current_round.round_id} started. Lock price: ${price:,.2f}")

    # Schedule round phases (keep reference to prevent premature garbage collection)
    task = asyncio.create_task(_round_lifecycle())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)


async def _round_lifecycle():
    """Manage the round lifecycle: betting -> locked -> resolve."""
    round_id = current_round.round_id
    
    # Wait for betting phase to end
    await asyncio.sleep(BETTING_PHASE_SECONDS)
    
    if current_round.round_id != round_id:
        return  # Round was replaced
    
    current_round.status = "locked"
    # Freeze odds at lock moment
    try:
        lock_price_now = await get_btc_price()
        lock_secs = LOCK_PHASE_SECONDS
        current_round.frozen_odds = calculate_odds(lock_price_now, current_round.lock_price, lock_secs)
    except Exception:
        current_round.frozen_odds = {"up": 2.0, "down": 2.0, "prob_up": 50.0, "prob_down": 50.0}
    logger.info(f"[PredictionMarket] Round {round_id} locked. No more bets.")
    
    # Wait for lock phase to end
    await asyncio.sleep(LOCK_PHASE_SECONDS)
    
    if current_round.round_id != round_id:
        return
    
    # Resolve round
    await _resolve_round()
    
    # Wait a few seconds before starting next round
    await asyncio.sleep(5)
    
    await start_new_round()


async def _resolve_round():
    """Resolve the current round and pay winners."""
    global current_round
    
    try:
        close_price = await get_btc_price()
    except:
        close_price = current_round.lock_price  # fallback
    
    current_round.close_price = close_price
    current_round.status = "resolved"
    current_round.resolved_at = time.time()
    
    result = "up" if close_price > current_round.lock_price else ("down" if close_price < current_round.lock_price else "flat")
    
    logger.info(
        f"[PredictionMarket] Round {current_round.round_id} resolved: "
        f"lock=${current_round.lock_price:,.2f} close=${close_price:,.2f} result={result}"
    )
    
    # Pay winners (or refund everyone on flat)
    winners = []
    losers = []
    refunds = []
    for bet in current_round.bets:
        bet["result"] = result
        if result == "flat":
            bet["won"] = None
            bet["payout"] = bet["amount"]
            refunds.append(bet)
        elif bet["direction"] == result:
            bet["won"] = True
            bet["payout"] = int(bet["amount"] * bet["locked_odds"])
            winners.append(bet)
        else:
            bet["won"] = False
            bet["payout"] = 0
            losers.append(bet)
    
    # Award coins to winners + refund flat bets
    _pay_winners(winners + refunds)
    
    # Save to history
    round_history.insert(0, {
        "round_id": current_round.round_id,
        "lock_price": current_round.lock_price,
        "close_price": close_price,
        "result": result,
        "start_time": current_round.start_time,
        "resolved_at": current_round.resolved_at,
        "total_bets": len(current_round.bets),
        "winners": len(winners),
        "losers": len(losers),
    })
    
    # Keep only last 50 rounds
    if len(round_history) > 50:
        round_history[:] = round_history[:50]


def _pay_winners(winners: List[Dict]):
    """Award coins to winning bets."""
    from app.database import SessionLocal
    
    if not winners:
        return
    
    db = SessionLocal()
    try:
        coin_service = get_coin_service(db)
        for bet in winners:
            try:
                # Award the NET win (payout - original bet, since bet was already deducted)
                net_win = bet["payout"]
                coin_service.award_coins(
                    user_id=bet["user_id"],
                    amount=net_win,
                    transaction_type="prediction_win",
                    source_id="prediction-market",
                    description=f"Prediction Market win: bet {bet['amount']} on {bet['direction'].upper()}, odds {bet['locked_odds']}x"
                )
                logger.info(f"[PredictionMarket] Paid {net_win} coins to {bet['user_id']}")
            except Exception as e:
                logger.error(f"[PredictionMarket] Failed to pay {bet['user_id']}: {e}")
    finally:
        db.close()


# ─── API Endpoints ───────────────────────────────────────────────────

@router.get("/round", response_model=RoundInfoResponse)
async def get_current_round():
    """Get current round info with live odds."""
    if current_round.status == "waiting" or not current_round.round_id:
        return RoundInfoResponse(
            round_id=None,
            status="waiting",
            lock_price=None,
            current_price=None,
            seconds_remaining=None,
            betting_seconds_remaining=None,
            odds=None,
            total_bets=0,
            start_time=None,
        )
    
    now = time.time()
    elapsed = now - current_round.start_time
    seconds_remaining = max(0, ROUND_DURATION_SECONDS - elapsed)
    betting_seconds_remaining = max(0, BETTING_PHASE_SECONDS - elapsed)
    
    current_price = await get_btc_price()
    
    odds = None
    if current_round.status == "betting":
        odds = calculate_odds(current_price, current_round.lock_price, seconds_remaining)
    elif current_round.status == "locked":
        # Return frozen odds — don't recalculate
        odds = current_round.frozen_odds
    
    return RoundInfoResponse(
        round_id=current_round.round_id,
        status=current_round.status,
        lock_price=current_round.lock_price,
        current_price=current_price,
        close_price=current_round.close_price,
        seconds_remaining=round(seconds_remaining, 1),
        betting_seconds_remaining=round(betting_seconds_remaining, 1),
        odds=odds,
        total_bets=len(current_round.bets),
        start_time=current_round.start_time,
    )


@router.get("/price")
async def get_price():
    """Get current BTC price."""
    price = await get_btc_price()
    return {"price": price, "symbol": "BTCUSDT", "timestamp": time.time()}


@router.post("/bet", response_model=PlaceBetResponse)
async def place_bet(
    bet_request: PlaceBetRequest,
    db: DbSession,
):
    """Place a bet on the current round."""
    user_id = bet_request.user_id
    
    # Check round state
    if current_round.status != "betting":
        raise HTTPException(
            status_code=400,
            detail="Betting is not open. " + (
                "Round is locked." if current_round.status == "locked"
                else "Waiting for next round." if current_round.status in ("waiting", "resolved")
                else f"Round status: {current_round.status}"
            )
        )
    
    # Check user hasn't already bet this round
    existing_bet = next((b for b in current_round.bets if b["user_id"] == user_id), None)
    if existing_bet:
        raise HTTPException(status_code=400, detail="You already placed a bet this round")
    
    # Calculate current odds
    now = time.time()
    elapsed = now - current_round.start_time
    seconds_remaining = max(0, ROUND_DURATION_SECONDS - elapsed)
    current_price = await get_btc_price()
    odds = calculate_odds(current_price, current_round.lock_price, seconds_remaining)
    
    locked_odds = odds["up"] if bet_request.direction == "up" else odds["down"]
    potential_win = int(bet_request.amount * locked_odds)
    
    # Spend coins
    coin_service = get_coin_service(db)
    try:
        transaction = coin_service.spend_coins(
            user_id=user_id,
            amount=bet_request.amount,
            transaction_type="prediction_bet",
            source_id="prediction-market",
            description=f"Prediction Market bet: {bet_request.amount} on {bet_request.direction.upper()}"
        )
        if transaction is None:
            raise HTTPException(status_code=400, detail="Insufficient balance")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Record bet
    bet_id = str(uuid.uuid4())[:8]
    bet_record = {
        "bet_id": bet_id,
        "user_id": user_id,
        "round_id": current_round.round_id,
        "direction": bet_request.direction,
        "amount": bet_request.amount,
        "locked_odds": locked_odds,
        "potential_win": potential_win,
        "placed_at": now,
        "price_at_bet": current_price,
    }
    current_round.bets.append(bet_record)
    
    logger.info(
        f"[PredictionMarket] Bet placed: user={user_id} dir={bet_request.direction} "
        f"amount={bet_request.amount} odds={locked_odds}x"
    )
    
    return PlaceBetResponse(
        bet_id=bet_id,
        direction=bet_request.direction,
        amount=bet_request.amount,
        locked_odds=locked_odds,
        potential_win=potential_win,
        round_id=current_round.round_id,
    )


@router.get("/my-bets")
async def get_my_bets(user_id: str):
    """Get user's bets for the active round."""
    
    user_bets = [b for b in current_round.bets if b["user_id"] == user_id]
    
    return {
        "round_id": current_round.round_id,
        "bets": [
            UserBetInfo(
                bet_id=b["bet_id"],
                round_id=b["round_id"],
                direction=b["direction"],
                amount=b["amount"],
                locked_odds=b["locked_odds"],
                potential_win=b["potential_win"],
                result=b.get("result"),
                won=b.get("won"),
                payout=b.get("payout"),
            )
            for b in user_bets
        ]
    }


@router.get("/history", response_model=List[RoundHistoryEntry])
async def get_round_history(limit: int = 10):
    """Get recent round results."""
    entries = []
    for r in round_history[:limit]:
        entries.append(RoundHistoryEntry(
            round_id=r["round_id"],
            lock_price=r["lock_price"],
            close_price=r["close_price"],
            result=r["result"],
            start_time=r["start_time"],
            resolved_at=r["resolved_at"],
        ))
    return entries


@router.post("/start-round")
async def admin_start_round():
    """Start the first round (called once on startup or manually)."""
    if current_round.status == "betting" or current_round.status == "locked":
        return {"message": "Round already running", "round": current_round.to_dict()}
    
    await start_new_round()
    return {"message": "Round started", "round": current_round.to_dict()}


@router.get("/price-history")
async def get_price_history(limit: int = 300):
    """Get recent BTC price history for chart pre-fill."""
    data = _price_history[-limit:] if limit < len(_price_history) else _price_history[:]
    return {"prices": data, "count": len(data)}


# ─── SSE Stream ──────────────────────────────────────────────────────

@router.get("/stream")
async def round_stream(request: Request):
    """
    Server-Sent Events stream.
    Pushes round state + price every second — replaces client polling.
    """
    async def event_generator():
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            try:
                payload = await _build_round_payload()
                data_str = json.dumps(payload)
                yield f"data: {data_str}\n\n"
            except Exception as e:
                logger.error(f"[SSE] Error building payload: {e}")
                yield f"data: {{\"error\": true}}\n\n"

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _build_round_payload() -> dict:
    """Build the round state dict pushed via SSE (same shape as /round)."""
    if current_round.status == "waiting" or not current_round.round_id:
        return {
            "round_id": None,
            "status": "waiting",
            "lock_price": None,
            "current_price": _price_cache.get("price"),
            "close_price": None,
            "seconds_remaining": None,
            "betting_seconds_remaining": None,
            "odds": None,
            "total_bets": 0,
            "start_time": None,
        }

    now = time.time()
    elapsed = now - current_round.start_time
    seconds_remaining = max(0, ROUND_DURATION_SECONDS - elapsed)
    betting_seconds_remaining = max(0, BETTING_PHASE_SECONDS - elapsed)

    current_price = await get_btc_price()

    odds = None
    if current_round.status == "betting":
        odds = calculate_odds(current_price, current_round.lock_price, seconds_remaining)
    elif current_round.status == "locked":
        odds = current_round.frozen_odds

    return {
        "round_id": current_round.round_id,
        "status": current_round.status,
        "lock_price": current_round.lock_price,
        "current_price": current_price,
        "close_price": current_round.close_price,
        "seconds_remaining": round(seconds_remaining, 1),
        "betting_seconds_remaining": round(betting_seconds_remaining, 1),
        "odds": odds,
        "total_bets": len(current_round.bets),
        "start_time": current_round.start_time,
    }
