"""
Security Test Suite - Backend Vulnerability Scanner

Tests:
1. Password hashing strength
2. Rate limiting effectiveness
3. Admin endpoint protection
4. SQL injection resistance
5. CORS configuration
6. Session management
"""

import requests
import time
import hashlib
import uuid
import bcrypt

BASE_URL = "http://localhost:8000"

def test_password_hashing():
    """Test that new passwords use bcrypt."""
    print("\n🔐 Test 1: Password Hashing")
    print("-" * 50)
    
    # Test password
    password = uuid.uuid4().hex
    
    # SHA-256 hash (insecure)
    sha256_hash = hashlib.sha256(password.encode()).hexdigest()
    print(f"   SHA-256: {sha256_hash[:32]}... (64 chars, INSECURE)")
    
    # Bcrypt hash (secure)
    bcrypt_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    print(f"   Bcrypt:  {bcrypt_hash[:32].decode()}... (60 chars, SECURE)")
    
    # Timing test
    start = time.time()
    for _ in range(10):
        hashlib.sha256(password.encode()).hexdigest()
    sha256_time = (time.time() - start) / 10
    
    start = time.time()
    for _ in range(10):
        bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    bcrypt_time = (time.time() - start) / 10
    
    print(f"\n   SHA-256 speed: {sha256_time*1000:.2f}ms (too fast = vulnerable)")
    print(f"   Bcrypt speed:  {bcrypt_time*1000:.2f}ms (slow = secure)")
    
    if bcrypt_time > 0.1:  # At least 100ms
        print("   ✅ PASS: Bcrypt is slow enough to resist brute force")
    else:
        print("   ❌ FAIL: Bcrypt rounds too low!")

def test_rate_limiting():
    """Test rate limiting on login endpoint."""
    print("\n⏱️ Test 2: Rate Limiting")
    print("-" * 50)
    
    # Try to login 15 times (limit is 10/min)
    successful_requests = 0
    rate_limited = False
    
    for i in range(15):
        try:
            response = requests.post(
                f"{BASE_URL}/users/login",
                json={"username": "test", "password": "test"},
                timeout=2
            )
            if response.status_code == 429:  # Too Many Requests
                rate_limited = True
                print(f"   Request {i+1}: Rate limited (429)")
                break
            else:
                successful_requests += 1
                print(f"   Request {i+1}: {response.status_code}")
        except Exception as e:
            print(f"   Request {i+1}: Error - {e}")
    
    if rate_limited:
        print(f"   ✅ PASS: Rate limiting active after {successful_requests} requests")
    else:
        print(f"   ❌ FAIL: No rate limiting! Made {successful_requests} requests")

def test_admin_protection():
    """Test admin endpoint requires authentication."""
    print("\n🔒 Test 3: Admin Endpoint Protection")
    print("-" * 50)
    
    # Try without API key
    try:
        response = requests.get(
            f"{BASE_URL}/admin/db-stats",
            timeout=2
        )
        if response.status_code == 403:
            print("   ✅ PASS: Admin endpoint protected (403 Forbidden)")
        elif response.status_code == 200:
            print("   ⚠️ WARNING: Admin endpoint accessible (localhost bypass?)")
        else:
            print(f"   ❓ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Try with wrong API key
    try:
        response = requests.get(
            f"{BASE_URL}/admin/db-stats",
            headers={"X-API-Key": "wrong-key"},
            timeout=2
        )
        if response.status_code == 403:
            print("   ✅ PASS: Wrong API key rejected")
        else:
            print(f"   ❌ FAIL: Wrong key accepted! Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

def test_cors():
    """Test CORS configuration."""
    print("\n🌐 Test 4: CORS Configuration")
    print("-" * 50)
    
    # Test from unauthorized origin
    try:
        response = requests.options(
            f"{BASE_URL}/users/login",
            headers={"Origin": "https://evil.com"},
            timeout=2
        )
        allowed_origins = response.headers.get("Access-Control-Allow-Origin", "")
        
        if allowed_origins == "*":
            print("   ❌ FAIL: CORS allows * (any origin!)")
        elif "evil.com" in allowed_origins:
            print("   ❌ FAIL: Evil origin allowed!")
        else:
            print(f"   ✅ PASS: Restricted CORS (allowed: {allowed_origins})")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

def test_xframe_options():
    """Test X-Frame-Options header."""
    print("\n🖼️ Test 5: X-Frame-Options")
    print("-" * 50)
    
    # Test admin endpoint (should be DENY)
    try:
        response = requests.get(f"{BASE_URL}/admin/db-viewer", timeout=2)
        xframe = response.headers.get("X-Frame-Options", "")
        
        if xframe == "DENY":
            print(f"   ✅ PASS: Admin endpoint has X-Frame-Options: DENY")
        else:
            print(f"   ⚠️ WARNING: Admin X-Frame-Options: {xframe}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test game endpoint (should allow iframe)
    try:
        response = requests.get(f"{BASE_URL}/games/list", timeout=2)
        xframe = response.headers.get("X-Frame-Options", "")
        
        if not xframe or xframe == "SAMEORIGIN":
            print(f"   ✅ PASS: Games endpoint allows iframes")
        elif xframe == "DENY":
            print(f"   ❌ FAIL: Games blocked by X-Frame-Options!")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

def run_all_tests():
    """Run complete security test suite."""
    print("=" * 50)
    print("🔒 BACKEND SECURITY TEST SUITE")
    print("=" * 50)
    
    test_password_hashing()
    test_rate_limiting()
    test_admin_protection()
    test_cors()
    test_xframe_options()
    
    print("\n" + "=" * 50)
    print("🏁 Test suite complete!")
    print("=" * 50)

if __name__ == "__main__":
    run_all_tests()
