"""
Coins Router - API endpoints for coin management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import defaultdict

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService, ValidationError
from app.models import CoinTransaction


router = APIRouter(prefix="/api/coins", tags=["Coins"])


def get_current_user_id(request: Request) -> str:
    """Get current user ID from session"""
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user_id


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
    source_id: Optional[str]
    description: Optional[str]
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


def get_coin_service(db: Session = Depends(get_db)) -> CoinService:
    """Dependency to get CoinService instance"""
    coins_repo = RepositoryFactory.create_usercoins_repository(db)
    transaction_repo = RepositoryFactory.create_cointransaction_repository(db)
    return CoinService(coins_repo, transaction_repo)


@router.get("/{user_id}/balance", response_model=CoinBalanceResponse)
async def get_user_balance(
    user_id: str,
    coin_service: CoinService = Depends(get_coin_service)
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


@router.get("/{user_id}/transactions", response_model=List[CoinTransactionResponse])
async def get_user_transactions(
    user_id: str,
    limit: int = 100,
    offset: int = 0,
    coin_service: CoinService = Depends(get_coin_service)
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


@router.post("/{user_id}/award", response_model=CoinTransactionResponse)
async def award_coins(
    user_id: str,
    request: AwardCoinsRequest,
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Award coins to a user
    
    Args:
        user_id: User identifier
        request: Award request with amount and details
        
    Returns:
        Transaction record
    """
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


@router.get("/me/balance", response_model=CoinBalanceResponse)
async def get_my_balance(
    request: Request,
    coin_service: CoinService = Depends(get_coin_service)
):
    """Get current user's coin balance"""
    user_id = get_current_user_id(request)
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


@router.post("/me/spend", response_model=CoinTransactionResponse)
async def spend_my_coins(
    request: Request,
    spend_request: SpendCoinsRequest,
    coin_service: CoinService = Depends(get_coin_service)
):
    """Spend coins from current user's balance"""
    user_id = get_current_user_id(request)
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


@router.get("/{user_id}/stats", response_model=DetailedStatsResponse)
async def get_user_detailed_stats(
    user_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
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
        # Get transactions using ORM
        start_date = datetime.utcnow() - timedelta(days=days)
        start_date_str = start_date.isoformat()
        
        transactions = db.query(CoinTransaction).filter(
            CoinTransaction.user_id == user_id,
            CoinTransaction.created_at >= start_date_str
        ).order_by(CoinTransaction.created_at.desc()).all()
        
        # Initialize data structures
        daily_earnings = defaultdict(lambda: {"earned": 0, "spent": 0, "count": 0})
        hourly_earnings = defaultdict(lambda: {"total": 0, "count": 0})
        game_earnings = defaultdict(lambda: {"total": 0, "count": 0, "game_name": ""})
        type_earnings = defaultdict(lambda: {"total": 0, "count": 0})
        
        earning_days = set()
        
        for tx in transactions:
            amount = tx.amount
            tx_type = tx.transaction_type
            source_id = tx.source_id
            description = tx.description or ""
            created_at_str = tx.created_at
            
            # Parse created_at string to datetime
            try:
                if isinstance(created_at_str, str):
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00').replace('+00:00', ''))
                else:
                    created_at = created_at_str
            except:
                created_at = datetime.utcnow()
            
            date_key = created_at.strftime("%Y-%m-%d")
            hour = created_at.hour
            
            # Daily aggregation
            if amount > 0:
                daily_earnings[date_key]["earned"] += amount
                earning_days.add(date_key)
            else:
                daily_earnings[date_key]["spent"] += abs(amount)
            daily_earnings[date_key]["count"] += 1
            
            # Hourly aggregation (only earnings)
            if amount > 0:
                hourly_earnings[hour]["total"] += amount
                hourly_earnings[hour]["count"] += 1
            
            # Game earnings (from source_id or description)
            if amount > 0 and source_id:
                game_id = source_id
                game_name = description.split(" - ")[0] if " - " in description else source_id
                game_earnings[game_id]["total"] += amount
                game_earnings[game_id]["count"] += 1
                game_earnings[game_id]["game_name"] = game_name
            
            # Type aggregation
            if amount > 0:
                type_earnings[tx_type]["total"] += amount
                type_earnings[tx_type]["count"] += 1
        
        # Calculate best day
        best_day = None
        if daily_earnings:
            best_date = max(daily_earnings.keys(), key=lambda d: daily_earnings[d]["earned"])
            if daily_earnings[best_date]["earned"] > 0:
                best_day = {
                    "date": best_date,
                    "earned": daily_earnings[best_date]["earned"],
                    "transactions": daily_earnings[best_date]["count"]
                }
        
        # Calculate streaks
        sorted_dates = sorted(earning_days)
        longest_streak = 0
        current_streak = 0
        temp_streak = 0
        
        today = datetime.utcnow().strftime("%Y-%m-%d")
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        for i, date_str in enumerate(sorted_dates):
            if i == 0:
                temp_streak = 1
            else:
                prev_date = datetime.strptime(sorted_dates[i-1], "%Y-%m-%d")
                curr_date = datetime.strptime(date_str, "%Y-%m-%d")
                if (curr_date - prev_date).days == 1:
                    temp_streak += 1
                else:
                    temp_streak = 1
            
            longest_streak = max(longest_streak, temp_streak)
            
            # Check current streak
            if date_str == today or date_str == yesterday:
                current_streak = temp_streak
        
        # Peak hours (top 5)
        peak_hours = []
        for hour, data in sorted(hourly_earnings.items(), key=lambda x: x[1]["total"], reverse=True)[:5]:
            peak_hours.append({
                "hour": hour,
                "label": f"{hour:02d}:00 - {(hour+1) % 24:02d}:00",
                "total": data["total"],
                "count": data["count"],
                "avg": round(data["total"] / data["count"]) if data["count"] > 0 else 0
            })
        
        # Game earnings (top 10)
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
        
        # Daily flow (last 14 days)
        daily_flow = []
        for i in range(14, -1, -1):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            day_data = daily_earnings.get(date, {"earned": 0, "spent": 0, "count": 0})
            daily_flow.append({
                "date": date,
                "day_label": (datetime.utcnow() - timedelta(days=i)).strftime("%a"),
                "earned": day_data["earned"],
                "spent": day_data["spent"],
                "net": day_data["earned"] - day_data["spent"],
                "count": day_data["count"]
            })
        
        # Top earning types
        top_types = []
        for tx_type, data in sorted(type_earnings.items(), key=lambda x: x[1]["total"], reverse=True)[:8]:
            top_types.append({
                "type": tx_type,
                "total": data["total"],
                "count": data["count"]
            })
        
        # Calculate transaction counts
        total_transactions = len(transactions)
        incoming_count = sum(1 for tx in transactions if tx.amount > 0)
        outgoing_count = sum(1 for tx in transactions if tx.amount < 0)
        
        return DetailedStatsResponse(
            best_day=best_day,
            longest_streak=longest_streak,
            current_streak=current_streak,
            peak_hours=peak_hours,
            game_earnings=game_stats,
            daily_flow=daily_flow,
            top_earning_types=top_types,
            stats_period_days=days,
            total_transactions=total_transactions,
            incoming_count=incoming_count,
            outgoing_count=outgoing_count
        )
        
    except Exception as e:
        print(f"[Coins Stats API] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate stats: {str(e)}"
        )


@router.post("/me/award", response_model=CoinTransactionResponse)
async def award_my_coins(
    request: Request,
    award_request: AwardCoinsRequest,
    coin_service: CoinService = Depends(get_coin_service)
):
    """Award coins to current user"""
    user_id = get_current_user_id(request)
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


@router.post("/{user_id}/spend", response_model=CoinTransactionResponse)
async def spend_coins(
    user_id: str,
    request: SpendCoinsRequest,
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Spend coins from user's balance
    
    Args:
        user_id: User identifier
        request: Spend request with amount and details
        
    Returns:
        Transaction record, or 400 if insufficient balance
    """
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

