"""
Setup Tower Defense 3D - Complete initialization script
This script:
1. Creates the preview thumbnail
2. Registers the game in the database
3. Creates XP rules
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import create_game, get_game_by_id, create_xp_rule, get_game_xp_rules
from PIL import Image, ImageDraw, ImageFont

def create_thumbnail():
    """Create Tower Defense 3D thumbnail."""
    print("\n" + "=" * 60)
    print("🖼️  CREATING TOWER DEFENSE THUMBNAIL")
    print("=" * 60)
    
    # Create thumbnail directory if it doesn't exist
    thumbnail_dir = os.path.join(os.path.dirname(__file__), '..', 'app', 'games', 'tower_defense')
    os.makedirs(thumbnail_dir, exist_ok=True)
    
    thumbnail_path = os.path.join(thumbnail_dir, 'thumbnail.png')
    
    # Check if thumbnail already exists
    if os.path.exists(thumbnail_path):
        print(f"⚠️  Thumbnail already exists at: {thumbnail_path}")
        return thumbnail_path
    
    # Create a 400x300 image with gradient background
    width, height = 400, 300
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    # Create gradient background (dark blue to cyan)
    for y in range(height):
        r = int(5 + (108 - 5) * (y / height))
        g = int(7 + (243 - 7) * (y / height))
        b = int(12 + (197 - 12) * (y / height))
        draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))
    
    # Draw title and elements
    try:
        # Try to use a system font
        try:
            title_font = ImageFont.truetype("arial.ttf", 48)
            subtitle_font = ImageFont.truetype("arial.ttf", 24)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
        
        # Draw title
        title = "TOWER"
        subtitle = "DEFENSE 3D"
        
        # Get text bounding boxes
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
        
        title_width = title_bbox[2] - title_bbox[0]
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        
        # Center text
        title_x = (width - title_width) // 2
        title_y = height // 2 - 40
        subtitle_x = (width - subtitle_width) // 2
        subtitle_y = title_y + 50
        
        # Draw text with shadow
        shadow_offset = 2
        draw.text((title_x + shadow_offset, title_y + shadow_offset), title, 
                 fill=(0, 0, 0, 128), font=title_font)
        draw.text((title_x, title_y), title, fill=(255, 255, 255), font=title_font)
        
        draw.text((subtitle_x + shadow_offset, subtitle_y + shadow_offset), subtitle,
                 fill=(0, 0, 0, 128), font=subtitle_font)
        draw.text((subtitle_x, subtitle_y), subtitle, fill=(108, 243, 197), font=subtitle_font)
        
    except Exception as e:
        print(f"⚠️  Could not add text: {e}")
    
    # Draw decorative elements (towers)
    tower_color = (41, 163, 255)
    # Left tower
    draw.rectangle([(50, 200), (70, 250)], fill=tower_color, outline=(255, 255, 255))
    draw.polygon([(40, 200), (60, 180), (80, 200)], fill=(108, 243, 197))
    
    # Right tower
    draw.rectangle([(330, 180), (350, 250)], fill=tower_color, outline=(255, 255, 255))
    draw.polygon([(320, 180), (340, 160), (360, 180)], fill=(108, 243, 197))
    
    # Save thumbnail
    img.save(thumbnail_path)
    print(f"✅ Thumbnail created at: {thumbnail_path}")
    return thumbnail_path

def register_game():
    """Register Tower Defense 3D game."""
    print("\n" + "=" * 60)
    print("🎮 REGISTERING TOWER DEFENSE 3D")
    print("=" * 60)
    
    game_data = {
        'gameId': 'tower_defense',
        'title': 'Tower Defense 3D',
        'description': 'Un emozionante gioco tower defense 3D! Costruisci torri strategiche per difendere la tua base dalle ondate di nemici. Migliora le torri, sblocca abilità speciali e sopravvivi alle ondate infinite. Gioco completamente integrato con Platform SDK per tracking punteggi e progressi.',
        'author': 'Platform Team',
        'version': '1.0.0',
        'thumbnail': 'thumbnail.png',
        'entryPoint': 'index.html',
        'category': 'strategy',
        'tags': ['tower-defense', 'strategy', '3d', 'action', 'arcade'],
        'metadata': {
            'minPlayers': 1,
            'maxPlayers': 1,
            'difficulty': 'medium',
            'rating': 4.7,
            'playCount': 0,
            'featured': True,
            'additionalData': {
                'controls': 'Mouse + Touch',
                'gameType': 'Tower Defense Strategy',
                'playtime': '10-30 minutes',
                'features': [
                    '3D Graphics con Three.js',
                    'Sistema di upgrade torri',
                    'Skill tree per torri',
                    'Ondate infinite',
                    'Sistema audio procedurale',
                    'Supporto mobile e desktop'
                ]
            }
        }
    }
    
    # Check if game already exists
    existing = get_game_by_id('tower_defense')
    if existing:
        print('⚠️  Game "Tower Defense 3D" already exists in database')
        print('    Game ID: tower_defense')
        print('    Title:', existing['title'])
        return existing
    
    # Register the game
    try:
        created = create_game(game_data)
        print('✅ Game registered successfully!')
        print('   Game ID:', created['game_id'])
        print('   Title:', created['title'])
        print('   Category:', created.get('category', 'N/A'))
        print('   Tags:', ', '.join(created.get('tags', [])))
        return created
    except Exception as e:
        print(f'❌ Error registering game: {e}')
        raise

def create_xp_rules():
    """Create XP rules for Tower Defense 3D."""
    print("\n" + "=" * 60)
    print("🗼 CREATING XP RULES FOR TOWER DEFENSE 3D")
    print("=" * 60)
    
    game_id = 'tower_defense'
    
    # Check if rules already exist
    existing_rules = get_game_xp_rules(game_id, active_only=False)
    if existing_rules:
        print(f"⚠️  Rules already exist ({len(existing_rules)} rules)")
        print("\nExisting rules:")
        for rule in existing_rules:
            print(f"  • {rule['rule_name']} ({rule['rule_type']}) - Priority: {rule['priority']}")
        return existing_rules
    
    print(f"\n📝 Creating rules for Tower Defense 3D...")
    
    rules = []
    
    # Base score multiplier rule
    create_xp_rule(
        game_id=game_id,
        rule_name="Base Score Multiplier",
        rule_type="score_multiplier",
        parameters={
            "multiplier": 0.02,
            "max_xp": 150.0
        },
        priority=10
    )
    print("   ✅ Base Score Multiplier")
    
    # Time played bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Time Played Bonus",
        rule_type="time_bonus",
        parameters={
            "xp_per_minute": 0.2,
            "max_minutes": 15
        },
        priority=5
    )
    print("   ✅ Time Played Bonus")
    
    # High score bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="High Score Bonus",
        rule_type="high_score_bonus",
        parameters={
            "bonus_xp": 15.0
        },
        priority=15
    )
    print("   ✅ High Score Bonus")
    
    # Wave Survivor Milestones
    create_xp_rule(
        game_id=game_id,
        rule_name="Wave Survivor Milestones",
        rule_type="threshold",
        parameters={
            "thresholds": [
                {"score": 10000, "xp": 150},
                {"score": 7500, "xp": 100},
                {"score": 5000, "xp": 75},
                {"score": 3000, "xp": 50},
                {"score": 1500, "xp": 30},
                {"score": 750, "xp": 15},
                {"score": 300, "xp": 5}
            ]
        },
        priority=20
    )
    print("   ✅ Wave Survivor Milestones")
    
    # Strategic Defense Bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Strategic Defense Bonus",
        rule_type="achievement",
        parameters={
            "achievement_key": "strategic_defense",
            "bonus_xp": 25.0
        },
        priority=12
    )
    print("   ✅ Strategic Defense Bonus")
    
    # Win streak bonus
    create_xp_rule(
        game_id=game_id,
        rule_name="Win Streak Bonus",
        rule_type="win_streak",
        parameters={
            "base_xp": 5.0,
            "max_streak": 10,
            "xp_per_streak": 2.0
        },
        priority=8
    )
    print("   ✅ Win Streak Bonus")
    
    # Verify rules were created
    final_rules = get_game_xp_rules(game_id, active_only=True)
    print(f"\n📊 Total active rules: {len(final_rules)}")
    print("\nActive rules summary:")
    for rule in final_rules:
        print(f"  • {rule['rule_name']} (Priority: {rule['priority']})")
    
    return final_rules

def main():
    """Main setup function."""
    print("\n" + "=" * 60)
    print("🚀 TOWER DEFENSE 3D - COMPLETE SETUP")
    print("=" * 60)
    
    try:
        # Step 1: Create thumbnail
        thumbnail_path = create_thumbnail()
        
        # Step 2: Register game
        game = register_game()
        
        # Step 3: Create XP rules
        rules = create_xp_rules()
        
        # Final summary
        print("\n" + "=" * 60)
        print("✅ TOWER DEFENSE 3D SETUP COMPLETED!")
        print("=" * 60)
        print("\n📋 Summary:")
        print(f"   • Thumbnail: {thumbnail_path if thumbnail_path else 'Already exists'}")
        print(f"   • Game ID: tower_defense")
        print(f"   • XP Rules: {len(rules) if isinstance(rules, list) else 'Already configured'}")
        print("\n🎮 Play the game at:")
        print("   http://localhost:3000/#/play/tower_defense")
        print("\n📊 View game details at:")
        print("   http://localhost:3000/#/game/tower_defense")
        print()
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
