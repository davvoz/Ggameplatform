"""
Create thumbnail for Yatzi 3D game using PIL
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

def draw_die_face(draw, x, y, size, value, color='white', dot_color='#1a1a2e'):
    """Draw a dice face with proper dot patterns"""
    # Die background
    draw.rounded_rectangle(
        [x, y, x + size, y + size],
        radius=size // 8,
        fill=color,
        outline='#666',
        width=3
    )
    
    # Dot positions (relative to die)
    dot_size = size // 8
    margin = size // 5
    center = size // 2
    
    # Define dot patterns for each value
    dots = {
        1: [(center, center)],
        2: [(margin, margin), (size - margin, size - margin)],
        3: [(margin, margin), (center, center), (size - margin, size - margin)],
        4: [(margin, margin), (margin, size - margin), 
            (size - margin, margin), (size - margin, size - margin)],
        5: [(margin, margin), (margin, size - margin), (center, center),
            (size - margin, margin), (size - margin, size - margin)],
        6: [(margin, margin), (margin, center), (margin, size - margin),
            (size - margin, margin), (size - margin, center), (size - margin, size - margin)]
    }
    
    # Draw dots
    for dx, dy in dots.get(value, []):
        draw.ellipse(
            [x + dx - dot_size//2, y + dy - dot_size//2,
             x + dx + dot_size//2, y + dy + dot_size//2],
            fill=dot_color
        )

def create_yatzi_thumbnail():
    """Create a professional Yatzi-themed thumbnail"""
    
    # Create image with gradient background
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color='#1b1b1b')
    draw = ImageDraw.Draw(img)
    
    # Dark elegant gradient background (casino green felt)
    for y in range(height):
        progress = y / height
        r = int(23 + (27 - 23) * progress)
        g = int(92 + (108 - 92) * progress)
        b = int(42 + (50 - 42) * progress)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw elegant border
    border_color = '#FFD700'  # Gold
    draw.rectangle([5, 5, width-5, height-5], outline=border_color, width=4)
    draw.rectangle([10, 10, width-10, height-10], outline=border_color, width=2)
    
    # Draw glowing effect around center
    for i in range(8, 0, -1):
        glow_intensity = int(255 * (i / 16))
        glow_color = (glow_intensity, glow_intensity // 2, 0)
        draw.ellipse(
            [width//2 - 100 - i*4, height//2 - 40 - i*3,
             width//2 + 100 + i*4, height//2 + 40 + i*3],
            outline=glow_color,
            width=1
        )
    
    # Draw five 3D-style dice showing Yatzi (5 of the same)
    die_size = 50
    spacing = 10
    start_x = (width - (5 * die_size + 4 * spacing)) // 2
    die_y = height // 2 - die_size // 2 + 10
    
    # Draw shadows first
    shadow_offset = 6
    for i in range(5):
        die_x = start_x + i * (die_size + spacing)
        draw.rounded_rectangle(
            [die_x + shadow_offset, die_y + shadow_offset,
             die_x + die_size + shadow_offset, die_y + die_size + shadow_offset],
            radius=die_size // 8,
            fill='#000000',
            width=0
        )
    
    # Draw dice showing "5" (classic Yatzi)
    for i in range(5):
        die_x = start_x + i * (die_size + spacing)
        draw_die_face(draw, die_x, die_y, die_size, 5, color='#FFFFFF', dot_color='#CC0000')
    
    # Try to load font, fallback to default if not available
    try:
        title_font = ImageFont.truetype("arial.ttf", 42)
        subtitle_font = ImageFont.truetype("arial.ttf", 28)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Draw title with shadow
    title = "YATZI 3D"
    # Calculate text size for centering
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = 30
    
    # Shadow
    draw.text((title_x + 3, title_y + 3), title, fill='#000000', font=title_font)
    # Main text with gold color
    draw.text((title_x, title_y), title, fill='#FFD700', font=title_font)
    
    # Draw subtitle
    subtitle = "5 Dice Strategy"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    subtitle_y = height - 50
    
    # Shadow
    draw.text((subtitle_x + 2, subtitle_y + 2), subtitle, fill='#000000', font=subtitle_font)
    # Main text
    draw.text((subtitle_x, subtitle_y), subtitle, fill='#FFFFFF', font=subtitle_font)
    
    # Add some decorative stars/sparkles
    star_color = '#FFD700'
    star_positions = [
        (40, 80), (360, 90), (50, 220), (350, 230),
        (width//2 - 140, height//2), (width//2 + 140, height//2)
    ]
    
    for star_x, star_y in star_positions:
        # Simple 4-point star
        star_size = 8
        draw.line([(star_x, star_y - star_size), (star_x, star_y + star_size)], 
                 fill=star_color, width=2)
        draw.line([(star_x - star_size, star_y), (star_x + star_size, star_y)], 
                 fill=star_color, width=2)
    
    return img

def main():
    """Main execution"""
    print("=" * 70)
    print("  YATZI 3D - THUMBNAIL CREATION")
    print("=" * 70)
    print()
    
    # Output path - nella directory del gioco
    output_dir = Path(__file__).parent.parent / 'app' / 'games' / 'yatzi_3d_by_luciogiolli'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / 'thumbnail.png'
    
    print(f"Creating thumbnail at: {output_path}")
    
    # Create image
    img = create_yatzi_thumbnail()
    
    # Save with optimization
    img.save(output_path, 'PNG', optimize=True)
    
    print(f"[OK] Thumbnail created successfully!")
    print(f"   Size: {img.size[0]}x{img.size[1]}")
    print(f"   Path: {output_path}")
    print()
    print("=" * 70)

if __name__ == "__main__":
    main()
