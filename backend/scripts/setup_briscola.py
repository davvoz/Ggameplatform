"""
Setup Briscola - Complete initialization script
This umbrella script handles the entire setup process for Briscola:
1. Verifies game files exist
2. Creates the preview thumbnail
3. Registers the game in the database
4. Creates XP rules
5. Creates quests
"""
import sys
import os
import time
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Game, XPRule, Quest

# Configuration
GAME_ID = 'briscola'
GAME_TITLE = 'Briscola'
GAME_DIR = Path(__file__).parent.parent / 'app' / 'games' / 'briscola'


class BriscolaSetup:
    """Complete setup handler for Briscola game."""
    
    def __init__(self, verbose=True, dry_run=False):
        self.verbose = verbose
        self.dry_run = dry_run
        self.stats = {
            'game_registered': False,
            'xp_rules_created': 0,
            'xp_rules_skipped': 0,
            'quests_created': 0,
            'quests_skipped': 0,
            'errors': []
        }
    
    def log(self, message, level='info'):
        """Print log message if verbose mode is enabled."""
        if self.verbose:
            prefix = {
                'info': '📋',
                'success': '✅',
                'warning': '⚠️',
                'error': '❌',
                'skip': '⏭️',
                'step': '🔹'
            }.get(level, '•')
            print(f"{prefix}  {message}")
    
    def print_header(self, title):
        """Print a section header."""
        if self.verbose:
            print()
            print("=" * 70)
            print(f"  {title}")
            print("=" * 70)
            print()
    
    def verify_game_files(self):
        """Verify that required game files exist."""
        self.print_header("🔍 STEP 1: VERIFYING GAME FILES")
        
        required_files = [
            'index.html',
            'js/main.js',
            'css/style.css',
            'js/controllers/GameController.js',
            'js/controllers/MenuController.js',
            'js/controllers/MultiplayerController.js',
            'js/ai/AIPlayer.js',
            'js/core/GameEngine.js',
            'js/core/Cards.js',
            'js/platform/PlatformBridge.js',
            'js/ui/UIManager.js',
            'js/audio/SoundManager.js',
            'js/graphics/SpriteSheet.js'
        ]
        
        missing_files = []
        for file in required_files:
            file_path = GAME_DIR / file
            if file_path.exists():
                self.log(f"Found: {file}", 'step')
            else:
                missing_files.append(file)
                self.log(f"Missing: {file}", 'warning')
        
        if missing_files:
            self.log(f"Warning: {len(missing_files)} files not found. Game may not work correctly.", 'warning')
            return False
        
        self.log(f"All {len(required_files)} required files verified!", 'success')
        return True
    
    def create_thumbnail(self):
        """Create the game thumbnail."""
        self.print_header("🖼️  STEP 2: CREATING THUMBNAIL")
        
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            self.log("PIL/Pillow not installed. Run: pip install Pillow", 'warning')
            return None
        
        # Thumbnail paths
        assets_dir = GAME_DIR / 'assets'
        assets_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_path = assets_dir / 'thumbnail.png'
        
        # Also create at game root for backwards compatibility
        root_thumbnail_path = GAME_DIR / 'thumbnail.png'
        
        if thumbnail_path.exists() and root_thumbnail_path.exists():
            self.log("Thumbnail already exists - skipping", 'skip')
            return str(thumbnail_path)
        
        if self.dry_run:
            self.log("DRY RUN: Would create thumbnail", 'info')
            return None
        
        # Create thumbnail
        width, height = 400, 300
        img = Image.new('RGB', (width, height), color='#1a472a')  # Dark green like card table
        draw = ImageDraw.Draw(img)
        
        # Draw subtle pattern (card table texture)
        for i in range(0, width, 20):
            for j in range(0, height, 20):
                if (i + j) % 40 == 0:
                    draw.rectangle([i, j, i + 2, j + 2], fill='#1d5030')
        
        # Draw main card (slightly rotated effect with shadow)
        card_x, card_y = 120, 50
        card_w, card_h = 160, 200
        
        # Card shadow
        shadow_offset = 8
        draw.rounded_rectangle(
            [card_x + shadow_offset, card_y + shadow_offset, 
             card_x + card_w + shadow_offset, card_y + card_h + shadow_offset],
            radius=10,
            fill='#0a2a1a'
        )
        
        # Card border
        draw.rounded_rectangle(
            [card_x - 2, card_y - 2, card_x + card_w + 2, card_y + card_h + 2],
            radius=12,
            fill='#8b4513'  # Brown border
        )
        
        # Card background (cream colored)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=10,
            fill='#fffef0'
        )
        
        # Card decorative corner pattern
        corner_color = '#c41e3a'
        # Top left corner
        draw.polygon([(card_x + 10, card_y + 10), (card_x + 30, card_y + 10), 
                      (card_x + 10, card_y + 30)], fill=corner_color)
        # Bottom right corner
        draw.polygon([(card_x + card_w - 10, card_y + card_h - 10), 
                      (card_x + card_w - 30, card_y + card_h - 10), 
                      (card_x + card_w - 10, card_y + card_h - 30)], fill=corner_color)
        
        # Try to use a font for the card symbol
        try:
            large_font = ImageFont.truetype("arial.ttf", 72)
            small_font = ImageFont.truetype("arial.ttf", 28)
            title_font = ImageFont.truetype("arial.ttf", 36)
        except:
            large_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
            title_font = ImageFont.load_default()
        
        # Draw card symbol (Ace of Coins/Denari)
        symbol_color = '#ffd700'  # Gold for coins
        # Center symbol
        draw.text((card_x + 55, card_y + 55), "🪙", font=large_font, fill=symbol_color)
        # Small corner indicators
        draw.text((card_x + 15, card_y + 35), "A", font=small_font, fill='#333333')
        draw.text((card_x + card_w - 30, card_y + card_h - 55), "A", font=small_font, fill='#333333')
        
        # Draw second card peeking from behind (left side)
        peek_card_x = card_x - 40
        peek_card_y = card_y + 20
        draw.rounded_rectangle(
            [peek_card_x, peek_card_y, peek_card_x + 50, peek_card_y + card_h - 40],
            radius=8,
            fill='#2a5f3a'  # Card back color
        )
        # Card back pattern
        for py in range(peek_card_y + 10, peek_card_y + card_h - 50, 15):
            draw.line([(peek_card_x + 5, py), (peek_card_x + 45, py)], fill='#1d472a', width=2)
        
        # Draw title with shadow
        title = "BRISCOLA"
        try:
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (width - title_width) // 2
            title_y = 262
            
            # Shadow
            draw.text((title_x + 2, title_y + 2), title, font=title_font, fill='#000000')
            # Main text with golden gradient effect
            draw.text((title_x, title_y), title, font=title_font, fill='#ffd700')
        except:
            # Fallback without font metrics
            draw.text((130, 260), title, fill='#ffd700')
        
        # Save thumbnails
        img.save(thumbnail_path)
        img.save(root_thumbnail_path)
        
        self.stats['thumbnail_created'] = True
        self.log(f"Thumbnail created: {thumbnail_path}", 'success')
        self.log(f"Thumbnail copy at: {root_thumbnail_path}", 'success')
        
        return str(thumbnail_path)
    
    def register_game(self):
        """Register Briscola in the database."""
        self.print_header("🎮 STEP 3: REGISTERING GAME")
        
        db = SessionLocal()
        
        try:
            # Check if game already exists
            existing_game = db.query(Game).filter(Game.game_id == GAME_ID).first()
            
            if existing_game:
                self.log(f"Game '{GAME_TITLE}' already exists in database", 'skip')
                self.log(f"   Game ID: {GAME_ID}", 'info')
                self.log(f"   Title: {existing_game.title}", 'info')
                return existing_game
            
            if self.dry_run:
                self.log("DRY RUN: Would register game", 'info')
                return None
            
            game_data = {
                'game_id': GAME_ID,
                'title': GAME_TITLE,
                'description': 'Il classico gioco di carte italiano! Gioca contro l\'AI con 3 livelli di difficoltà, sfida un amico in locale, o gioca online in multiplayer. Ottimizzato per mobile.',
                'author': 'Cur8',
                'version': '1.0.0',
                'entry_point': 'index.html',
                'category': 'cards',
                'tags': json.dumps(['cards', 'italian', 'multiplayer', 'ai', 'classic', 'briscola']),
                'thumbnail': 'thumbnail.png',
                'extra_data': json.dumps({
                    'difficulty': 'medium',
                    'max_players': 2,
                    'min_age': 6,
                    'featured': True,
                    'gameplay': 'turn-based',
                    'theme': 'classic-cards',
                    'graphics': '2d-sprites',
                    'controls': ['mouse', 'touch'],
                    'playTime': 'medium-session',
                    'hasMultiplayer': True,
                    'hasAI': True,
                    'aiLevels': ['easy', 'medium', 'hard'],
                    'responsive': True
                }),
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            
            game = Game(**game_data)
            db.add(game)
            db.commit()
            
            self.stats['game_registered'] = True
            self.log(f"Game '{GAME_TITLE}' registered successfully!", 'success')
            self.log(f"   Game ID: {GAME_ID}", 'step')
            self.log(f"   Category: {game_data['category']}", 'step')
            self.log(f"   Entry Point: {game_data['entry_point']}", 'step')
            
            return game
            
        except Exception as e:
            self.log(f"Error registering game: {e}", 'error')
            self.stats['errors'].append(f"Game registration: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def create_xp_rules(self):
        """Create XP rules for Briscola."""
        self.print_header("📊 STEP 4: CREATING XP RULES")
        
        db = SessionLocal()
        now = datetime.now().isoformat()
        
        xp_rules = [
            {
                'rule_id': 'briscola_participation',
                'game_id': GAME_ID,
                'rule_name': 'Participation Bonus',
                'rule_type': 'flat',
                'parameters': json.dumps({'base_xp': 5}),
                'priority': 5,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_score_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Score Multiplier',
                'rule_type': 'score_multiplier',
                'parameters': json.dumps({
                    'xp_per_point': 0.1,  # 0.1 XP per punto
                    'max_xp': 12  # Max 12 XP (120 punti)
                }),
                'priority': 10,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_victory_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Victory Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'win',
                    'bonus_xp': 15
                }),
                'priority': 15,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_cappotto_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Cappotto Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'perfect_score',  # 120 punti
                    'bonus_xp': 50
                }),
                'priority': 20,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_hard_ai_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Hard AI Victory',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'hard_ai_win',
                    'bonus_xp': 25
                }),
                'priority': 25,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_multiplayer_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Multiplayer Victory',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'multiplayer_win',
                    'bonus_xp': 30
                }),
                'priority': 30,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            },
            {
                'rule_id': 'briscola_domination_bonus',
                'game_id': GAME_ID,
                'rule_name': 'Domination Bonus',
                'rule_type': 'conditional',
                'parameters': json.dumps({
                    'condition': 'domination',  # Win by 40+ points
                    'bonus_xp': 20
                }),
                'priority': 35,
                'is_active': 1,
                'created_at': now,
                'updated_at': now
            }
        ]
        
        try:
            for rule_data in xp_rules:
                # Check if rule already exists
                existing = db.query(XPRule).filter(XPRule.rule_id == rule_data['rule_id']).first()
                
                if existing:
                    self.log(f"Rule '{rule_data['rule_name']}' already exists", 'skip')
                    self.stats['xp_rules_skipped'] += 1
                    continue
                
                if self.dry_run:
                    self.log(f"DRY RUN: Would create rule '{rule_data['rule_name']}'", 'info')
                    continue
                
                rule = XPRule(**rule_data)
                db.add(rule)
                self.log(f"Created rule: {rule_data['rule_name']} (Priority: {rule_data['priority']})", 'success')
                self.stats['xp_rules_created'] += 1
            
            db.commit()
            
        except Exception as e:
            self.log(f"Error creating XP rules: {e}", 'error')
            self.stats['errors'].append(f"XP rules: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def create_quests(self):
        """Create quests for Briscola."""
        self.print_header("🎯 STEP 5: CREATING QUESTS")
        
        db = SessionLocal()
        now = datetime.now().isoformat()
        
        quests = [
            # Gameplay quests
            {
                'title': 'Briscola: Prima Partita',
                'description': 'Completa la tua prima partita di Briscola',
                'quest_type': 'play_games',
                'target_value': 1,
                'xp_reward': 15,
                'reward_coins': 10,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🃏'
                })
            },
            {
                'title': 'Briscola: Giocatore Assiduo',
                'description': 'Gioca 5 partite di Briscola',
                'quest_type': 'play_games',
                'target_value': 5,
                'xp_reward': 25,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🎮'
                })
            },
            {
                'title': 'Briscola: Veterano',
                'description': 'Gioca 20 partite di Briscola',
                'quest_type': 'play_games',
                'target_value': 20,
                'xp_reward': 50,
                'reward_coins': 35,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'games_played',
                    'category': 'gameplay',
                    'icon': '🎖️'
                })
            },
            # Victory quests
            {
                'title': 'Briscola: Prima Vittoria',
                'description': 'Vinci la tua prima partita',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 20,
                'reward_coins': 15,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '🏆'
                })
            },
            {
                'title': 'Briscola: Campione',
                'description': 'Vinci 10 partite',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 75,
                'reward_coins': 50,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '👑'
                })
            },
            {
                'title': 'Briscola: Maestro',
                'description': 'Vinci 50 partite',
                'quest_type': 'score',
                'target_value': 50,
                'xp_reward': 200,
                'reward_coins': 125,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'wins',
                    'category': 'skill',
                    'icon': '🌟'
                })
            },
            # AI difficulty quests
            {
                'title': 'Briscola: Sfidante AI',
                'description': 'Sconfiggi l\'AI difficile',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 30,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'hard_ai_wins',
                    'category': 'challenge',
                    'icon': '🤖'
                })
            },
            {
                'title': 'Briscola: Dominatore AI',
                'description': 'Sconfiggi l\'AI difficile 10 volte',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 100,
                'reward_coins': 75,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'hard_ai_wins',
                    'category': 'challenge',
                    'icon': '🦾'
                })
            },
            # Special achievements
            {
                'title': 'Briscola: Cappotto!',
                'description': 'Vinci con 120 punti (tutti i punti)',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 100,
                'reward_coins': 75,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'perfect_score',
                    'category': 'achievement',
                    'icon': '💯'
                })
            },
            {
                'title': 'Briscola: Dominatore',
                'description': 'Vinci con almeno 40 punti di scarto',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 40,
                'reward_coins': 30,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'domination_win',
                    'category': 'achievement',
                    'icon': '💪'
                })
            },
            # Multiplayer quests
            {
                'title': 'Briscola: Prima Vittoria Online',
                'description': 'Vinci una partita in multiplayer',
                'quest_type': 'score',
                'target_value': 1,
                'xp_reward': 35,
                'reward_coins': 25,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'multiplayer_wins',
                    'category': 'multiplayer',
                    'icon': '🌐'
                })
            },
            {
                'title': 'Briscola: Campione Online',
                'description': 'Vinci 10 partite in multiplayer',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 150,
                'reward_coins': 100,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'multiplayer_wins',
                    'category': 'multiplayer',
                    'icon': '🏅'
                })
            },
            # Streak quests
            {
                'title': 'Briscola: Serie Vincente',
                'description': 'Vinci 3 partite di fila',
                'quest_type': 'score',
                'target_value': 3,
                'xp_reward': 50,
                'reward_coins': 40,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'win_streak',
                    'category': 'skill',
                    'icon': '🔥'
                })
            },
            {
                'title': 'Briscola: Re delle Carte',
                'description': 'Vinci 10 partite di fila',
                'quest_type': 'score',
                'target_value': 10,
                'xp_reward': 250,
                'reward_coins': 150,
                'is_active': 1,
                'created_at': now,
                'config': json.dumps({
                    'game_id': GAME_ID,
                    'type': 'win_streak',
                    'category': 'skill',
                    'icon': '🃏👑'
                })
            }
        ]
        
        try:
            for quest_data in quests:
                # Check if quest already exists
                existing = db.query(Quest).filter(Quest.title == quest_data['title']).first()
                
                if existing:
                    self.log(f"Quest '{quest_data['title']}' already exists", 'skip')
                    self.stats['quests_skipped'] += 1
                    continue
                
                if self.dry_run:
                    self.log(f"DRY RUN: Would create quest '{quest_data['title']}'", 'info')
                    continue
                
                quest = Quest(**quest_data)
                db.add(quest)
                self.log(f"Created quest: {quest_data['title']}", 'success')
                self.stats['quests_created'] += 1
            
            db.commit()
            
        except Exception as e:
            self.log(f"Error creating quests: {e}", 'error')
            self.stats['errors'].append(f"Quests: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def print_summary(self):
        """Print final setup summary."""
        self.print_header("📋 SETUP SUMMARY")
        
        print(f"   🃏 Game: {GAME_TITLE}")
        print(f"   📂 Game ID: {GAME_ID}")
        print()
        print(f"   🖼️  Thumbnail: {'Created' if self.stats['thumbnail_created'] else 'Skipped (exists)'}")
        print(f"   🎮 Game Registration: {'Created' if self.stats['game_registered'] else 'Skipped (exists)'}")
        print()
        print(f"   📊 XP Rules:")
        print(f"      • Created: {self.stats['xp_rules_created']}")
        print(f"      • Skipped: {self.stats['xp_rules_skipped']}")
        print()
        print(f"   🎯 Quests:")
        print(f"      • Created: {self.stats['quests_created']}")
        print(f"      • Skipped: {self.stats['quests_skipped']}")
        print()
        
        if self.stats['errors']:
            print("   ❌ Errors:")
            for error in self.stats['errors']:
                print(f"      • {error}")
            print()
        
        print("=" * 70)
        
        if not self.stats['errors']:
            print("   ✅ BRISCOLA SETUP COMPLETED SUCCESSFULLY!")
        else:
            print("   ⚠️  SETUP COMPLETED WITH ERRORS")
        
        print("=" * 70)
        print()
        print("   🎮 Play the game at:")
        print("      http://localhost:3000/#/play/briscola")
        print()
        print("   📊 View game details at:")
        print("      http://localhost:3000/#/game/briscola")
        print()
    
    def run(self):
        """Run the complete setup process."""
        print()
        print("╔" + "═" * 68 + "╗")
        print("║" + "  🃏 BRISCOLA - COMPLETE SETUP SCRIPT".center(68) + "║")
        print("╚" + "═" * 68 + "╝")
        
        if self.dry_run:
            print()
            print("   ⚠️  DRY RUN MODE - No changes will be made")
        
        start_time = time.time()
        
        try:
            
            
            # Step 3: Register game
            self.register_game()
            
            # Step 4: Create XP rules
            self.create_xp_rules()
            
            # Step 5: Create quests
            self.create_quests()
            
        except Exception as e:
            self.log(f"Setup failed with error: {e}", 'error')
            import traceback
            traceback.print_exc()
        
        elapsed = time.time() - start_time
        
        # Print summary
        self.print_summary()
        print(f"   ⏱️  Total time: {elapsed:.2f} seconds")
        print()
        
        return len(self.stats['errors']) == 0


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Setup Briscola game - Complete initialization script'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Minimal output'
    )
    
    args = parser.parse_args()
    
    setup = BriscolaSetup(
        verbose=not args.quiet,
        dry_run=args.dry_run
    )
    
    success = setup.run()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
