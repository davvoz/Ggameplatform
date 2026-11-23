"""
The weekly banner: the hand-made Cur8 Games banner (assets/banner_template.jpg,
with the week texts and the game pictures taken out) with this week's numbers
and the thumbnails of the three rewarded games.
"""

import io
from typing import List, Optional, Tuple

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from app.weekly_report.config import ASSETS_DIR, GAMES_DIR
from app.weekly_report.report import GameInfo
from app.weekly_report.text import amount

TEMPLATE = ASSETS_DIR / "banner_template.jpg"
FONTS = ASSETS_DIR / "fonts"
HEADLINE_FONT = FONTS / "Barlow-Black.ttf"
HEADLINE_ITALIC_FONT = FONTS / "Barlow-BlackItalic.ttf"
CONDENSED_FONT = FONTS / "BarlowCondensed-Bold.ttf"

Box = Tuple[int, int, int, int]
Color = Tuple[int, int, int]

# Where the template expects each element (pixels of the 2000x1333 template)
CONCLUDED_BOX: Box = (360, 266, 1700, 372)  # "WEEK N CONCLUDED!", letters' cap height = box height
STARTS_BOX: Box = (260, 520, 1800, 622)  # "WEEK N+1 STARTS NOW!"
PILL_TEXT_BOX: Box = (560, 412, 1676, 468)  # "150 STEEM  DISTRIBUTED IN WEEK N"
PANELS: List[Box] = [(33, 649, 657, 1070), (687, 649, 1313, 1070), (1342, 649, 1969, 1070)]
PANEL_RADIUS = 28

ORANGE = ((253, 214, 10), (252, 88, 3))
CYAN = ((180, 242, 250), (0, 160, 250))
SILVER = ((255, 255, 255), (165, 175, 235))
OUTLINE: Color = (6, 3, 12)

JPEG_QUALITY = 90


class _Text:
    """A line of text with a vertical gradient, an outline and a soft shadow."""

    def __init__(self, text: str, font_path, cap_height: int, gradient: Tuple[Color, Color], outline: int):
        self.text, self.font_path, self.gradient, self.outline = text, font_path, gradient, outline
        self.font = self._font_for_cap_height(cap_height)

    def _font_for_cap_height(self, cap_height: int) -> ImageFont.FreeTypeFont:
        probe = ImageFont.truetype(str(self.font_path), 200)
        top, bottom = probe.getbbox("H")[1], probe.getbbox("H")[3]
        return ImageFont.truetype(str(self.font_path), round(200 * cap_height / (bottom - top)))

    @property
    def width(self) -> int:
        left, _, right, _ = self.font.getbbox(self.text, stroke_width=self.outline)
        return right - left

    def shrink_to(self, width: int) -> None:
        if self.width > width:
            self.font = ImageFont.truetype(str(self.font_path), int(self.font.size * width / self.width))

    def draw(self, canvas: Image.Image, x: int, cap_top: int) -> None:
        """Draw with the outline's left edge at x and the top of the capitals at cap_top."""
        pad = self.outline * 4
        left, top, right, bottom = self.font.getbbox(self.text, stroke_width=self.outline)
        size = (right - left + 2 * pad, bottom - top + 2 * pad)
        origin = (pad - left, pad - top)

        outline_mask = Image.new("L", size)
        ImageDraw.Draw(outline_mask).text(origin, self.text, font=self.font, fill=255,
                                          stroke_width=self.outline, stroke_fill=255)
        fill_mask = Image.new("L", size)
        ImageDraw.Draw(fill_mask).text(origin, self.text, font=self.font, fill=255)

        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        shadow = outline_mask.filter(ImageFilter.GaussianBlur(self.outline * 1.5)).point(lambda v: v * 0.8)
        layer.paste((0, 0, 0, 255), (0, 0), shadow)
        layer.paste(OUTLINE + (255,), (0, 0), outline_mask)
        layer.paste(_gradient(size, *self.gradient, fill_mask.getbbox()), (0, 0), fill_mask)

        cap_top_in_layer = origin[1] + self.font.getbbox("H")[1]
        canvas.alpha_composite(layer, (x - pad, cap_top - cap_top_in_layer))


def _gradient(size, top: Color, bottom: Color, bbox) -> Image.Image:
    """A vertical gradient running from the top to the bottom of bbox."""
    y0, y1 = (bbox[1], bbox[3]) if bbox else (0, size[1])
    column = Image.new("RGB", (1, size[1]))
    for y in range(size[1]):
        t = min(1.0, max(0.0, (y - y0) / max(1, y1 - y0)))
        column.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return column.resize(size)


def _centered(canvas: Image.Image, text: _Text, box: Box) -> None:
    x0, y0, x1, _ = box
    text.shrink_to(x1 - x0)
    text.draw(canvas, (x0 + x1 - text.width) // 2, y0)


def _pill(canvas: Image.Image, steem: str, week: int) -> None:
    x0, y0, x1, y1 = PILL_TEXT_BOX
    cap = y1 - y0
    big = _Text(f"{steem} STEEM", HEADLINE_FONT, cap, SILVER, 4)
    small = _Text(f"DISTRIBUTED IN WEEK {week}", CONDENSED_FONT, round(cap * 0.86), SILVER, 3)
    gap = cap // 2
    overflow = (big.width + gap + small.width) / (x1 - x0)
    if overflow > 1:
        big.shrink_to(int(big.width / overflow))
        small.shrink_to(int(small.width / overflow))
    big.draw(canvas, x0, y0)
    small.draw(canvas, x0 + big.width + gap, y0 + (cap - round(cap * 0.86)) // 2)


def _load_thumbnail(game: GameInfo) -> Optional[Image.Image]:
    """The game's thumbnail: a URL, or a file in the game's folder."""
    try:
        if game.thumbnail.startswith("http"):
            response = httpx.get(game.thumbnail, timeout=20)
            response.raise_for_status()
            return Image.open(io.BytesIO(response.content)).convert("RGB")
        folder = GAMES_DIR / game.game_id
        candidates = [folder / game.thumbnail] if game.thumbnail else []
        candidates += sorted(folder.glob("thumbnail.*"))
        path = next((p for p in candidates if p.is_file()), None)
        return Image.open(path).convert("RGB") if path else None
    except Exception:
        return None


def _panel(canvas: Image.Image, box: Box, game: GameInfo) -> None:
    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    picture = _load_thumbnail(game)
    if picture is None:
        picture = Image.new("RGB", size, (10, 14, 48))
        title = _Text(game.title.upper(), HEADLINE_FONT, 56, CYAN, 4)
        title.shrink_to(size[0] - 60)
        layer = picture.convert("RGBA")
        title.draw(layer, (size[0] - title.width) // 2, size[1] // 2 - 28)
        picture = layer.convert("RGB")
    picture = ImageOps.fit(picture, size, Image.LANCZOS)
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=PANEL_RADIUS, fill=255)
    canvas.paste(picture, (x0, y0), mask)


def render_banner(closed_week: int, next_week: int, steem_distributed: float, games: List[GameInfo]) -> bytes:
    """The banner as JPEG bytes."""
    canvas = Image.open(TEMPLATE).convert("RGBA")
    _centered(canvas, _Text(f"WEEK {closed_week} CONCLUDED!", HEADLINE_FONT, CONCLUDED_BOX[3] - CONCLUDED_BOX[1], ORANGE, 9), CONCLUDED_BOX)
    _pill(canvas, amount(steem_distributed), closed_week)
    _centered(canvas, _Text(f"WEEK {next_week} STARTS NOW!", HEADLINE_ITALIC_FONT, STARTS_BOX[3] - STARTS_BOX[1], CYAN, 8), STARTS_BOX)
    for box, game in zip(PANELS, games):
        _panel(canvas, box, game)

    out = io.BytesIO()
    canvas.convert("RGB").save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out.getvalue()
