"""
Coins Router - API endpoints for coin management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.repositories import RepositoryFactory
from app.services import CoinService, ValidationError


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
    coin_service: CoinService = Depends(get_coin_service)
):
    """
    Get user's transaction history
    
    Args:
        user_id: User identifier
        limit: Maximum number of transactions to return (default 100)
        
    Returns:
        List of transactions
    """
    try:
        transactions = coin_service.get_user_transactions(user_id, limit)
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

