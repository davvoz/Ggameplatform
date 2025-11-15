"""
Create a PNG thumbnail for Rainbow Rush from SVG
"""
import os

try:
    import cairosvg
    from PIL import Image
    import io
    
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#E0F6FF;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FF0000;stop-opacity:1" />
                <stop offset="16.66%" style="stop-color:#FF7F00;stop-opacity:1" />
                <stop offset="33.33%" style="stop-color:#FFFF00;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#00FF00;stop-opacity:1" />
                <stop offset="66.66%" style="stop-color:#0000FF;stop-opacity:1" />
                <stop offset="83.33%" style="stop-color:#8B00FF;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FF00FF;stop-opacity:1" />
            </linearGradient>
        </defs>
        
        <!-- Sky background -->
        <rect width="400" height="300" fill="url(#skyGrad)"/>
        
        <!-- Rainbow platforms -->
        <rect x="20" y="200" width="100" height="15" fill="#FF6B6B" rx="3"/>
        <rect x="150" y="170" width="80" height="15" fill="#FFB347" rx="3"/>
        <rect x="260" y="140" width="90" height="15" fill="#FFD93D" rx="3"/>
        <rect x="80" y="110" width="85" height="15" fill="#6BCF7F" rx="3"/>
        <rect x="200" y="80" width="95" height="15" fill="#4ECDC4" rx="3"/>
        <rect x="320" y="50" width="70" height="15" fill="#95B8D1" rx="3"/>
        
        <!-- Player character -->
        <rect x="50" y="170" width="25" height="25" fill="#3498DB" rx="3"/>
        <circle cx="57" cy="180" r="3" fill="white"/>
        <circle cx="68" cy="180" r="3" fill="white"/>
        
        <!-- Collectibles -->
        <circle cx="190" cy="145" r="10" fill="#FFD700"/>
        <circle cx="250" cy="55" r="10" fill="#FFD700"/>
        
        <!-- Title -->
        <text x="200" y="280" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
              text-anchor="middle" fill="url(#rainbowGrad)">Rainbow Rush</text>
        
        <!-- Decorative stars -->
        <circle cx="30" cy="30" r="2" fill="white" opacity="0.8"/>
        <circle cx="350" cy="180" r="2" fill="white" opacity="0.8"/>
        <circle cx="120" cy="50" r="2" fill="white" opacity="0.8"/>
    </svg>'''
    
    output_path = 'app/games/rainbow-rush/thumbnail.png'
    
    print("Creating Rainbow Rush thumbnail...")
    png_data = cairosvg.svg2png(bytestring=svg.encode('utf-8'))
    img = Image.open(io.BytesIO(png_data))
    img.save(output_path)
    print(f"✅ Thumbnail created: {output_path}")
    
except ImportError as e:
    print(f"⚠️  Missing dependency: {e}")
    print("Using simple approach without cairosvg...")
    
    # Fallback: create a simple colored rectangle using PIL
    from PIL import Image, ImageDraw, ImageFont
    
    output_path = 'app/games/rainbow-rush/thumbnail.png'
    
    # Create image
    img = Image.new('RGB', (400, 300), color='#87CEEB')
    draw = ImageDraw.Draw(img)
    
    # Draw platforms
    colors = ['#FF6B6B', '#FFB347', '#FFD93D', '#6BCF7F', '#4ECDC4', '#95B8D1']
    platforms = [
        (20, 200, 120, 215),
        (150, 170, 230, 185),
        (260, 140, 350, 155),
        (80, 110, 165, 125),
        (200, 80, 295, 95),
        (320, 50, 390, 65)
    ]
    
    for i, (x1, y1, x2, y2) in enumerate(platforms):
        draw.rounded_rectangle([x1, y1, x2, y2], radius=3, fill=colors[i])
    
    # Draw player
    draw.rounded_rectangle([50, 170, 75, 195], radius=3, fill='#3498DB')
    draw.ellipse([54, 177, 60, 183], fill='white')
    draw.ellipse([65, 177, 71, 183], fill='white')
    
    # Draw collectibles
    draw.ellipse([180, 135, 200, 155], fill='#FFD700')
    draw.ellipse([240, 45, 260, 65], fill='#FFD700')
    
    # Draw title
    try:
        font = ImageFont.truetype("arial.ttf", 32)
    except:
        font = ImageFont.load_default()
    
    # Rainbow text (simplified)
    draw.text((200, 265), "Rainbow Rush", fill='#FF00FF', font=font, anchor='mm')
    
    # Save
    img.save(output_path)
    print(f"✅ Thumbnail created (fallback): {output_path}")
