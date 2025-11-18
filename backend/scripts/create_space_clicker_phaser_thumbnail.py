"""
Create a PNG thumbnail for Space Clicker Phaser from scratch
"""
import os

try:
    from PIL import Image, ImageDraw, ImageFont
    
    output_path = 'app/games/space-clicker-phaser/thumbnail.png'
    
    print("Creating Space Clicker Phaser thumbnail...")
    
    # Create image with space background
    img = Image.new('RGB', (400, 300), color='#0a0a1a')
    draw = ImageDraw.Draw(img)
    
    # Draw space gradient background (dark to slightly lighter)
    for y in range(300):
        shade = int(10 + (30 - 10) * (y / 300))
        draw.line([(0, y), (400, y)], fill=(shade, shade, shade + 10))
    
    # Draw stars
    import random
    random.seed(42)  # For consistent star positions
    for _ in range(60):
        x = random.randint(0, 400)
        y = random.randint(0, 250)
        size = random.choice([1, 2, 3])
        brightness = random.randint(180, 255)
        draw.ellipse([x, y, x+size, y+size], fill=(brightness, brightness, brightness))
    
    # Draw larger glowing stars
    glow_stars = [(50, 40), (350, 60), (120, 100), (300, 140), (80, 180)]
    for sx, sy in glow_stars:
        # Glow effect
        for i in range(8, 0, -2):
            alpha_color = (100 + i*10, 150 + i*10, 255)
            draw.ellipse([sx-i, sy-i, sx+i, sy+i], fill=alpha_color)
        # Star center
        draw.ellipse([sx-3, sy-3, sx+3, sy+3], fill=(255, 255, 255))
    
    # Draw rocket/spaceship (simplified)
    rocket_x, rocket_y = 200, 150
    
    # Rocket body (triangle pointing up)
    rocket_points = [
        (rocket_x, rocket_y - 40),      # Top
        (rocket_x - 25, rocket_y + 30), # Bottom left
        (rocket_x + 25, rocket_y + 30)  # Bottom right
    ]
    draw.polygon(rocket_points, fill='#e74c3c', outline='#c0392b')
    
    # Rocket window
    draw.ellipse([rocket_x-10, rocket_y-10, rocket_x+10, rocket_y+10], fill='#3498db', outline='#2980b9')
    draw.ellipse([rocket_x-6, rocket_y-6, rocket_x+6, rocket_y+6], fill='#5dade2')
    
    # Rocket fins
    fin_left = [(rocket_x-25, rocket_y+10), (rocket_x-40, rocket_y+30), (rocket_x-25, rocket_y+30)]
    fin_right = [(rocket_x+25, rocket_y+10), (rocket_x+40, rocket_y+30), (rocket_x+25, rocket_y+30)]
    draw.polygon(fin_left, fill='#c0392b')
    draw.polygon(fin_right, fill='#c0392b')
    
    # Rocket flames
    flame_points = [
        (rocket_x-15, rocket_y+30),
        (rocket_x-10, rocket_y+50),
        (rocket_x, rocket_y+30),
        (rocket_x+10, rocket_y+50),
        (rocket_x+15, rocket_y+30)
    ]
    draw.polygon(flame_points, fill='#f39c12')
    # Inner flame
    inner_flame = [
        (rocket_x-8, rocket_y+30),
        (rocket_x-5, rocket_y+42),
        (rocket_x, rocket_y+30),
        (rocket_x+5, rocket_y+42),
        (rocket_x+8, rocket_y+30)
    ]
    draw.polygon(inner_flame, fill='#f1c40f')
    
    # Draw planets
    # Planet 1 (left)
    planet1_x, planet1_y = 80, 220
    for i in range(5, 0, -1):
        shade = 140 - i*20
        draw.ellipse([planet1_x-25-i, planet1_y-25-i, planet1_x+25+i, planet1_y+25+i], 
                    fill=(shade, shade+30, shade+50))
    draw.ellipse([planet1_x-25, planet1_y-25, planet1_x+25, planet1_y+25], fill='#9b59b6')
    # Craters
    draw.ellipse([planet1_x-10, planet1_y-8, planet1_x-2, planet1_y], fill='#8e44ad')
    draw.ellipse([planet1_x+5, planet1_y+5, planet1_x+15, planet1_y+15], fill='#8e44ad')
    
    # Planet 2 (right)
    planet2_x, planet2_y = 320, 210
    for i in range(6, 0, -1):
        shade = 150 - i*15
        draw.ellipse([planet2_x-30-i, planet2_y-30-i, planet2_x+30+i, planet2_y+30+i], 
                    fill=(shade+50, shade+20, shade))
    draw.ellipse([planet2_x-30, planet2_y-30, planet2_x+30, planet2_y+30], fill='#e67e22')
    # Rings
    draw.ellipse([planet2_x-45, planet2_y-10, planet2_x+45, planet2_y+10], outline='#d35400', width=3)
    draw.ellipse([planet2_x-40, planet2_y-7, planet2_x+40, planet2_y+7], outline='#e67e22', width=2)
    
    # Draw click indicator/cursor
    click_x, click_y = rocket_x + 50, rocket_y - 20
    draw.ellipse([click_x-15, click_y-15, click_x+15, click_y+15], outline='#3498db', width=3)
    draw.ellipse([click_x-20, click_y-20, click_x+20, click_y+20], outline='#5dade2', width=2)
    
    # Draw title with glow
    try:
        title_font = ImageFont.truetype("arial.ttf", 40)
        subtitle_font = ImageFont.truetype("arial.ttf", 20)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # Title shadow/glow
    for offset in [(2,2), (-2,2), (2,-2), (-2,-2)]:
        draw.text((200+offset[0], 270+offset[1]), "Space Clicker", fill='#1a1a3a', 
                 font=title_font, anchor='mm')
    # Title
    draw.text((200, 270), "Space Clicker", fill='#3498db', font=title_font, anchor='mm')
    
    # Subtitle
    draw.text((200, 288), "🚀 Phaser Edition", fill='#ecf0f1', font=subtitle_font, anchor='mm')
    
    # Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
except Exception as e:
    print(f"❌ Error creating thumbnail: {e}")
    import traceback
    traceback.print_exc()
