"""
Script per censire la thumbnail.png di RollABall
Verifica l'esistenza della thumbnail, ne controlla le proprietà e 
registra le informazioni nel sistema
"""
import sys
import os
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal, get_game_by_id
from app.models import Game

def check_thumbnail_exists():
    """Verifica l'esistenza della thumbnail"""
    game_dir = Path(__file__).parent.parent / 'app' / 'games' / 'RollABall'
    thumbnail_path = game_dir / 'thumbnail.png'
    
    if not thumbnail_path.exists():
        return None, "Thumbnail non trovata"
    
    return thumbnail_path, None

def get_thumbnail_info(thumbnail_path):
    """Ottiene informazioni sulla thumbnail"""
    try:
        from PIL import Image
    except ImportError:
        print("⚠️  PIL non installato. Installazione in corso...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
        from PIL import Image
    
    img = Image.open(thumbnail_path)
    
    info = {
        'path': str(thumbnail_path),
        'size_bytes': thumbnail_path.stat().st_size,
        'dimensions': f"{img.width}x{img.height}",
        'width': img.width,
        'height': img.height,
        'format': img.format,
        'mode': img.mode,
        'modified': datetime.fromtimestamp(thumbnail_path.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
        'created': datetime.fromtimestamp(thumbnail_path.stat().st_ctime).strftime('%Y-%m-%d %H:%M:%S')
    }
    
    return info

def check_game_registration():
    """Verifica se il gioco è registrato nel database"""
    try:
        existing = get_game_by_id('RollABall')
        return existing
    except Exception as e:
        print(f"⚠️  Errore nel controllo database: {e}")
        return None

def update_game_thumbnail(db, game_id):
    """Aggiorna il campo thumbnail nel database se necessario"""
    game = db.query(Game).filter(Game.game_id == game_id).first()
    
    if not game:
        return False, "Gioco non trovato nel database"
    
    if game.thumbnail == 'thumbnail.png':
        return True, "Thumbnail già registrata correttamente"
    
    # Aggiorna il campo thumbnail
    game.thumbnail = 'thumbnail.png'
    game.updated_at = datetime.now()
    db.commit()
    
    return True, "Thumbnail registrata con successo"

def census_rollaball_thumbnail():
    """Censisce la thumbnail di RollABall"""
    
    print("=" * 70)
    print("  🎾 ROLLABALL - CENSIMENTO THUMBNAIL")
    print("=" * 70)
    print()
    
    # Step 1: Verifica esistenza thumbnail
    print("📸 Step 1: Verifica esistenza thumbnail...")
    thumbnail_path, error = check_thumbnail_exists()
    
    if error:
        print(f"❌ {error}")
        return False
    
    print(f"✅ Thumbnail trovata: {thumbnail_path}")
    print()
    
    # Step 2: Ottieni informazioni sulla thumbnail
    print("📊 Step 2: Analisi thumbnail...")
    try:
        info = get_thumbnail_info(thumbnail_path)
        
        print(f"   📁 Percorso:    {info['path']}")
        print(f"   📏 Dimensioni:  {info['dimensions']} ({info['width']}x{info['height']})")
        print(f"   💾 Dimensione:  {info['size_bytes']:,} bytes ({info['size_bytes']/1024:.2f} KB)")
        print(f"   🎨 Formato:     {info['format']}")
        print(f"   🖼️  Modalità:    {info['mode']}")
        print(f"   📅 Modificato:  {info['modified']}")
        print(f"   🕐 Creato:      {info['created']}")
        print()
        
        # Verifica dimensioni raccomandate
        if info['width'] == 400 and info['height'] == 300:
            print("   ✅ Dimensioni conformi allo standard (400x300)")
        else:
            print(f"   ⚠️  Dimensioni non standard (raccomandato: 400x300)")
        print()
        
    except Exception as e:
        print(f"❌ Errore nell'analisi: {e}")
        return False
    
    # Step 3: Verifica registrazione nel database
    print("💾 Step 3: Verifica registrazione database...")
    game = check_game_registration()
    
    if not game:
        print("❌ Gioco non trovato nel database")
        print("   Esegui prima: python backend/scripts/register_bouncing_balls.py")
        return False
    
    print(f"✅ Gioco trovato nel database")
    print(f"   Game ID:  {game.get('game_id', 'N/A')}")
    print(f"   Titolo:   {game.get('title', 'N/A')}")
    print(f"   Thumbnail: {game.get('thumbnail', 'N/A')}")
    print()
    
    # Step 4: Verifica/Aggiorna registrazione thumbnail
    print("🔄 Step 4: Verifica registrazione thumbnail...")
    db = SessionLocal()
    try:
        success, message = update_game_thumbnail(db, 'RollABall')
        
        if success:
            print(f"✅ {message}")
        else:
            print(f"❌ {message}")
            return False
            
    except Exception as e:
        print(f"❌ Errore nell'aggiornamento: {e}")
        db.rollback()
        return False
    finally:
        db.close()
    
    print()
    
    # Step 5: Riepilogo finale
    print("=" * 70)
    print("  ✅ CENSIMENTO COMPLETATO")
    print("=" * 70)
    print()
    print("📋 Riepilogo:")
    print(f"   🎮 Gioco:       Roll A Ball (RollABall)")
    print(f"   📸 Thumbnail:   thumbnail.png")
    print(f"   📏 Dimensioni:  {info['dimensions']}")
    print(f"   💾 Dimensione:  {info['size_bytes']/1024:.2f} KB")
    print(f"   ✅ Status:      Registrato e censito")
    print()
    print("🎯 La thumbnail è ora censita correttamente nel sistema!")
    print()
    return True

if __name__ == '__main__':
    try:
        success = census_rollaball_thumbnail()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Errore durante il censimento: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
