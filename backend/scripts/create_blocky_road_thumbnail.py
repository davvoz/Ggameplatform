"""
Create thumbnail for Blocky Road using PIL
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

def create_blocky_road_thumbnail():
    """Create a blockchain-themed thumbnail for Blocky Road"""
    
    # Create image
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color='#667eea')
    draw = ImageDraw.Draw(img)
    
    # Gradient background (simulate)
    for y in range(height):
        r = int(102 + (118 - 102) * y / height)
        g = int(126 + (75 - 126) * y / height)
        b = int(234 + (162 - 234) * y / height)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw blockchain road pattern
    road_color = (66, 66, 66)
    line_color = (255, 235, 59)
    
    # Road tiles (isometric effect)
    tile_height = 30
    for i in range(10):
        y = 50 + i * tile_height
        offset = (i % 2) * 20
        
        # Road tile
        points = [
            (50 + offset, y),
            (350 + offset, y),
            (360 + offset, y + tile_height),
            (40 + offset, y + tile_height)
        ]
        draw.polygon(points, fill=road_color, outline=(0, 0, 0))
        
        # Dotted line
        if i % 2 == 0:
            draw.line([(190 + offset, y + 10), (210 + offset, y + 20)], 
                     fill=line_color, width=3)
    
    # Draw Bitcoin character (simple voxel style)
    char_x, char_y = 200, 120
    
    # Shadow
    draw.ellipse([char_x - 20, char_y + 40, char_x + 20, char_y + 50], 
                 fill=(0, 0, 0, 100))
    
    # Body
    draw.rectangle([char_x - 15, char_y, char_x + 15, char_y + 30], 
                   fill='#F7931A', outline='black', width=2)
    
    # Head
    draw.rectangle([char_x - 12, char_y - 25, char_x + 12, char_y], 
                   fill='#F7931A', outline='black', width=2)
    
    # Eyes
    draw.ellipse([char_x - 8, char_y - 15, char_x - 4, char_y - 11], fill='black')
    draw.ellipse([char_x + 4, char_y - 15, char_x + 8, char_y - 11], fill='black')
    
    # Bitcoin symbol
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    draw.text((char_x - 8, char_y + 8), "₿", fill='white', font=font)
    
    # Draw some coins
    coin_positions = [(80, 100), (320, 150), (150, 200)]
    for cx, cy in coin_positions:
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], 
                    fill='#FFD700', outline='#FF8F00', width=2)
    
    # Draw vehicles (simple)
    car_x, car_y = 120, 180
    draw.rectangle([car_x - 15, car_y - 8, car_x + 15, car_y + 8], 
                   fill='#FF5252', outline='black', width=2)
    draw.rectangle([car_x - 8, car_y - 5, car_x + 8, car_y + 5], 
                   fill='#87CEEB', outline='black', width=1)
    
    # Title text
    try:
        title_font = ImageFont.truetype("arial.ttf", 36)
        subtitle_font = ImageFont.truetype("arial.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Title with shadow
    title = "BLOCKY ROAD"
    draw.text((width // 2 - 100 + 2, 12), title, fill='black', font=title_font)
    draw.text((width // 2 - 100, 10), title, fill='white', font=title_font)
    
    # Subtitle
    subtitle = "Cross the Blockchain!"
    draw.text((width // 2 - 80, 50), subtitle, fill='white', font=subtitle_font)
    
    # Save
    output_path = Path(__file__).parent.parent / 'app' / 'games' / 'blocky-road' / 'thumbnail.png'
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 70)
    print("  🎨 BLOCKY ROAD - THUMBNAIL CREATION")
    print("=" * 70)
    print()
    create_blocky_road_thumbnail()
    print()
    print("=" * 70)
