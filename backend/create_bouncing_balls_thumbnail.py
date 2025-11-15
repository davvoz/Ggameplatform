"""
Create a PNG thumbnail for Bouncing Balls from SVG
"""
import os

try:
    from PIL import Image, ImageDraw, ImageFont
    import random
    
    output_path = 'app/games/bouncing-balls/thumbnail.png'
    
    print("Creating Bouncing Balls thumbnail...")
    
    # Create image with gradient background
    img = Image.new('RGB', (400, 300), color='#0f0c29')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (dark purple to dark blue)
    for y in range(300):
        r = int(15 + (36 - 15) * (y / 300))
        g = int(12 + (43 - 12) * (y / 300))
        b = int(41 + (62 - 41) * (y / 300))
        draw.line([(0, y), (400, y)], fill=(r, g, b))
    
    # Draw colorful bouncing balls with glow effect
    ball_colors = [
        '#ff6b6b',  # Red
        '#4ecdc4',  # Cyan
        '#45b7d1',  # Blue
        '#f7dc6f',  # Yellow
        '#bb8fce',  # Purple
        '#85c1e9',  # Light Blue
        '#f8b500',  # Orange
        '#ff85a2',  # Pink
    ]
    
    ball_positions = [
        (80, 220, 35),   # x, y, radius
        (150, 180, 30),
        (250, 200, 40),
        (320, 170, 28),
        (120, 130, 32),
        (280, 120, 35),
        (190, 90, 38),
        (340, 80, 30),
    ]
    
    # Draw balls with gradient and highlight
    for i, (x, y, r) in enumerate(ball_positions):
        color = ball_colors[i % len(ball_colors)]
        
        # Parse hex color
        color_rgb = tuple(int(color[j:j+2], 16) for j in (1, 3, 5))
        
        # Draw glow (outer shadow)
        for offset in range(10, 0, -2):
            alpha = int(255 * (1 - offset / 10))
            glow_color = tuple(int(c * 0.8) for c in color_rgb)
            draw.ellipse([x-r-offset, y-r-offset, x+r+offset, y+r+offset], 
                        fill=glow_color, outline=None)
        
        # Draw main ball
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color_rgb)
        
        # Draw highlight
        highlight_r = int(r * 0.4)
        highlight_x = x - int(r * 0.3)
        highlight_y = y - int(r * 0.3)
        draw.ellipse([highlight_x-highlight_r, highlight_y-highlight_r, 
                     highlight_x+highlight_r, highlight_y+highlight_r], 
                    fill=(255, 255, 255, 200))
    
    # Draw sparkles/stars
    star_positions = [(30, 30), (350, 40), (120, 60), (280, 50), (50, 100), (370, 150)]
    for sx, sy in star_positions:
        draw.ellipse([sx-2, sy-2, sx+2, sy+2], fill='white')
    
    # Draw title with gradient effect
    try:
        title_font = ImageFont.truetype("arial.ttf", 36)
        subtitle_font = ImageFont.truetype("arial.ttf", 18)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Title shadow
    draw.text((202, 262), "Bouncing Balls", fill='#000000', font=title_font, anchor='mm')
    # Title
    draw.text((200, 260), "Bouncing Balls", fill='#667eea', font=title_font, anchor='mm')
    
    # Subtitle
    draw.text((200, 285), "🎾 Gravity Master", fill='#ffffff', font=subtitle_font, anchor='mm')
    
    # Draw upgrade icons in corner
    icon_x = 350
    icon_y = 250
    draw.rounded_rectangle([icon_x, icon_y, icon_x+40, icon_y+40], radius=8, fill='#667eea')
    draw.text((icon_x+20, icon_y+20), "⚡", font=subtitle_font, anchor='mm')
    
    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
except Exception as e:
    print(f"❌ Error creating thumbnail: {e}")
    import traceback
    traceback.print_exc()
