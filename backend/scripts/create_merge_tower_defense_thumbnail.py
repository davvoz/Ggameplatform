"""
Create thumbnail for Merge Tower Defense using PIL
"""
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("PIL not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageDraw, ImageFont

def create_merge_tower_defense_thumbnail():
    """Create a tower defense themed thumbnail with merge mechanics"""
    
    # Create image
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color='#0a0a0a')
    draw = ImageDraw.Draw(img)
    
    # Gradient background (dark to slightly lighter)
    for y in range(height):
        # Dark green to black gradient
        r = int(10 + (26 - 10) * y / height)
        g = int(10 + (0 - 10) * y / height)
        b = int(10 + (0 - 10) * y / height)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw grid pattern
    grid_color = (0, 255, 136, 40)  # Semi-transparent green
    cell_size = 40
    for x in range(0, width, cell_size):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, cell_size):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)
    
    # Draw defense line (red dashed line)
    defense_y = 200
    dash_length = 10
    for x in range(0, width, dash_length * 2):
        draw.line([(x, defense_y), (x + dash_length, defense_y)], 
                 fill=(255, 0, 0), width=3)
    
    # Defense zone highlight
    draw.rectangle([0, defense_y, width, height], 
                  fill=(0, 255, 136, 20))
    
    # Draw merge arrows (showing merge mechanic)
    arrow_y = 240
    
    # Three small towers
    tower_positions = [100, 150, 200]
    tower_color = (0, 255, 136)
    
    for i, x in enumerate(tower_positions):
        # Small tower
        draw.rectangle([x - 15, arrow_y - 15, x + 15, arrow_y + 15], 
                      fill=tower_color, outline='white', width=2)
        
        # Tower icon (emoji-style)
        try:
            emoji_font = ImageFont.truetype("seguiemj.ttf", 20)
        except:
            try:
                emoji_font = ImageFont.truetype("arial.ttf", 20)
            except:
                emoji_font = ImageFont.load_default()
        
        draw.text((x - 8, arrow_y - 10), "🔫", fill='white', font=emoji_font)
        
        # Level 1 star
        draw.text((x + 8, arrow_y - 20), "⭐", fill='yellow', font=emoji_font)
    
    # Plus signs between towers
    try:
        plus_font = ImageFont.truetype("arial.ttf", 30)
    except:
        plus_font = ImageFont.load_default()
    
    draw.text((115, arrow_y - 15), "+", fill='white', font=plus_font)
    draw.text((165, arrow_y - 15), "+", fill='white', font=plus_font)
    
    # Arrow pointing down
    draw.text((210, arrow_y - 10), "→", fill='#FFD700', font=plus_font)
    
    # Merged tower (bigger and more powerful)
    merged_x, merged_y = 280, arrow_y
    draw.rectangle([merged_x - 20, merged_y - 20, merged_x + 20, merged_y + 20], 
                  fill=(255, 200, 0), outline='white', width=3)
    
    # Glow effect
    for offset in range(3):
        alpha = 100 - offset * 30
        glow_size = 20 + offset * 5
        draw.rectangle([merged_x - glow_size, merged_y - glow_size, 
                       merged_x + glow_size, merged_y + glow_size], 
                      outline=(255, 200, 0, alpha), width=1)
    
    # Merged tower icon
    try:
        emoji_font_large = ImageFont.truetype("seguiemj.ttf", 28)
    except:
        try:
            emoji_font_large = ImageFont.truetype("arial.ttf", 28)
        except:
            emoji_font_large = ImageFont.load_default()
    
    draw.text((merged_x - 12, merged_y - 14), "💥", fill='white', font=emoji_font_large)
    
    # Level 2 indicator
    draw.text((merged_x + 10, merged_y - 28), "✨", fill='cyan', font=emoji_font)
    
    # Draw zombies at the top
    zombie_positions = [80, 160, 240, 320]
    zombie_y = 80
    
    try:
        zombie_font = ImageFont.truetype("seguiemj.ttf", 35)
    except:
        try:
            zombie_font = ImageFont.truetype("arial.ttf", 35)
        except:
            zombie_font = ImageFont.load_default()
    
    zombies = ['🧟', '🧟‍♂️', '🧟‍♀️', '👹']
    for i, (x, zombie) in enumerate(zip(zombie_positions, zombies)):
        # Zombie glow
        draw.ellipse([x - 25, zombie_y - 25, x + 25, zombie_y + 25], 
                    fill=(255, 0, 0, 30))
        
        # Zombie
        draw.text((x - 15, zombie_y - 20), zombie, fill='white', font=zombie_font)
    
    # Draw projectiles
    projectile_positions = [(120, 160), (200, 140), (280, 180)]
    for px, py in projectile_positions:
        # Projectile glow
        draw.ellipse([px - 8, py - 8, px + 8, py + 8], 
                    fill=(255, 255, 0), outline=(255, 200, 0), width=2)
        # Inner glow
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], 
                    fill=(255, 255, 255))
    
    # Title text
    try:
        title_font = ImageFont.truetype("arial.ttf", 40)
        title_font_bold = ImageFont.truetype("arialbd.ttf", 40)
        subtitle_font = ImageFont.truetype("arial.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        title_font_bold = title_font
        subtitle_font = ImageFont.load_default()
    
    # Title with shadow and outline
    title = "MERGE TOWER"
    title_x, title_y = 40, 10
    
    # Shadow
    draw.text((title_x + 3, title_y + 3), title, fill=(0, 0, 0), font=title_font_bold)
    # Outline
    for offset_x in [-2, 0, 2]:
        for offset_y in [-2, 0, 2]:
            if offset_x != 0 or offset_y != 0:
                draw.text((title_x + offset_x, title_y + offset_y), title, 
                         fill=(0, 100, 50), font=title_font_bold)
    # Main text
    draw.text((title_x, title_y), title, fill=(0, 255, 136), font=title_font_bold)
    
    # Second line
    title2 = "DEFENSE"
    draw.text((title_x + 143, title_y + 3), title2, fill=(0, 0, 0), font=title_font_bold)
    for offset_x in [-2, 0, 2]:
        for offset_y in [-2, 0, 2]:
            if offset_x != 0 or offset_y != 0:
                draw.text((title_x + 140 + offset_x, title_y + offset_y), title2, 
                         fill=(100, 0, 0), font=title_font_bold)
    draw.text((title_x + 140, title_y), title2, fill=(255, 80, 80), font=title_font_bold)
    
    # Subtitle
    subtitle = "Elite Defense Force"
    subtitle_x = width // 2 - 90
    draw.text((subtitle_x + 1, 52), subtitle, fill=(0, 0, 0), font=subtitle_font)
    draw.text((subtitle_x, 51), subtitle, fill=(255, 255, 255), font=subtitle_font)
    
    # Add some sparkle effects
    sparkle_positions = [(50, 140), (350, 120), (320, 260), (60, 270)]
    for sx, sy in sparkle_positions:
        draw.text((sx, sy), "✨", fill=(255, 255, 100), font=emoji_font)
    
    # Save
    output_path = Path(__file__).parent.parent / 'app' / 'games' / 'merge-tower-defense' / 'thumbnail.png'
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 70)
    print("  🎨 MERGE TOWER DEFENSE - THUMBNAIL CREATION")
    print("=" * 70)
    print()
    create_merge_tower_defense_thumbnail()
    print()
    print("🎮 Thumbnail features:")
    print("   • Tower defense grid with defense line")
    print("   • Merge mechanic visualization (3→1 upgrade)")
    print("   • Zombie enemies at the top")
    print("   • Projectiles and effects")
    print("   • Professional gradient background")
    print()
    print("=" * 70)
