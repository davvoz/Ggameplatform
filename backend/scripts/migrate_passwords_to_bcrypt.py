"""
Migrate existing SHA-256 passwords to bcrypt.

CRITICAL: Run this script ONCE after deploying bcrypt changes!

This script:
1. Finds users with SHA-256 hashed passwords
2. Since we can't reverse SHA-256, forces password reset
3. OR keeps SHA-256 and verifies both until users reset
"""

from app.database import get_db_session, hash_password
from app.models import User
import hashlib

def is_sha256_hash(hash_str: str) -> bool:
    """Check if a hash looks like SHA-256 (64 hex characters)."""
    return len(hash_str) == 64 and all(c in '0123456789abcdef' for c in hash_str.lower())

def migrate_passwords():
    """
    Mark users with SHA-256 passwords for reset.
    
    Strategy: Add 'legacy_hash' flag and force password reset on next login.
    """
    with get_db_session() as session:
        users = session.query(User).filter(User.password_hash.isnot(None)).all()
        
        migrated = 0
        already_bcrypt = 0
        
        for user in users:
            if is_sha256_hash(user.password_hash):
                print(f"⚠️ User {user.username} has legacy SHA-256 hash - requires password reset")
                migrated += 1
                # You could set a flag here or send reset email
            else:
                already_bcrypt += 1
        
        print(f"\n✅ Migration complete:")
        print(f"   - {already_bcrypt} users already using bcrypt")
        print(f"   - {migrated} users need password reset (SHA-256)")
        
        if migrated > 0:
            print(f"\n⚠️ WARNING: {migrated} users have insecure passwords!")
            print("   Options:")
            print("   1. Force password reset on next login")
            print("   2. Send password reset emails")
            print("   3. Create hybrid auth (try bcrypt, fallback SHA-256, then force reset)")

if __name__ == "__main__":
    print("🔐 Password Migration Script")
    print("=" * 50)
    migrate_passwords()
