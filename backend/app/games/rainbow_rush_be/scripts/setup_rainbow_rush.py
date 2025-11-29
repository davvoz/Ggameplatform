"""
Setup script to create Rainbow Rush API structure
Creates necessary directories and files for modular game API
"""
import os
from pathlib import Path

# Base path
base_path = Path(__file__).parent / "app"

# Directories to create
directories = [
    base_path / "routers" / "games",
    base_path / "services" / "games",
    base_path / "repositories" / "games",
    base_path / "models" / "games",
    base_path / "schemas" / "games",
]

print("Creating directory structure for Rainbow Rush...")
for directory in directories:
    directory.mkdir(parents=True, exist_ok=True)
    print(f"✅ Created: {directory}")
    
    # Create __init__.py
    init_file = directory / "__init__.py"
    if not init_file.exists():
        init_file.write_text('"""Package initialization"""\\n')
        print(f"   └─ __init__.py")

print("\\n✅ Directory structure created successfully!")
print("\\nNext files to create:")
print("1. app/models/games/rainbow_rush_models.py")
print("2. app/schemas/games/rainbow_rush_schemas.py")
print("3. app/repositories/games/rainbow_rush_repository.py")
print("4. app/services/games/rainbow_rush_service.py")
print("5. app/routers/games/rainbow_rush.py")
