"""
Database Backup Script
Esporta tutti i dati dal database esistente prima della migrazione a SQLAlchemy ORM
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DATABASE_PATH = Path(__file__).parent.parent / "data" / "game_platform.db"
BACKUP_DIR = Path(__file__).parent.parent / "backups"

def backup_database():
    """Crea un backup completo del database"""
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Backup del file SQLite
    import shutil
    if DATABASE_PATH.exists():
        backup_db_path = BACKUP_DIR / f"game_platform_{timestamp}.db"
        shutil.copy2(DATABASE_PATH, backup_db_path)
        print(f"✅ Database file backed up to: {backup_db_path}")
    
    # Backup JSON dei dati
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    backup_data = {
        "backup_date": datetime.utcnow().isoformat(),
        "database_version": "1.0",
        "tables": {}
    }
    
    # Export games
    cursor.execute("SELECT * FROM games")
    games = [dict(row) for row in cursor.fetchall()]
    for game in games:
        if game.get('tags'):
            game['tags'] = json.loads(game['tags'])
        if game.get('metadata'):
            game['metadata'] = json.loads(game['metadata'])
    backup_data['tables']['games'] = games
    print(f"✅ Backed up {len(games)} games")
    
    # Export users
    cursor.execute("SELECT * FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    for user in users:
        if user.get('metadata'):
            user['metadata'] = json.loads(user['metadata'])
        if user.get('game_scores'):
            user['game_scores'] = json.loads(user['game_scores'])
    backup_data['tables']['users'] = users
    print(f"✅ Backed up {len(users)} users")
    
    # Export game_sessions
    cursor.execute("SELECT * FROM game_sessions")
    sessions = [dict(row) for row in cursor.fetchall()]
    for session in sessions:
        if session.get('metadata'):
            session['metadata'] = json.loads(session['metadata'])
    backup_data['tables']['game_sessions'] = sessions
    print(f"✅ Backed up {len(sessions)} game sessions")
    
    # Export user_achievements
    cursor.execute("SELECT * FROM user_achievements")
    achievements = [dict(row) for row in cursor.fetchall()]
    backup_data['tables']['user_achievements'] = achievements
    print(f"✅ Backed up {len(achievements)} achievements")
    
    # Export leaderboards
    cursor.execute("SELECT * FROM leaderboards")
    leaderboards = [dict(row) for row in cursor.fetchall()]
    backup_data['tables']['leaderboards'] = leaderboards
    print(f"✅ Backed up {len(leaderboards)} leaderboard entries")
    
    conn.close()
    
    # Save JSON backup
    backup_json_path = BACKUP_DIR / f"game_platform_{timestamp}.json"
    with open(backup_json_path, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False)
    print(f"✅ JSON backup saved to: {backup_json_path}")
    
    return backup_json_path

if __name__ == "__main__":
    print("🔄 Starting database backup...")
    backup_path = backup_database()
    print(f"\n✅ Backup completed successfully!")
    print(f"📁 Backup location: {backup_path}")
