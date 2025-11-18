"""
Update Space Clicker thumbnail to use local image
"""
from app.database import get_db_connection

print("========================================")
print("  Updating Space Clicker Thumbnail")
print("========================================\n")

conn = get_db_connection()
cursor = conn.cursor()

# Update thumbnail to local path
cursor.execute("""
    UPDATE games 
    SET thumbnail = 'thumbnail.png'
    WHERE game_id = 'space-clicker'
""")

conn.commit()

if cursor.rowcount > 0:
    print("✅ Thumbnail updated successfully!")
    print("   Game: Space Clicker")
    print("   New thumbnail: thumbnail.png")
else:
    print("⚠️  Game not found in database")

conn.close()
print("\nDone!")
