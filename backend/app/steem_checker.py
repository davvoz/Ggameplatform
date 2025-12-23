"""
Steem Blockchain Checker
Verifies witness votes and delegations in real-time
"""
import requests
from typing import Dict, Optional

STEEM_API_URL = "https://api.steemit.com"
CUR8_WITNESS = "cur8.witness"
CUR8_ACCOUNT = "cur8"

def get_vests_to_sp_ratio() -> float:
    """
    Get the current VESTS to STEEM Power conversion ratio from Steem blockchain
    
    Returns:
        Conversion ratio (VESTS per STEEM)
    """
    try:
        payload = {
            "jsonrpc": "2.0",
            "method": "condenser_api.get_dynamic_global_properties",
            "params": [],
            "id": 1
        }
        
        response = requests.post(STEEM_API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if "result" in result:
                props = result["result"]
                total_vesting_fund_steem = float(props.get("total_vesting_fund_steem", "0").split()[0])
                total_vesting_shares = float(props.get("total_vesting_shares", "0").split()[0])
                
                if total_vesting_shares > 0:
                    # VESTS to SP ratio
                    ratio = total_vesting_shares / total_vesting_fund_steem
                    return ratio
        
        # Fallback to approximate value
        return 2000.0
        
    except Exception as e:
        print(f"⚠️ Error getting VESTS to SP ratio: {e}")
        return 2000.0  # Fallback

def check_witness_vote(username: str) -> bool:
    """
    Check if user votes for cur8.witness (governance witness vote)
    Checks the witness's account to see if user is in the voters list
    This works even if user uses a voting proxy
    
    Args:
        username: Steem username
        
    Returns:
        True if user votes for cur8.witness (directly or via proxy), False otherwise
    """
    try:
        # Get witness account to check who is voting for it
        payload = {
            "jsonrpc": "2.0",
            "method": "condenser_api.get_witness_by_account",
            "params": [CUR8_WITNESS],
            "id": 1
        }
        
        response = requests.post(STEEM_API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if "result" in result and result["result"]:
                witness_data = result["result"]
                # Check if username is in the list of accounts voting for this witness
                # Note: This might need pagination for witnesses with many votes
                # For now, we'll use get_witness_votes which lists voters
                
                # Alternative: check user's account witness_votes and proxy
                account = get_account_data(username)
                if account:
                    # Check direct vote
                    witness_votes = account.get("witness_votes", [])
                    if CUR8_WITNESS in witness_votes:
                        return True
                    
                    # Check if using proxy
                    proxy = account.get("proxy", "")
                    if proxy:
                        # User has a proxy, check if proxy votes for cur8.witness
                        print(f"🔄 User {username} uses proxy: {proxy}, checking proxy votes...")
                        return check_witness_vote(proxy)  # Recursive check
        
        return False
        
    except Exception as e:
        print(f"⚠️ Error checking witness vote for {username}: {e}")
        return False


def get_account_data(username: str) -> Optional[Dict]:
    """
    Get account data from Steem blockchain (includes witness votes and delegations)
    
    Args:
        username: Steem username
        
    Returns:
        Account data dict or None
    """
    try:
        payload = {
            "jsonrpc": "2.0",
            "method": "condenser_api.get_accounts",
            "params": [[username]],
            "id": 1
        }
        
        response = requests.post(STEEM_API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if "result" in result and len(result["result"]) > 0:
                return result["result"][0]
        
        return None
        
    except Exception as e:
        print(f"⚠️ Error fetching account data for {username}: {e}")
        return None


def get_delegation_amount(username: str) -> float:
    """
    Get STEEM Power delegation from user specifically to @cur8
    
    Args:
        username: Steem username
        
    Returns:
        Delegation amount in STEEM Power delegated to @cur8
    """
    try:
        # Get current VESTS to SP conversion ratio
        vests_per_steem = get_vests_to_sp_ratio()
        
        payload = {
            "jsonrpc": "2.0",
            "method": "condenser_api.get_vesting_delegations",
            "params": [username, CUR8_ACCOUNT, 100],
            "id": 1
        }
        
        response = requests.post(STEEM_API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if "result" in result:
                delegations = result["result"]
                
                # Find delegation specifically to @cur8
                for delegation in delegations:
                    if delegation.get("delegatee") == CUR8_ACCOUNT:
                        vests_str = delegation.get("vesting_shares", "0 VESTS")
                        vests = float(vests_str.split()[0])
                        # Convert VESTS to STEEM Power using dynamic ratio
                        steem_amount = vests / vests_per_steem
                        return round(steem_amount, 3)
        
        return 0.0
        
    except Exception as e:
        print(f"⚠️ Error checking delegation for {username}: {e}")
        return 0.0


def get_steem_multiplier_data(username: str) -> Dict:
    """
    Get complete multiplier data for a Steem user
    
    Args:
        username: Steem username
        
    Returns:
        Dictionary with votes_witness, delegation_amount, and calculated multiplier
    """
    from app.cur8_multiplier import calculate_cur8_multiplier
    
    votes_witness = check_witness_vote(username)
    delegation_amount = get_delegation_amount(username)
    multiplier = calculate_cur8_multiplier(votes_witness, delegation_amount)
    
    return {
        "username": username,
        "votes_cur8_witness": votes_witness,
        "delegation_amount": delegation_amount,
        "cur8_multiplier": multiplier
    }


# NOTE: Cache/check-throttling logic removed - multiplier is checked on every call


def update_user_multiplier(user_id: str, steem_username: str, db_session, force: bool = False) -> bool:
    """
    Update user's multiplier based on current Steem data
    Uses 10-minute cache to avoid excessive API calls
    
    Args:
        user_id: User ID
        steem_username: Steem username
        db_session: Database session
        force: If True, skip cache and always check (e.g., at login)
        
    Returns:
        True if updated successfully
    """
    from app.models import User
    from app.cur8_multiplier import calculate_cur8_multiplier
    from datetime import datetime
    
    try:
        user = db_session.query(User).filter(User.user_id == user_id).first()
        if not user or not steem_username:
            return False
        
        # Always perform a fresh check (cache/throttling removed)
        
        # Check current Steem status
        print(f"🔍 Checking Steem multiplier for {steem_username}...")
        votes_witness = check_witness_vote(steem_username)
        delegation_amount = get_delegation_amount(steem_username)
        new_multiplier = calculate_cur8_multiplier(votes_witness, delegation_amount)
        
        # Update timestamp
        user.last_multiplier_check = datetime.now().isoformat()
        
        # Update only if changed
        if (user.votes_cur8_witness != (1 if votes_witness else 0) or 
            abs(user.delegation_amount - delegation_amount) > 0.1 or
            abs(user.cur8_multiplier - new_multiplier) > 0.01):
            
            user.votes_cur8_witness = 1 if votes_witness else 0
            user.delegation_amount = delegation_amount
            user.cur8_multiplier = new_multiplier
            
            db_session.commit()
            print(f"✅ Updated multiplier for {steem_username}: {new_multiplier}x (witness: {votes_witness}, delegation: {delegation_amount})")
            return True
        else:
            db_session.commit()  # Save timestamp even if no change
            print(f"✓ Multiplier unchanged for {steem_username}: {new_multiplier}x")
        
        return False
        
    except Exception as e:
        print(f"❌ Error updating multiplier for {user_id}: {e}")
        db_session.rollback()
        return False
