"""
Backup Script - Games, Quests e XP Rules
Esporta le tabelle games, quests e xp_rules in formato JSON
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

# Path del database
DATABASE_PATH = Path(__file__).parent.parent / "app" / "game_platform.db"
BACKUP_DIR = Path(__file__).parent.parent / "backups"

def backup_games_quests_xp():
    """Crea un backup di games, quests e xp_rules"""
    # Crea directory di backup se non esiste
    BACKUP_DIR.mkdir(exist_ok=True)
    
    # Timestamp per il nome del file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Verifica esistenza database
    if not DATABASE_PATH.exists():
        print(f"❌ Database non trovato: {DATABASE_PATH}")
        return None
    
    print(f"📂 Database: {DATABASE_PATH}")
    print(f"📂 Backup directory: {BACKUP_DIR}")
    print(f"⏰ Timestamp: {timestamp}\n")
    
    # Connessione al database
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    backup_data = {
        "backup_date": datetime.utcnow().isoformat(),
        "backup_timestamp": timestamp,
        "description": "Backup di Games, Quests e XP Rules",
        "tables": {}
    }
    
    # ========== BACKUP GAMES ==========
    print("🎮 Esportazione Games...")
    try:
        cursor.execute("SELECT * FROM games")
        games = [dict(row) for row in cursor.fetchall()]
        
        # Parse JSON fields
        for game in games:
            if game.get('tags'):
                try:
                    game['tags'] = json.loads(game['tags'])
                except:
                    game['tags'] = []
            if game.get('extra_data'):
                try:
                    game['extra_data'] = json.loads(game['extra_data'])
                except:
                    game['extra_data'] = {}
        
        backup_data['tables']['games'] = games
        print(f"   ✅ {len(games)} giochi esportati")
        
        # Stampa elenco giochi
        for game in games:
            print(f"      - {game['game_id']}: {game['title']}")
            
    except Exception as e:
        print(f"   ❌ Errore nell'export dei games: {e}")
        backup_data['tables']['games'] = []
    
    # ========== BACKUP XP RULES ==========
    print("\n⭐ Esportazione XP Rules...")
    try:
        cursor.execute("SELECT * FROM xp_rules ORDER BY game_id, priority DESC")
        xp_rules = [dict(row) for row in cursor.fetchall()]
        
        # Parse JSON parameters
        for rule in xp_rules:
            if rule.get('parameters'):
                try:
                    rule['parameters'] = json.loads(rule['parameters'])
                except:
                    rule['parameters'] = {}
        
        backup_data['tables']['xp_rules'] = xp_rules
        print(f"   ✅ {len(xp_rules)} regole XP esportate")
        
        # Stampa riepilogo per gioco
        games_with_rules = {}
        for rule in xp_rules:
            game_id = rule['game_id']
            if game_id not in games_with_rules:
                games_with_rules[game_id] = []
            games_with_rules[game_id].append(rule)
        
        for game_id, rules in games_with_rules.items():
            print(f"      - {game_id}: {len(rules)} regole")
            for rule in rules:
                print(f"         • {rule['rule_name']} ({rule['rule_type']})")
                
    except Exception as e:
        print(f"   ❌ Errore nell'export delle XP rules: {e}")
        backup_data['tables']['xp_rules'] = []
    
    # ========== BACKUP QUESTS ==========
    print("\n🎯 Esportazione Quests...")
    try:
        cursor.execute("SELECT * FROM quests ORDER BY quest_id")
        quests = [dict(row) for row in cursor.fetchall()]
        
        backup_data['tables']['quests'] = quests
        print(f"   ✅ {len(quests)} quest esportate")
        
        # Stampa elenco quests
        for quest in quests:
            status = "🟢 Attiva" if quest['is_active'] else "🔴 Inattiva"
            print(f"      - [{quest['quest_id']}] {quest['title']} - {status}")
            print(f"         Tipo: {quest['quest_type']}, Target: {quest['target_value']}, XP: {quest['xp_reward']}")
            
    except Exception as e:
        print(f"   ❌ Errore nell'export delle quests: {e}")
        backup_data['tables']['quests'] = []
    
    conn.close()
    
    # ========== SALVATAGGIO FILE JSON ==========
    backup_json_path = BACKUP_DIR / f"games_quests_xp_{timestamp}.json"
    
    try:
        with open(backup_json_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Backup salvato con successo!")
        print(f"📄 File: {backup_json_path}")
        print(f"📊 Dimensione: {backup_json_path.stat().st_size / 1024:.2f} KB")
    except Exception as e:
        print(f"\n❌ Errore nel salvataggio del file: {e}")
        return None
    
    # ========== RIEPILOGO ==========
    print("\n" + "="*60)
    print("📋 RIEPILOGO BACKUP")
    print("="*60)
    print(f"Games:     {len(backup_data['tables']['games'])}")
    print(f"XP Rules:  {len(backup_data['tables']['xp_rules'])}")
    print(f"Quests:    {len(backup_data['tables']['quests'])}")
    print("="*60)
    
    return backup_json_path

if __name__ == "__main__":
    print("="*60)
    print("🔄 BACKUP GAMES, QUESTS E XP RULES")
    print("="*60)
    print()
    
    backup_path = backup_games_quests_xp()
    
    if backup_path:
        print(f"\n✅ Backup completato con successo!")
        print(f"📁 Percorso: {backup_path}")
    else:
        print(f"\n❌ Backup fallito!")
