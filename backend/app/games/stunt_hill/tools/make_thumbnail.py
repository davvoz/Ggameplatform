"""Generate thumbnail.png (1024x1024) for Stunt Hill — procedural, no assets.

Scene: golden-hour sky, sun, mountains, green hills, a dirt ramp and the red
stunt buggy mid-backflip with boost flames, a star and a gem arc, big title.

Run:  python backend/app/games/stunt_hill/tools/make_thumbnail.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W = H = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "thumbnail.png")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(draw, y0, y1, c0, c1):
    for y in range(y0, y1):
        draw.line([(0, y), (W, y)], fill=lerp(c0, c1, (y - y0) / max(1, y1 - y0)))


img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)

# ── sky (day blue → golden horizon) ─────────────────────────────────────────
vertical_gradient(d, 0, 560, (64, 132, 210), (244, 168, 116))
vertical_gradient(d, 560, H, (244, 168, 116), (255, 208, 142))

# ── sun with soft glow ──────────────────────────────────────────────────────
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
sx, sy = 768, 250
for r, a in ((300, 36), (210, 60), (140, 90), (86, 150)):
    gd.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 226, 150, a))
gd.ellipse([sx - 52, sy - 52, sx + 52, sy + 52], fill=(255, 248, 222, 255))
glow = glow.filter(ImageFilter.GaussianBlur(18))
img.paste(glow, (0, 0), glow)
d = ImageDraw.Draw(img)

# ── clouds ──────────────────────────────────────────────────────────────────
cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(cl)
for cx, cy, r, a in ((180, 150, 55, 210), (420, 100, 42, 180), (870, 130, 48, 190)):
    for ox, oy, rr in ((0, 0, r), (int(r * 0.9), int(r * 0.18), int(r * 0.74)),
                       (-int(r * 0.9), int(r * 0.2), int(r * 0.7)), (int(r * 0.15), -int(r * 0.4), int(r * 0.6))):
        cd.ellipse([cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr], fill=(255, 252, 244, a))
cl = cl.filter(ImageFilter.GaussianBlur(3))
img.paste(cl, (0, 0), cl)
d = ImageDraw.Draw(img)


def ridge(base_y, amp, freq, phase, color):
    pts = [(0, H)]
    for x in range(0, W + 16, 16):
        v = x * freq + phase
        y = base_y - amp * (0.55 * (1 - abs(math.sin(v))) + 0.30 * (1 - abs(math.sin(v * 2.13 + 1.7))) + 0.15 * math.sin(v * 4.1))
        pts.append((x, y))
    pts.append((W, H))
    d.polygon(pts, fill=color)


# ── mountains + hills ───────────────────────────────────────────────────────
ridge(520, 130, 0.006, 0.0, (158, 150, 196))
ridge(580, 150, 0.008, 2.4, (122, 108, 158))
pts = [(0, H)]
for x in range(0, W + 16, 16):
    y = 660 - 60 * (1 + math.sin(x * 0.004 * 10)) * 0.5 - 36 * math.sin(x * 0.004 * 23 + 1.3)
    pts.append((x, y))
pts.append((W, H))
d.polygon(pts, fill=(110, 152, 108))

# ── foreground terrain: ramp on the left, dipping right ─────────────────────
def ground_y(x):
    # ramp crest at x≈300 then a drop (the car just launched off it)
    crest = 760 - 240 * math.exp(-((x - 230) / 240) ** 2)
    return crest + 28 * math.sin(x * 0.004)


gpts = [(0, H)] + [(x, ground_y(x)) for x in range(0, W + 8, 8)] + [(W, H)]
d.polygon(gpts, fill=(86, 58, 32))
for y_off, col in ((34, (74, 50, 27)), (90, (62, 42, 22)), (170, (50, 33, 17))):
    d.line([(x, ground_y(x) + y_off) for x in range(0, W + 8, 8)], fill=col, width=10)
# grass band
d.line([(x, ground_y(x) - 4) for x in range(0, W + 6, 6)], fill=(57, 114, 46), width=26)
d.line([(x, ground_y(x) - 10) for x in range(0, W + 6, 6)], fill=(95, 174, 58), width=12)
d.line([(x, ground_y(x) - 16) for x in range(0, W + 6, 6)], fill=(158, 227, 107), width=5)

# ── gem arc + star along the flight path ────────────────────────────────────
def diamond(cx, cy, r, fill, outline):
    d.polygon([(cx, cy - r), (cx + int(r * 0.7), cy), (cx, cy + r), (cx - int(r * 0.7), cy)],
              fill=fill, outline=outline, width=4)


def star(cx, cy, r, fill, outline):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    d.polygon(pts, fill=fill, outline=outline, width=5)


for r_ratio, a in ((2.1, 40), (1.6, 70)):
    rr = int(58 * r_ratio)
    halo = Image.new("RGBA", (rr * 2, rr * 2), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([0, 0, rr * 2, rr * 2], fill=(255, 220, 90, a))
    halo = halo.filter(ImageFilter.GaussianBlur(10))
    img.paste(halo, (820 - rr, 420 - rr), halo)
d = ImageDraw.Draw(img)
star(820, 420, 58, (255, 210, 74), (164, 116, 16))
for i, (gx, gy) in enumerate(((600, 520), (700, 470), (920, 430))):
    diamond(gx, gy, 30, (255, 225, 74), (164, 116, 16))

# ── the stunt buggy, mid-backflip (drawn on its own layer, then rotated) ────
car = Image.new("RGBA", (420, 300), (0, 0, 0, 0))
cd = ImageDraw.Draw(car)
hw, hb, cx0, cy0 = 150, 46, 210, 190
# wheels
for wx in (cx0 - 100, cx0 + 100):
    cd.ellipse([wx - 52, cy0 + 8, wx + 52, cy0 + 112], fill=(28, 28, 31), outline=(10, 10, 12), width=6)
    cd.ellipse([wx - 26, cy0 + 34, wx + 26, cy0 + 86], fill=(150, 150, 160))
    cd.ellipse([wx - 9, cy0 + 51, wx + 9, cy0 + 69], fill=(245, 160, 15))
# spoiler
cd.polygon([(cx0 - hw - 36, cy0 - 96), (cx0 - hw + 38, cy0 - 70), (cx0 - hw + 38, cy0 - 48), (cx0 - hw - 36, cy0 - 74)], fill=(35, 35, 42))
cd.line([(cx0 - hw + 24, cy0 - 60), (cx0 - hw + 50, cy0 - 10)], fill=(35, 35, 42), width=12)
# roll bar
cd.arc([cx0 - 96, cy0 - 130, cx0 + 10, cy0 + 10], 180, 330, fill=(46, 46, 54), width=14)
# helmet (white with a red top stripe and a small side visor)
cd.ellipse([cx0 - 58, cy0 - 112, cx0 + 6, cy0 - 48], fill=(244, 244, 248), outline=(150, 150, 160), width=3)
cd.pieslice([cx0 - 58, cy0 - 112, cx0 + 6, cy0 - 48], 235, 305, fill=(210, 52, 42))
cd.ellipse([cx0 - 12, cy0 - 90, cx0 + 6, cy0 - 62], fill=(45, 184, 232), outline=(20, 110, 150), width=2)
# body wedge
cd.polygon([
    (cx0 - hw, cy0 + 26), (cx0 + hw - 4, cy0 + 26), (cx0 + hw + 4, cy0 - 6),
    (cx0 + hw * 0.55, cy0 - 36), (cx0 + hw * 0.28, cy0 - 32), (cx0 - hw * 0.12, cy0 - 28),
    (cx0 - hw * 0.55, cy0 - 38), (cx0 - hw, cy0 - 20),
], fill=(226, 58, 34), outline=(94, 18, 10), width=5)
cd.line([(cx0 - hw * 0.9, cy0 - 12), (cx0 + hw * 0.9, cy0 - 8)], fill=(255, 236, 180), width=12)
cd.ellipse([cx0 + 36, cy0 - 26, cx0 + 88, cy0 + 26], fill=(255, 255, 255))
# headlight / brake light
cd.ellipse([cx0 + hw - 8, cy0 - 16, cx0 + hw + 12, cy0 + 4], fill=(255, 238, 140))
# boost flames out the back (pointed cones)
for ln, fr, fc in ((150, 34, (255, 122, 24, 235)), (104, 21, (255, 210, 74, 255))):
    cd.polygon([(cx0 - hw - 6, cy0 - fr), (cx0 - hw - 6, cy0 + fr + 8), (cx0 - hw - 6 - ln, cy0 + 4)], fill=fc)

try:
    fnt_n = ImageFont.truetype(r"C:\Windows\Fonts\impact.ttf", 64)
except OSError:
    fnt_n = ImageFont.load_default()
cd.text((cx0 + 62, cy0 - 4), "5", font=fnt_n, fill=(210, 52, 42), anchor="mm")

car = car.rotate(24, expand=True, resample=Image.BICUBIC)
img.paste(car, (250, 270), car)
d = ImageDraw.Draw(img)

# ── dust burst at the ramp lip ──────────────────────────────────────────────
dust = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dd = ImageDraw.Draw(dust)
for i in range(26):
    ang = math.pi * (0.9 + 0.7 * (i / 26))
    rr = 18 + (i * 11) % 42
    px = 330 + math.cos(ang) * (40 + i * 7)
    py = 600 + math.sin(ang) * (26 + i * 3)
    dd.ellipse([px - rr, py - rr, px + rr, py + rr], fill=(202, 164, 106, 70))
dust = dust.filter(ImageFilter.GaussianBlur(6))
img.paste(dust, (0, 0), dust)
d = ImageDraw.Draw(img)

# ── title ───────────────────────────────────────────────────────────────────
try:
    fnt = ImageFont.truetype(r"C:\Windows\Fonts\impact.ttf", 148)
except OSError:
    fnt = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 132)
title = "STUNT HILL"
# drop shadow, outline, fill
d.text((W // 2 + 6, 96 + 8), title, font=fnt, fill=(40, 22, 6), anchor="mm")
d.text((W // 2, 96), title, font=fnt, fill=(255, 210, 74), anchor="mm",
       stroke_width=10, stroke_fill=(74, 38, 8))

# ── vignette ────────────────────────────────────────────────────────────────
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse([-W * 0.35, -H * 0.35, W * 1.35, H * 1.35], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(160))
black = Image.new("RGB", (W, H), (8, 10, 20))
img = Image.composite(img, black, vig.point(lambda v: 96 + v * 159 // 255))

img.save(os.path.abspath(OUT))
print("saved", os.path.abspath(OUT), img.size)
