"""
Refund Coins Script
Credits (refunds) coins to a specific user.

Usage (from the backend/ folder):
    python scripts/refund_coins.py <user_id> <amount>

Example:
    python scripts/refund_coins.py user_abc123 500
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.repositories import UserCoinsRepository, CoinTransactionRepository
from app.services import CoinService


def refund_coins(user_id: str, amount: int):
    """Credits coins to a user as a refund."""
    with get_db_session() as db:
        # Check that the user exists
        from app.models import User
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            print(f"❌ User '{user_id}' not found in the database.")
            sys.exit(1)

        coins_repo = UserCoinsRepository(db)
        tx_repo = CoinTransactionRepository(db)
        coin_service = CoinService(coins_repo, tx_repo)

        # Show current balance
        current = coins_repo.get_by_id(user_id)
        balance_before = current.balance if current else 0
        print(f"👤 User: {user.username} ({user_id})")
        print(f"💰 Current balance: {balance_before} coins")
        print(f"➕ Refund amount: {amount} coins")

        # Credit coins
        tx = coin_service.award_coins(
            user_id=user_id,
            amount=amount,
            transaction_type="admin_refund",
            description=f"Refund of {amount} coins",
        )

        print(f"✅ Refund completed!")
        print(f"💰 New balance: {tx['balance_after']} coins")
        print(f"🧾 Transaction ID: {tx['transaction_id']}")


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/refund_coins.py <user_id> <amount>")
        print("Example: python scripts/refund_coins.py user_abc123 500")
        sys.exit(1)

    user_id = sys.argv[1]

    try:
        amount = int(sys.argv[2])
    except ValueError:
        print("❌ The amount must be an integer.")
        sys.exit(1)

    if amount <= 0:
        print("❌ The amount must be positive.")
        sys.exit(1)

    refund_coins(user_id, amount)


if __name__ == "__main__":
    main()