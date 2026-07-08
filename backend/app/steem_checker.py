"""
Steem Blockchain Checker
Verifies witness votes and delegations against the Steem blockchain.
Per-user checks respect a cooldown (MULTIPLIER_COOLDOWN_MINUTES) unless forced.
"""
import os
import time
import threading
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

STEEM_API_URL = "https://api.steemit.com"
CUR8_WITNESS = "cur8.witness"
CUR8_ACCOUNT = "cur8"

# Config (env vars with defaults)
MULTIPLIER_COOLDOWN_MINUTES = int(os.getenv("MULTIPLIER_COOLDOWN_MINUTES", "30"))
VESTS_RATIO_TTL_HOURS = float(os.getenv("VESTS_RATIO_TTL_HOURS", "6"))
MAX_PROXY_DEPTH = 4  # Steem allows proxy chains up to depth 4

# Shared HTTP session for connection reuse (thread-safe for this usage)
_http = requests.Session()

def _fetch_vests_to_sp_ratio() -> Optional[float]:
    """Fetch the VESTS/SP ratio from the blockchain. None on failure."""
    try:
        payload = {
            "jsonrpc": "2.0",
            "method": "condenser_api.get_dynamic_global_properties",
            "params": [],
            "id": 1
        }

        response = _http.post(STEEM_API_URL, json=payload, timeout=10)

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

        return None

    except Exception as e:
        print(f"⚠️ Error getting VESTS to SP ratio: {e}")
        return None

_vests_ratio_lock = threading.Lock()
_vests_ratio_cache = {"value": None, "ts": 0.0}

def get_vests_to_sp_ratio() -> float:
    """
    Get the current VESTS to STEEM Power conversion ratio.
    Cached with a TTL (VESTS_RATIO_TTL_HOURS) - it's a global chain value that
    drifts very slowly, no need to refetch it for every user.

    Returns:
        Conversion ratio (VESTS per STEEM)
    """
    ttl = VESTS_RATIO_TTL_HOURS * 3600
    now = time.time()
    with _vests_ratio_lock:
        cached = _vests_ratio_cache["value"]
        if cached is not None and (now - _vests_ratio_cache["ts"]) < ttl:
            return cached
    # Fetch outside the lock: a rare duplicate fetch beats serializing threads on network I/O
    ratio = _fetch_vests_to_sp_ratio()
    if ratio is not None:
        with _vests_ratio_lock:
            _vests_ratio_cache["value"] = ratio
            _vests_ratio_cache["ts"] = now
        return ratio
    if cached is not None:
        # Stale-if-error: better an old ratio than the hardcoded fallback
        print("⚠️ Using stale VESTS/SP ratio (Steem API unavailable)")
        return cached
    return 2000.0  # Fallback

def check_witness_vote(username: str, _depth: int = 0) -> bool:
    """
    Check if user votes for cur8.witness (governance witness vote)
    Reads the user's own account data (witness_votes + proxy), following
    proxy chains up to MAX_PROXY_DEPTH hops.

    Args:
        username: Steem username

    Returns:
        True if user votes for cur8.witness (directly or via proxy), False otherwise
    """
    try:
        account = get_account_data(username)
        if not account:
            return False

        # Check direct vote
        if CUR8_WITNESS in account.get("witness_votes", []):
            return True

        # Check if using proxy
        proxy = account.get("proxy", "")
        if proxy and _depth < MAX_PROXY_DEPTH:
            # User has a proxy, check if proxy votes for cur8.witness
            print(f"🔄 User {username} uses proxy: {proxy}, checking proxy votes...")
            return check_witness_vote(proxy, _depth + 1)

        return False

    except Exception as e:
        print(f"⚠️ Error checking witness vote for {username}: {e}")
        return False


def get_accounts_data(usernames: list) -> Dict[str, Dict]:
    """
    Batch-fetch Steem accounts (condenser_api.get_accounts accepts an array).
    Chunks at 100 names per call.

    Args:
        usernames: list of Steem usernames

    Returns:
        Dict {username: account_dict} (missing accounts simply absent)
    """
    results: Dict[str, Dict] = {}
    for i in range(0, len(usernames), 100):
        chunk = usernames[i:i + 100]
        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "condenser_api.get_accounts",
                "params": [chunk],
                "id": 1
            }

            response = _http.post(STEEM_API_URL, json=payload, timeout=10)

            if response.status_code == 200:
                result = response.json()
                for account in result.get("result", []) or []:
                    results[account["name"]] = account

        except Exception as e:
            print(f"⚠️ Error batch-fetching accounts (chunk starting {chunk[0]}): {e}")
    return results


def get_account_data(username: str) -> Optional[Dict]:
    """
    Get account data from Steem blockchain (includes witness votes and delegations)

    Args:
        username: Steem username

    Returns:
        Account data dict or None
    """
    return get_accounts_data([username]).get(username)


def resolve_witness_vote_from_memo(username: str, memo: Dict[str, Dict]) -> bool:
    """
    Walk the witness-vote / proxy chain using pre-fetched account data. No HTTP.
    Used by the batched sweep in multiplier_scheduler.

    Args:
        username: Steem username to resolve
        memo: {username: account_dict} pre-fetched via get_accounts_data

    Returns:
        True if the user votes cur8.witness directly or via proxy chain
    """
    seen = set()
    current = username
    for _ in range(MAX_PROXY_DEPTH + 1):
        account = memo.get(current)
        if not account:
            return False
        if CUR8_WITNESS in account.get("witness_votes", []):
            return True
        proxy = account.get("proxy", "")
        if not proxy or proxy in seen:
            return False
        seen.add(proxy)
        current = proxy
    return False


def verify_posting_key(username: str, posting_key: str) -> Dict:
    """
    Verify that a posting key is valid for a given Steem account.
    This validates the posting key by deriving its public key and comparing
    with the account's posting authority public keys.
    
    Args:
        username: Steem username
        posting_key: Private posting key (WIF format, starts with '5')
        
    Returns:
        Dictionary with verification result:
        - success: True if key is valid, False otherwise
        - message: Descriptive message
        - account: Account data if successful
    """
    try:
        # Get account data first
        account = get_account_data(username)
        print(f"🔍 Verifying posting key for {username}...")
        if not account:
            return {
                "success": False,
                "message": f"Account '{username}' not found on Steem blockchain",
                "account": None
            }
        
        # Validate posting key format (WIF format starts with '5')
        if not posting_key or len(posting_key) < 50:
            print(f"❌ Invalid posting key format for {username}")
            return {
                "success": False,
                "message": "Invalid posting key format. Keys are typically 51 characters starting with '5'",
                "account": None
            }
        
        # Get the posting authority from account
        posting_auth = account.get("posting", {})
        key_auths = posting_auth.get("key_auths", [])
        print(f"🔑 Found {len(key_auths)} posting keys for account {username}")
        if not key_auths:
            print(f"❌ No posting keys found for account {username}")
            return {
                "success": False,
                "message": "No posting keys found for this account",
                "account": None
            }
        
        
        from beemgraphenebase.account import PrivateKey
        
        print(f"🔑 Using beemgraphenebase for key verification")
        
        # Create private key object
        private_key = PrivateKey(posting_key)
        print(f"🔑 Derived public key: {private_key.pubkey}")
        # Derive public key in WIF format
        public_key = str(private_key.pubkey)
        print(f"🔑 Comparing derived public key with account posting keys...")
        # Check if this public key matches any of the account's posting keys
        for auth in key_auths:
            print(f"🔑 Checking against account posting key: {auth[0]}")
            if auth[0] == public_key:
                print(f"✅ Posting key verified successfully for {username}")
                return {
                    "success": True,
                    "message": f"Posting key verified successfully for @{username}",
                    "account": account
                }
        
        print(f"❌ Posting key does not match this account for {username}")
        return {
            "success": False,
            "message": "Posting key does not match this account. Please verify you are using the correct posting key.",
            "account": None
        }       
    except Exception as e:
        print(f"❌ Error verifying posting key for {username}: {e}")
        return {
            "success": False,
            "message": f"Error verifying posting key: {str(e)}",
            "account": None
        }


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

        response = _http.post(STEEM_API_URL, json=payload, timeout=10)
        
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


def _is_check_recent(last_check_iso, cooldown_minutes: int) -> bool:
    """
    True if last_multiplier_check is newer than the cooldown window.
    Handles legacy NAIVE local timestamps (old code wrote datetime.now().isoformat())
    and new AWARE UTC ones. Missing/unparseable -> False (i.e. do the check).
    """
    if not last_check_iso:
        return False
    try:
        last = datetime.fromisoformat(last_check_iso)
    except (ValueError, TypeError):
        return False
    if last.tzinfo is None:
        # Legacy value written in local time: attach the local timezone
        last = last.astimezone()
    return (datetime.now(timezone.utc) - last) < timedelta(minutes=cooldown_minutes)


def persist_multiplier_result(user, votes_witness: bool, delegation_amount: float, db_session) -> bool:
    """
    Write check results + timestamp for a User. Returns True if stored values changed.
    Shared by the per-user path (update_user_multiplier) and the batched sweep.
    """
    from app.cur8_multiplier import calculate_cur8_multiplier

    new_multiplier = calculate_cur8_multiplier(votes_witness, delegation_amount)

    # Update timestamp (aware UTC going forward)
    user.last_multiplier_check = datetime.now(timezone.utc).isoformat()

    # Update only if changed
    if (user.votes_cur8_witness != (1 if votes_witness else 0) or
        abs(user.delegation_amount - delegation_amount) > 0.1 or
        abs(user.cur8_multiplier - new_multiplier) > 0.01):

        user.votes_cur8_witness = 1 if votes_witness else 0
        user.delegation_amount = delegation_amount
        user.cur8_multiplier = new_multiplier

        db_session.commit()
        print(f"✅ Updated multiplier for {user.steem_username}: {new_multiplier}x (witness: {votes_witness}, delegation: {delegation_amount})")
        return True

    db_session.commit()  # Save timestamp even if no change
    print(f"✓ Multiplier unchanged for {user.steem_username}: {new_multiplier}x")
    return False


def update_user_multiplier(user_id: str, steem_username: str, db_session, force: bool = False) -> bool:
    """
    Update user's multiplier based on current Steem data.
    Respects a per-user cooldown (MULTIPLIER_COOLDOWN_MINUTES, default 30 min)
    based on last_multiplier_check, unless force=True.

    Args:
        user_id: User ID
        steem_username: Steem username
        db_session: Database session
        force: If True, skip the cooldown and always check (e.g., at login)

    Returns:
        True if stored values changed (False on cooldown skip or no-change)
    """
    from app.models import User

    try:
        user = db_session.query(User).filter(User.user_id == user_id).first()
        if not user or not steem_username:
            return False

        if not force and _is_check_recent(user.last_multiplier_check, MULTIPLIER_COOLDOWN_MINUTES):
            print(f"⏭️ Skipping multiplier check for {steem_username} (checked < {MULTIPLIER_COOLDOWN_MINUTES} min ago)")
            return False

        # Check current Steem status
        print(f"🔍 Checking Steem multiplier for {steem_username}...")
        votes_witness = check_witness_vote(steem_username)
        delegation_amount = get_delegation_amount(steem_username)

        return persist_multiplier_result(user, votes_witness, delegation_amount, db_session)

    except Exception as e:
        print(f"❌ Error updating multiplier for {user_id}: {e}")
        db_session.rollback()
        return False


def check_user_multiplier_task(user_id: str, force: bool = False) -> None:
    """
    Background-task entrypoint (FastAPI BackgroundTasks): opens its OWN DB
    session and runs a cooldown-gated multiplier check.
    No-op for users without a steem_username.
    """
    from app.database import get_db_session
    from app.models import User

    try:
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user or not user.steem_username:
                return
            update_user_multiplier(user_id, user.steem_username, session, force=force)
    except Exception as e:
        print(f"⚠️ Background multiplier check failed for {user_id}: {e}")
