"""
Script to create admin_users table in the database.
This table stores admin credentials for accessing protected endpoints like db-viewer.
"""
from pathlib import Path
import sys

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database import get_db_session, engine
from app.models import Base, AdminUser
import bcrypt
from datetime import datetime


def create_admin_table():
    """Create admin_users table."""
    print("Creating admin_users table...")
    Base.metadata.create_all(engine, tables=[AdminUser.__table__])
    print("✅ admin_users table created successfully")


def create_default_admin(username="admin", password="admin123"):
    """Create default admin user."""
    print(f"\nCreating default admin user: {username}")
    
    with get_db_session() as session:
        # Check if admin already exists
        existing_admin = session.query(AdminUser).filter_by(username=username).first()
        if existing_admin:
            print(f"⚠️  Admin user '{username}' already exists")
            return
        
        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create admin user
        now = datetime.now().isoformat()
        admin = AdminUser(
            username=username,
            password_hash=password_hash,
            email=f"{username}@gameplatform.local",
            is_active=1,
            created_at=now,
            updated_at=now
        )
        
        session.add(admin)
        session.commit()
        
        print(f"✅ Admin user created successfully")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"\n⚠️  IMPORTANT: Change the default password immediately!")


def add_admin_user(username, password, email=None):
    """Add a new admin user."""
    print(f"\nAdding admin user: {username}")
    
    with get_db_session() as session:
        # Check if admin already exists
        existing_admin = session.query(AdminUser).filter_by(username=username).first()
        if existing_admin:
            print(f"❌ Admin user '{username}' already exists")
            return False
        
        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create admin user
        now = datetime.now().isoformat()
        admin = AdminUser(
            username=username,
            password_hash=password_hash,
            email=email or f"{username}@gameplatform.local",
            is_active=1,
            created_at=now,
            updated_at=now
        )
        
        session.add(admin)
        session.commit()
        
        print(f"✅ Admin user '{username}' created successfully")
        return True


def list_admin_users():
    """List all admin users."""
    print("\nAdmin Users:")
    print("-" * 80)
    
    with get_db_session() as session:
        admins = session.query(AdminUser).all()
        
        if not admins:
            print("No admin users found")
            return
        
        for admin in admins:
            status = "ACTIVE" if admin.is_active else "INACTIVE"
            print(f"ID: {admin.admin_id} | Username: {admin.username} | Email: {admin.email} | Status: {status}")
            print(f"   Created: {admin.created_at} | Last Login: {admin.last_login or 'Never'}")
            print("-" * 80)


if __name__ == "__main__":
    import os
    
    print("=" * 80)
    print("Admin Users Setup")
    print("=" * 80)
    
    # Create table
    create_admin_table()
    
    # Get credentials from environment variables
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "changeme123")
    
    if admin_password == "changeme123":
        print("\n⚠️  WARNING: Using default password! Set ADMIN_PASSWORD environment variable!")
    
    # Create default admin
    create_default_admin(admin_username, admin_password)
    
    # List all admins
    list_admin_users()
    
    print("\n" + "=" * 80)
    print("Setup complete!")
    print("=" * 80)
