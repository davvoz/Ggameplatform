"""
Create thumbnail for Cyber Dino Fantasy Tactics game using PIL
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

def create_cyber_dino_fantasy_thumbnail():
    """Create a professional Cyber Dino Fantasy Tactics themed thumbnail"""
    
    # Create image with gradient background
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color='#0a0a0a')
    draw = ImageDraw.Draw(img)
    
    # Cyberpunk gradient background (dark purple to cyan)
    for y in range(height):
        progress = y / height
        r = int(26 + (0 - 26) * progress)
        g = int(13 + (150 - 13) * progress)
        b = int(52 + (180 - 52) * progress)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw neon borders (cyberpunk style)
    neon_cyan = '#00FFFF'
    neon_magenta = '#FF00FF'
    
    # Outer glow
    for i in range(8, 0, -1):
        alpha = int(255 * (i / 16))
        draw.rectangle([5-i, 5-i, width-5+i, height-5+i], 
                      outline=(0, 255, 255, alpha), width=2)
    
    # Main border
    draw.rectangle([5, 5, width-5, height-5], outline=neon_cyan, width=3)
    draw.rectangle([10, 10, width-10, height-10], outline=neon_magenta, width=2)
    
    # Draw diagonal grid lines (tactical grid)
    grid_color = (100, 255, 255, 80)
    for i in range(0, width, 40):
        draw.line([(i, 0), (i + height, height)], fill=grid_color, width=1)
        draw.line([(i, height), (i - height, 0)], fill=grid_color, width=1)
    
    # Title
    try:
        title_font = ImageFont.truetype("arial.ttf", 36)
        subtitle_font = ImageFont.truetype("arial.ttf", 20)
        small_font = ImageFont.truetype("arial.ttf", 16)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw title with glow
    title = "CYBER DINO"
    subtitle = "FANTASY TACTICS"
    
    # Title position
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = 40
    
    # Glow effect for title
    for offset in range(5, 0, -1):
        glow_intensity = int(255 * (offset / 10))
        glow_color = (0, glow_intensity, glow_intensity)
        draw.text((title_x + offset, title_y + offset), title, 
                 font=title_font, fill=glow_color)
        draw.text((title_x - offset, title_y - offset), title, 
                 font=title_font, fill=glow_color)
    
    # Main title
    draw.text((title_x, title_y), title, font=title_font, fill=neon_cyan)
    
    # Subtitle
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    subtitle_y = title_y + 45
    
    # Glow for subtitle
    for offset in range(3, 0, -1):
        glow_intensity = int(255 * (offset / 6))
        glow_color = (glow_intensity, 0, glow_intensity)
        draw.text((subtitle_x + offset, subtitle_y + offset), subtitle, 
                 font=subtitle_font, fill=glow_color)
    
    draw.text((subtitle_x, subtitle_y), subtitle, font=subtitle_font, fill=neon_magenta)
    
    # Draw stylized dinosaur silhouette
    dino_y = 130
    
    # Dinosaur body (simplified T-Rex style)
    body_points = [
        (150, dino_y + 70),  # Tail start
        (170, dino_y + 60),  # Tail up
        (180, dino_y + 50),  # Back
        (200, dino_y + 45),  # Neck
        (220, dino_y + 35),  # Head bottom
        (235, dino_y + 30),  # Snout
        (240, dino_y + 25),  # Top snout
        (235, dino_y + 20),  # Top head
        (215, dino_y + 25),  # Back of head
        (205, dino_y + 40),  # Neck front
        (190, dino_y + 60),  # Chest
        (185, dino_y + 75),  # Belly
        (170, dino_y + 85),  # Leg
        (160, dino_y + 85),  # Leg bottom
        (155, dino_y + 80),  # Leg back
        (150, dino_y + 70),  # Back to tail
    ]
    
    # Glow effect for dinosaur
    for i in range(4, 0, -1):
        offset_points = [(x + i, y + i) for x, y in body_points]
        glow = int(255 * (i / 8))
        draw.polygon(offset_points, fill=(0, glow, glow))
    
    # Main dinosaur
    draw.polygon(body_points, fill=(0, 200, 200))
    draw.polygon(body_points, outline=neon_cyan, width=2)
    
    # Cyber eye
    eye_x, eye_y = 225, dino_y + 27
    draw.ellipse([eye_x - 3, eye_y - 3, eye_x + 3, eye_y + 3], 
                fill=(255, 0, 255))
    
    # Cyber circuits on body
    circuit_lines = [
        [(180, dino_y + 50), (190, dino_y + 55)],
        [(190, dino_y + 55), (195, dino_y + 65)],
        [(185, dino_y + 70), (195, dino_y + 75)],
    ]
    for line in circuit_lines:
        draw.line(line, fill=neon_magenta, width=2)
        for point in line:
            draw.ellipse([point[0]-2, point[1]-2, point[0]+2, point[1]+2], 
                        fill=neon_magenta)
    
    # Draw tactical elements (crosshairs/targets)
    for x, y in [(80, 140), (320, 160), (100, 230)]:
        # Target circles
        for r in [8, 12, 16]:
            draw.ellipse([x-r, y-r, x+r, y+r], outline=neon_cyan, width=1)
        # Crosshair
        draw.line([(x-20, y), (x-5, y)], fill=neon_cyan, width=2)
        draw.line([(x+5, y), (x+20, y)], fill=neon_cyan, width=2)
        draw.line([(x, y-20), (x, y-5)], fill=neon_cyan, width=2)
        draw.line([(x, y+5), (x, y+20)], fill=neon_cyan, width=2)
    
    # Genre tags
    tags = ["RPG • TACTICAL • TURN-BASED"]
    tags_text = tags[0]
    tags_bbox = draw.textbbox((0, 0), tags_text, font=small_font)
    tags_width = tags_bbox[2] - tags_bbox[0]
    tags_x = (width - tags_width) // 2
    tags_y = height - 40
    
    draw.text((tags_x, tags_y), tags_text, font=small_font, fill=neon_cyan)
    
    # Save thumbnail
    game_dir = Path(__file__).parent.parent / 'app' / 'games' / 'cyber_dino_fantasy_tactics'
    game_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = game_dir / 'thumbnail.png'
    img.save(output_path, 'PNG', optimize=True, quality=95)
    
    print(f"✅ Thumbnail created: {output_path}")
    print(f"   Size: {width}x{height}")
    print(f"   Style: Cyberpunk tactical")

if __name__ == "__main__":
    create_cyber_dino_fantasy_thumbnail()
