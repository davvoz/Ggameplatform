"""
Coins Router - API endpoints for coin management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from collections import defaultdict

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService, ValidationError
from app.models import CoinTransaction
from app.user_auth import CurrentUserId, require_owner

DbSession = Annotated[Session, Depends(get_db)]


router = APIRouter(prefix="/api/coins", tags=["Coins"])

# Reusable description strings (Sonar S1192 - duplicated string literals).
# Endpoints with more than one status code spell out the full literal dict
# below instead of `**`-merging these: Sonar's S8415 checker only resolves
# literal int status-code keys in `responses=`, not dict spreads.
_DESC_401 = "Not authenticated"
_DESC_403 = "Cannot act on behalf of another user"
_DESC_500 = "Server error"
_DESC_400_AWARD = "Invalid award request"
_DESC_400_SPEND = "Invalid spend request or insufficient balance"
_RESP_500 = {500: {"description": _DESC_500}}


# Pydantic schemas for request/response validation
class CoinBalanceResponse(BaseModel):
    user_id: str
    balance: int
    total_earned: int
    total_spent: int
    last_updated: str
    created_at: str


class CoinTransactionResponse(BaseModel):
    transaction_id: str
    user_id: str
    amount: int
    transaction_type: str
    source_id: Optional[str] = None
    description: Optional[str] = None
    balance_after: int
    created_at: str
    metadata: dict


class AwardCoinsRequest(BaseModel):
    amount: int
    transaction_type: str
    source_id: Optional[str] = None
    description: Optional[str] = None
    extra_data: Optional[dict] = None


class SpendCoinsRequest(BaseModel):
    amount: int
    transaction_type: str
    source_id: Optional[str] = None
    description: Optional[str] = None
    extra_data: Optional[dict] = None


class DetailedStatsResponse(BaseModel):
    """Detailed wallet statistics"""
    best_day: Optional[dict] = None
    longest_streak: int = 0
    current_streak: int = 0
    peak_hours: List[dict] = []
    game_earnings: List[dict] = []
    daily_flow: List[dict] = []
    top_earning_types: List[dict] = []
    stats_period_days: int = 30
    total_transactions: int = 0
    incoming_count: int = 0
    outgoing_count: int = 0


def get_coin_service(db: DbSession) -> CoinService:
    """Dependency to get CoinService instance"""
    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    return CoinService(coins_repo, transaction_repo)

CoinServiceDep = Annotated[CoinService, Depends(get_coin_service)]


@router.get(
    "/{user_id}/balance",
    response_model=CoinBalanceResponse,
    responses=_RESP_500,
)
async def get_user_balance(
    user_id: str,
    coin_service: CoinServiceDep
):
    """
    Get user's current coin balance
    
    Args:
        user_id: User identifier
        
    Returns:
        User's coin balance information
    """
    try:
        balance = coin_service.get_user_balance(user_id)
        return balance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get balance: {str(e)}"
        )


@router.get(
    "/{user_id}/transactions",
    response_model=List[CoinTransactionResponse],
    responses=_RESP_500,
)
async def get_user_transactions(
    user_id: str,
    coin_service: CoinServiceDep,
    limit: int = 100,
    offset: int = 0,
):
    """
    Get user's transaction history with pagination
    
    Args:
        user_id: User identifier
        limit: Maximum number of transactions to return (default 100)
        offset: Number of transactions to skip for pagination (default 0)
        
    Returns:
        List of transactions
    """
    try:
        transactions = coin_service.get_user_transactions(user_id, limit, offset)
        return transactions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transactions: {str(e)}"
        )


@router.post(
    "/{user_id}/award",
    response_model=CoinTransactionResponse,
    responses={
        401: {"description": _DESC_401},
        403: {"description": _DESC_403},
        400: {"description": _DESC_400_AWARD},
        500: {"description": _DESC_500},
    },
)
async def award_coins(
    user_id: str,
    request: AwardCoinsRequest,
    coin_service: CoinServiceDep,
    current_user_id: CurrentUserId
):
    """
    Award coins to a user

    Args:
        user_id: User identifier
        request: Award request with amount and details

    Returns:
        Transaction record
    """
    require_owner(user_id, current_user_id)
    try:
        transaction = coin_service.award_coins(
            user_id=user_id,
            amount=request.amount,
            transaction_type=request.transaction_type,
            source_id=request.source_id,
            description=request.description,
            extra_data=request.extra_data
        )
        return transaction
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award coins: {str(e)}"
        )


@router.get(
    "/me/balance",
    response_model=CoinBalanceResponse,
    responses={
        401: {"description": _DESC_401},
        500: {"description": _DESC_500},
    },
)
async def get_my_balance(
    coin_service: CoinServiceDep,
    user_id: CurrentUserId
):
    """Get current user's coin balance"""
    print(f"[Coins API] Getting balance for user_id: {user_id}")
    try:
        balance = coin_service.get_user_balance(user_id)
        print(f"[Coins API] Balance retrieved: {balance}")
        return balance
    except Exception as e:
        print(f"[Coins API] Error getting balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get balance: {str(e)}"
        )


@router.post(
    "/me/spend",
    response_model=CoinTransactionResponse,
    responses={
        401: {"description": _DESC_401},
        400: {"description": _DESC_400_SPEND},
        500: {"description": _DESC_500},
    },
)
async def spend_my_coins(
    spend_request: SpendCoinsRequest,
    coin_service: CoinServiceDep,
    user_id: CurrentUserId
):
    """Spend coins from current user's balance"""
    try:
        transaction = coin_service.spend_coins(
            user_id=user_id,
            amount=spend_request.amount,
            transaction_type=spend_request.transaction_type,
            source_id=spend_request.source_id,
            description=spend_request.description,
            extra_data=spend_request.extra_data
        )
        
        if transaction is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        return transaction
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to spend coins: {str(e)}"
        )


def _aggregate_stats_transactions(transactions):
    """Bucket transactions into daily/hourly/game/type aggregates for the stats endpoint."""
    daily_earnings = defaultdict(lambda: {"earned": 0, "spent": 0, "count": 0})
    hourly_earnings = defaultdict(lambda: {"total": 0, "count": 0})
    game_earnings = defaultdict(lambda: {"total": 0, "count": 0, "game_name": ""})
    type_earnings = defaultdict(lambda: {"total": 0, "count": 0})
    earning_days = set()

    for tx in transactions:
        amount = tx.amount
        description = tx.description or ""
        created_at = _parse_stats_timestamp(tx.created_at)
        date_key = created_at.strftime("%Y-%m-%d")
        hour = created_at.hour

        if amount > 0:
            daily_earnings[date_key]["earned"] += amount
            earning_days.add(date_key)
        else:
            daily_earnings[date_key]["spent"] += abs(amount)
        daily_earnings[date_key]["count"] += 1

        if amount > 0:
            hourly_earnings[hour]["total"] += amount
            hourly_earnings[hour]["count"] += 1

            if tx.source_id:
                game_name = description.split(" - ")[0] if " - " in description else tx.source_id
                game_earnings[tx.source_id]["total"] += amount
                game_earnings[tx.source_id]["count"] += 1
                game_earnings[tx.source_id]["game_name"] = game_name

            type_earnings[tx.transaction_type]["total"] += amount
            type_earnings[tx.transaction_type]["count"] += 1

    return daily_earnings, hourly_earnings, game_earnings, type_earnings, earning_days


def _parse_stats_timestamp(created_at_str):
    """Parse a transaction's created_at into a datetime, defaulting to now on failure."""
    try:
        if isinstance(created_at_str, str):
            return datetime.fromisoformat(created_at_str.replace('Z', '+00:00').replace('+00:00', ''))
        return created_at_str
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def _calculate_best_day(daily_earnings):
    if not daily_earnings:
        return None
    best_date = max(daily_earnings.keys(), key=lambda d: daily_earnings[d]["earned"])
    if daily_earnings[best_date]["earned"] <= 0:
        return None
    return {
        "date": best_date,
        "earned": daily_earnings[best_date]["earned"],
        "transactions": daily_earnings[best_date]["count"]
    }


def _calculate_streaks(earning_days):
    sorted_dates = sorted(earning_days)
    longest_streak = 0
    current_streak = 0
    temp_streak = 0

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    for i, date_str in enumerate(sorted_dates):
        if i == 0:
            temp_streak = 1
        else:
            prev_date = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d")
            curr_date = datetime.strptime(date_str, "%Y-%m-%d")
            temp_streak = temp_streak + 1 if (curr_date - prev_date).days == 1 else 1

        longest_streak = max(longest_streak, temp_streak)

        if date_str in (today, yesterday):
            current_streak = temp_streak

    return longest_streak, current_streak


def _calculate_peak_hours(hourly_earnings):
    peak_hours = []
    for hour, data in sorted(hourly_earnings.items(), key=lambda x: x[1]["total"], reverse=True)[:5]:
        peak_hours.append({
            "hour": hour,
            "label": f"{hour:02d}:00 - {(hour+1) % 24:02d}:00",
            "total": data["total"],
            "count": data["count"],
            "avg": round(data["total"] / data["count"]) if data["count"] > 0 else 0
        })
    return peak_hours


def _calculate_game_stats(game_earnings):
    game_stats = []
    for game_id, data in sorted(game_earnings.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        if data["total"] > 0:
            game_stats.append({
                "game_id": game_id,
                "game_name": data["game_name"],
                "total": data["total"],
                "count": data["count"],
                "avg": round(data["total"] / data["count"]) if data["count"] > 0 else 0
            })
    return game_stats


def _calculate_daily_flow(daily_earnings):
    daily_flow = []
    for i in range(14, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        date = day.strftime("%Y-%m-%d")
        day_data = daily_earnings.get(date, {"earned": 0, "spent": 0, "count": 0})
        daily_flow.append({
            "date": date,
            "day_label": day.strftime("%a"),
            "earned": day_data["earned"],
            "spent": day_data["spent"],
            "net": day_data["earned"] - day_data["spent"],
            "count": day_data["count"]
        })
    return daily_flow


def _calculate_top_types(type_earnings):
    top_types = []
    for tx_type, data in sorted(type_earnings.items(), key=lambda x: x[1]["total"], reverse=True)[:8]:
        top_types.append({
            "type": tx_type,
            "total": data["total"],
            "count": data["count"]
        })
    return top_types


@router.get(
    "/{user_id}/stats",
    response_model=DetailedStatsResponse,
    responses=_RESP_500,
)
async def get_user_detailed_stats(
    user_id: str,
    db: DbSession,
    days: int = 30,
):
    """
    Get detailed wallet statistics for a user

    Returns:
        - Best earning day
        - Earning streaks (longest and current)
        - Peak hours analysis
        - Game performance stats
        - Daily coin flow
        - Top earning transaction types
    """
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        transactions = db.query(CoinTransaction).filter(
            CoinTransaction.user_id == user_id,
            CoinTransaction.created_at >= start_date.isoformat()
        ).order_by(CoinTransaction.created_at.desc()).all()

        daily_earnings, hourly_earnings, game_earnings, type_earnings, earning_days = (
            _aggregate_stats_transactions(transactions)
        )
        longest_streak, current_streak = _calculate_streaks(earning_days)

        return DetailedStatsResponse(
            best_day=_calculate_best_day(daily_earnings),
            longest_streak=longest_streak,
            current_streak=current_streak,
            peak_hours=_calculate_peak_hours(hourly_earnings),
            game_earnings=_calculate_game_stats(game_earnings),
            daily_flow=_calculate_daily_flow(daily_earnings),
            top_earning_types=_calculate_top_types(type_earnings),
            stats_period_days=days,
            total_transactions=len(transactions),
            incoming_count=sum(1 for tx in transactions if tx.amount > 0),
            outgoing_count=sum(1 for tx in transactions if tx.amount < 0)
        )

    except Exception as e:
        print(f"[Coins Stats API] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate stats: {str(e)}"
        )


@router.post(
    "/me/award",
    response_model=CoinTransactionResponse,
    responses={
        401: {"description": _DESC_401},
        400: {"description": _DESC_400_AWARD},
        500: {"description": _DESC_500},
    },
)
async def award_my_coins(
    award_request: AwardCoinsRequest,
    coin_service: CoinServiceDep,
    user_id: CurrentUserId
):
    """Award coins to current user"""
    try:
        transaction = coin_service.award_coins(
            user_id=user_id,
            amount=award_request.amount,
            transaction_type=award_request.transaction_type,
            source_id=award_request.source_id,
            description=award_request.description,
            extra_data=award_request.extra_data
        )
        return transaction
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award coins: {str(e)}"
        )


@router.get(
    "/{user_id}/purchases/{game}",
    responses=_RESP_500,
)
async def get_user_purchases(
    user_id: str,
    game: str,
    db: DbSession
):
    """
    Get purchased items for a user in a specific game by checking coin transactions.
    Looks for spend transactions with source_id matching '{game}_theme_%'.
    
    Returns:
        List of purchased theme IDs
    """
    try:
        prefix = f"{game}_theme_"
        transactions = db.query(CoinTransaction).filter(
            CoinTransaction.user_id == user_id,
            CoinTransaction.transaction_type == 'shop_purchase',
            CoinTransaction.source_id.like(f"{prefix}%"),
            CoinTransaction.amount < 0  # Only actual spends
        ).all()
        
        # Extract theme IDs from source_id (e.g. "blockyroad_theme_neon" -> "neon")
        purchased = list({
            tx.source_id[len(prefix):] for tx in transactions
            if tx.source_id and tx.source_id.startswith(prefix)
        })
        
        return {"user_id": user_id, "game": game, "purchased_themes": purchased}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get purchases: {str(e)}"
        )


@router.post(
    "/{user_id}/spend",
    response_model=CoinTransactionResponse,
    responses={
        401: {"description": _DESC_401},
        403: {"description": _DESC_403},
        400: {"description": _DESC_400_SPEND},
        500: {"description": _DESC_500},
    },
)
async def spend_coins(
    user_id: str,
    request: SpendCoinsRequest,
    coin_service: CoinServiceDep,
    current_user_id: CurrentUserId
):
    """
    Spend coins from user's balance

    Args:
        user_id: User identifier
        request: Spend request with amount and details

    Returns:
        Transaction record, or 400 if insufficient balance
    """
    require_owner(user_id, current_user_id)
    try:
        transaction = coin_service.spend_coins(
            user_id=user_id,
            amount=request.amount,
            transaction_type=request.transaction_type,
            source_id=request.source_id,
            description=request.description,
            extra_data=request.extra_data
        )
        
        if transaction is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        return transaction
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to spend coins: {str(e)}"
        )

