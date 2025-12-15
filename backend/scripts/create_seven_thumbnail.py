"""
Create thumbnail for Seven game using PIL
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

def create_seven_thumbnail():
    """Create a professional casino-themed thumbnail for Seven"""
    
    # Create image with gradient background
    width, height = 400, 300
    img = Image.new('RGB', (width, height), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Dark elegant gradient background
    for y in range(height):
        progress = y / height
        r = int(26 + (44 - 26) * progress)
        g = int(26 + (27 - 26) * progress)
        b = int(46 + (63 - 46) * progress)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw elegant border
    border_color = '#667eea'
    draw.rectangle([5, 5, width-5, height-5], outline=border_color, width=4)
    draw.rectangle([10, 10, width-10, height-10], outline=border_color, width=2)
    
    # Draw glowing effect around center
    for i in range(10, 0, -1):
        alpha_color = (102, 126, 234, int(255 * (i / 30)))
        # Can't use alpha in PIL easily, simulate with lighter color
        glow_intensity = int(102 + (255 - 102) * (i / 10) * 0.1)
        glow_color = (glow_intensity, glow_intensity + 20, 234)
        draw.ellipse(
            [width//2 - 80 - i*3, height//2 - 30 - i*3,
             width//2 + 80 + i*3, height//2 + 50 + i*3],
            outline=glow_color,
            width=1
        )
    
    # Draw two large 3D-style dice
    die_size = 70
    die1_x = width // 2 - die_size - 15
    die1_y = height // 2 - die_size // 2
    die2_x = width // 2 + 15
    die2_y = height // 2 - die_size // 2
    
    # Shadow for dice
    shadow_offset = 8
    draw.rounded_rectangle(
        [die1_x + shadow_offset, die1_y + shadow_offset,
         die1_x + die_size + shadow_offset, die1_y + die_size + shadow_offset],
        radius=die_size // 8,
        fill='#000000'
    )
    draw.rounded_rectangle(
        [die2_x + shadow_offset, die2_y + shadow_offset,
         die2_x + die_size + shadow_offset, die2_y + die_size + shadow_offset],
        radius=die_size // 8,
        fill='#000000'
    )
    
    # Draw dice showing 3 and 4 (adds to 7)
    draw_die_face(draw, die1_x, die1_y, die_size, 3, '#f0f0f0', '#d32f2f')
    draw_die_face(draw, die2_x, die2_y, die_size, 4, '#f0f0f0', '#d32f2f')
    
    # Title text
    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        subtitle_font = ImageFont.truetype("arial.ttf", 22)
        small_font = ImageFont.truetype("arial.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw "SEVEN" title with shadow and glow
    title = "SEVEN"
    
    # Calculate text position (centered top)
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = 25
    
    # Shadow
    draw.text((title_x + 3, title_y + 3), title, fill='#000000', font=title_font)
    # Glow
    draw.text((title_x + 1, title_y + 1), title, fill='#667eea', font=title_font)
    # Main text
    draw.text((title_x, title_y), title, fill='#ffffff', font=title_font)
    
    # Draw lucky "7" symbol with special styling
    seven_text = "7"
    seven_bbox = draw.textbbox((0, 0), seven_text, font=title_font)
    seven_width = seven_bbox[2] - seven_bbox[0]
    seven_x = (width - seven_width) // 2
    seven_y = height - 70
    
    # Lucky 7 with gold effect
    draw.text((seven_x + 2, seven_y + 2), seven_text, fill='#000000', font=title_font)
    draw.text((seven_x, seven_y), seven_text, fill='#ffd700', font=title_font)
    
    # Subtitle
    subtitle = "7 è in mezzo"
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    subtitle_y = 80
    
    draw.text((subtitle_x + 1, subtitle_y + 1), subtitle, fill='#000000', font=subtitle_font)
    draw.text((subtitle_x, subtitle_y), subtitle, fill='#88ff88', font=subtitle_font)
    
    # Draw chips/coins decoration
    coin_positions = [
        (40, 130), (50, 180), (350, 140), (360, 190),
        (30, 250), (370, 260)
    ]
    
    for cx, cy in coin_positions:
        # Chip shadow
        draw.ellipse([cx + 2, cy + 2, cx + 22, cy + 22], fill='#000000')
        # Chip body
        draw.ellipse([cx, cy, cx + 20, cy + 20], fill='#ffd700', outline='#ff8f00', width=2)
        # Center mark
        draw.ellipse([cx + 7, cy + 7, cx + 13, cy + 13], outline='#ff8f00', width=2)
    
    # Draw "OVER" and "UNDER" labels
    label_y = height // 2 - 10
    
    # OVER label (left side)
    over_text = "OVER"
    draw.text((25, label_y), over_text, fill='#4caf50', font=small_font)
    
    # UNDER label (right side)
    under_text = "UNDER"
    under_bbox = draw.textbbox((0, 0), under_text, font=small_font)
    under_width = under_bbox[2] - under_bbox[0]
    draw.text((width - under_width - 25, label_y), under_text, fill='#f44336', font=small_font)
    
    # Save
    output_path = Path(__file__).parent.parent / 'app' / 'games' / 'seven' / 'thumbnail.png'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("=" * 70)
    print("  🎲 SEVEN - THUMBNAIL CREATION")
    print("=" * 70)
    print()
    create_seven_thumbnail()
    print()
    print("=" * 70)
