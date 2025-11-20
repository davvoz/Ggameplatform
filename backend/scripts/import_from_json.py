"""
Import games, quests and xp_rules from JSON backup to SQLite database using SQLAlchemy ORM
Usage: python import_from_json.py <json_file>
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db_session
from app.models import Game, XPRule, Quest

def import_data(json_file):
    """Import games, quests and xp_rules from JSON backup."""
    
    print("="*60)
    print("📥 IMPORT FROM JSON BACKUP")
    print("="*60)
    print(f"📄 File: {json_file}\n")
    
    # Carica il JSON
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Errore nel caricamento del JSON: {e}")
        return False
    
    # Get backup info
    backup_info = data.get('tables', data)  # Support both old and new format
    
    with get_db_session() as db:
        try:
            # Clear existing data
            print("🗑️  Svuoto le tabelle esistenti...")
            db.query(XPRule).delete()
            print("   ✅ XP Rules cancellate")
            db.query(Quest).delete()
            print("   ✅ Quest cancellate")
            db.query(Game).delete()
            print("   ✅ Games cancellati")
            db.commit()
            
            # Import games
            games_data = backup_info.get('games', [])
            if games_data:
                print(f"\n📦 Importo {len(games_data)} giochi...")
                for game_data in games_data:
                    game = Game(
                        game_id=game_data['game_id'],
                        title=game_data.get('title', game_data.get('name', '')),
                        description=game_data.get('description', ''),
                        author=game_data.get('author', ''),
                        version=game_data.get('version', '1.0.0'),
                        thumbnail=game_data.get('thumbnail', game_data.get('thumbnail_url', '')),
                        entry_point=game_data.get('entry_point', 'index.html'),
                        category=game_data.get('category', 'action'),
                        tags=json.dumps(game_data.get('tags', [])),
                        created_at=game_data.get('created_at', datetime.utcnow().isoformat()),
                        updated_at=game_data.get('updated_at', datetime.utcnow().isoformat()),
                        extra_data=json.dumps(game_data.get('extra_data', game_data.get('metadata', {})))
                    )
                    db.add(game)
                    print(f"   - {game.game_id}: {game.title}")
                db.commit()
                print(f"   ✅ {len(games_data)} giochi importati")
            
            # Import quests
            quests_data = backup_info.get('quests', [])
            if quests_data:
                print(f"\n🎯 Importo {len(quests_data)} quest...")
                for quest_data in quests_data:
                    quest = Quest(
                        title=quest_data.get('title', quest_data.get('name', '')),
                        description=quest_data.get('description', ''),
                        quest_type=quest_data.get('quest_type', ''),
                        target_value=quest_data.get('target_value', 0),
                        xp_reward=quest_data.get('xp_reward', 0),
                        sats_reward=quest_data.get('sats_reward', 0),
                        is_active=quest_data.get('is_active', 1),
                        created_at=quest_data.get('created_at', datetime.utcnow().isoformat())
                    )
                    db.add(quest)
                    print(f"   - {quest.title}: {quest.xp_reward} XP")
                db.commit()
                print(f"   ✅ {len(quests_data)} quest importate")
            
            # Import xp_rules
            xp_rules_data = backup_info.get('xp_rules', [])
            if xp_rules_data:
                print(f"\n⚡ Importo {len(xp_rules_data)} regole XP...")
                
                import uuid
                
                for rule_data in xp_rules_data:
                    # Handle both old and new format
                    if 'parameters' in rule_data and isinstance(rule_data['parameters'], dict):
                        parameters = rule_data['parameters']
                    else:
                        # Convert old format to new
                        parameters = {
                            'event_type': rule_data.get('event_type', 'session_complete'),
                            'xp_amount': rule_data.get('xp_amount', 0),
                            'condition_field': rule_data.get('condition_field'),
                            'condition_operator': rule_data.get('condition_operator'),
                            'condition_value': rule_data.get('condition_value')
                        }
                    
                    # Generate rule_id if missing
                    rule_id = rule_data.get('rule_id')
                    if not rule_id:
                        rule_id = f"xpr_{uuid.uuid4().hex[:16]}"
                    
                    xp_rule = XPRule(
                        rule_id=rule_id,
                        game_id=rule_data['game_id'],
                        rule_name=rule_data.get('rule_name', f"Rule for {parameters.get('event_type', 'event')}"),
                        rule_type=rule_data.get('rule_type', parameters.get('event_type', 'session_complete')),
                        parameters=json.dumps(parameters),
                        priority=rule_data.get('priority', 0),
                        is_active=rule_data.get('is_active', 1),
                        created_at=rule_data.get('created_at', datetime.utcnow().isoformat()),
                        updated_at=rule_data.get('updated_at', datetime.utcnow().isoformat())
                    )
                    db.add(xp_rule)
                    print(f"   - {xp_rule.game_id}: {xp_rule.rule_name}")
                db.commit()
                print(f"   ✅ {len(xp_rules_data)} regole XP importate")
            
            # Summary
            print("\n" + "="*60)
            print("📋 RIEPILOGO IMPORT")
            print("="*60)
            print(f"Games:     {len(games_data)}")
            print(f"Quests:    {len(quests_data)}")
            print(f"XP Rules:  {len(xp_rules_data)}")
            print("="*60)
            print("\n✅ Import completato con successo!")
            
            return True
            
        except Exception as e:
            db.rollback()
            print(f"\n❌ Errore durante l'import: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python import_from_json.py <json_file>")
        print("Example: python import_from_json.py ../backups/backup.json")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    if not Path(json_file).exists():
        print(f"❌ File non trovato: {json_file}")
        sys.exit(1)
    
    success = import_data(json_file)
    sys.exit(0 if success else 1)
