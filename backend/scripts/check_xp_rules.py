"""
Quick script to check XP Rules in database
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import get_db_session
from app.models import XPRule, Game

def check_xp_rules():
    """Check XP rules in the database."""
    print("=" * 60)
    print("🔍 CHECKING XP RULES")
    print("=" * 60)
    
    with get_db_session() as session:
        # Count total rules
        total_rules = session.query(XPRule).count()
        print(f"\n📊 Total XP Rules: {total_rules}")
        
        if total_rules == 0:
            print("\n⚠️  NO XP RULES FOUND IN DATABASE!")
            print("\n💡 To fix this, run:")
            print("   python backend\\migrate_xp_rules.py")
            return False
        
        # Show rules per game
        print("\n📋 Rules by Game:")
        games = session.query(Game).all()
        
        for game in games:
            rules = session.query(XPRule).filter(XPRule.game_id == game.game_id).all()
            active_rules = [r for r in rules if r.is_active]
            
            print(f"\n  🎮 {game.title} ({game.game_id})")
            print(f"     Total rules: {len(rules)}")
            print(f"     Active rules: {len(active_rules)}")
            
            if rules:
                print(f"     Rules:")
                for rule in rules:
                    status = "✅" if rule.is_active else "❌"
                    print(f"       {status} {rule.rule_name} ({rule.rule_type}) - Priority: {rule.priority}")
        
        print("\n" + "=" * 60)
        print("✅ CHECK COMPLETED")
        print("=" * 60)
        return True

if __name__ == "__main__":
    try:
        success = check_xp_rules()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
