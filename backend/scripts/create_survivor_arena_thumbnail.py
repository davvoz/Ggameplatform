"""
Create a thumbnail for Survivor Arena game
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_survivor_arena_thumbnail():
    """Create a simple thumbnail for Survivor Arena"""
    
    # Create image
    width, height = 800, 600
    img = Image.new('RGB', (width, height), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background
    for y in range(height):
        shade = int(26 + (y / height) * 40)
        color = (shade, shade, shade + 20)
        draw.rectangle([(0, y), (width, y + 1)], fill=color)
    
    # Draw arena grid pattern
    grid_size = 40
    for x in range(0, width, grid_size):
        draw.line([(x, 0), (x, height)], fill='#2a2a4e', width=1)
    for y in range(0, height, grid_size):
        draw.line([(0, y), (width, y)], fill='#2a2a4e', width=1)
    
    # Draw some enemy circles
    enemy_positions = [
        (150, 150, 30, '#66bb6a'),
        (650, 120, 25, '#ef5350'),
        (200, 450, 35, '#ffa726'),
        (600, 480, 28, '#ab47bc'),
    ]
    
    for x, y, r, color in enemy_positions:
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color, outline='white', width=2)
    
    # Draw player in center
    center_x, center_y = width // 2, height // 2
    player_size = 40
    draw.ellipse([
        (center_x - player_size, center_y - player_size),
        (center_x + player_size, center_y + player_size)
    ], fill='#00bcd4', outline='white', width=3)
    
    # Draw crosshair on player
    cross_size = 25
    draw.line([
        (center_x - cross_size, center_y),
        (center_x + cross_size, center_y)
    ], fill='white', width=3)
    draw.line([
        (center_x, center_y - cross_size),
        (center_x, center_y + cross_size)
    ], fill='white', width=3)
    
    # Draw some projectiles
    projectile_positions = [
        (center_x + 80, center_y - 30),
        (center_x - 90, center_y + 40),
        (center_x + 60, center_y + 70),
    ]
    
    for px, py in projectile_positions:
        draw.ellipse([(px - 8, py - 8), (px + 8, py + 8)], fill='#ffeb3b', outline='white', width=2)
    
    # Try to use a nice font, fall back to default
    try:
        title_font = ImageFont.truetype("arial.ttf", 80)
        subtitle_font = ImageFont.truetype("arial.ttf", 36)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Draw title with shadow
    title = "⚔️ SURVIVOR ARENA ⚔️"
    
    # Shadow
    draw.text((width // 2 + 3, 50 + 3), title, font=title_font, fill='#000000', anchor='mt')
    # Title
    draw.text((width // 2, 50), title, font=title_font, fill='#ffffff', anchor='mt')
    
    # Subtitle
    subtitle = "Survive the Endless Horde!"
    draw.text((width // 2 + 2, 140 + 2), subtitle, font=subtitle_font, fill='#000000', anchor='mt')
    draw.text((width // 2, 140), subtitle, font=subtitle_font, fill='#00bcd4', anchor='mt')
    
    # Save
    output_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        'app',
        'games',
        'survivor-arena',
        'thumbnail.png'
    )
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG')
    
    print(f"✅ Thumbnail created: {output_path}")
    print(f"   Size: {width}x{height}")

if __name__ == '__main__':
    create_survivor_arena_thumbnail()
