"""
Turns the prototype's sprite sheets (PNG) into the game's WebP sheets.

    python tools/prepare_sprites.py C:/progetti/fantasygame/assets/spritesheets [actor ...]

- Every sheet keeps its exact size (checked after saving): the game cuts the
  frames by size, so a sheet that shrinks shows a tiny character.
- Sheets of the actors in CLEAN lose the white background left around the
  figure: starting from the transparent pixels, near-white pixels touching
  them are made transparent. Dark outlines stop the fill, so white clothes
  inside the figure stay.
- Sheets in POCKETS also lose the white trapped between the legs, which a
  grey ground line cuts off from the transparent area: patches of pure white
  of at least POCKET pixels and the near-white around them; then the thin
  grey ground lines left floating under the feet.
- Sheets in MIRRORED are not read for their LEFT side: it is the cleaned
  RIGHT sheet mirrored frame by frame (frames in the same order), for the
  prototype sheets whose two sides were drawn differently.

Keep ACTORS in step with `js/config/Sprites.js` (folders and animations).
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites"
SIDES = ("LEFT", "RIGHT")
ACTORS = {
    "mage": ("IDLE", "SPELL", "TAKE_DAMAGE", "BLOCK"),
    "warrior": ("IDLE", "WALK", "ATTACK", "TAKE_DAMAGE"),
    "elf": ("IDLE", "WALK", "SPELL", "TAKE_DAMAGE"),
    "ken": ("IDLE", "WALK", "ATTACK", "SPELL", "TAKE_DAMAGE"),
    "bat": ("IDLE", "TAKE_DAMAGE"),
}
CLEAN = {"ken"}
POCKETS = {("ken", "WALK")}
MIRRORED = {("ken", "WALK")}
FRAMES = 11  # frames per sheet, as FRAMES in js/config/Sprites.js

TRANSPARENT = 32      # alpha at or below: empty
WHITE = 222           # every channel at least this: background white
GREY_SPREAD = 28      # ...and channels this close: no colour in it
FRINGE_ALPHA = 200    # half-transparent edge pixels...
FRINGE_LIGHT = 170    # ...this light are leftovers too
PURE = 240            # every channel at least this: pure white
PURE_SPREAD = 16
POCKET = 24           # smaller pure-white patches are highlights on the clothes
GROUND_LIGHT = 150    # a ground line: grey at least this light...
GROUND_REACH = 3      # ...with empty space this close above and below
NEIGHBOURS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def _is_background(pixel) -> bool:
    r, g, b, a = pixel
    if a <= TRANSPARENT:
        return False
    low, high = min(r, g, b), max(r, g, b)
    if high - low > GREY_SPREAD:
        return False
    return low >= WHITE or (a < FRINGE_ALPHA and low >= FRINGE_LIGHT)


def remove_white_halo(image: Image.Image) -> int:
    """Clears near-white pixels connected to the transparent area. @returns how many."""
    width, height = image.size
    pixels = image.load()
    queue = deque((x, y) for y in range(height) for x in range(width) if pixels[x, y][3] <= TRANSPARENT)
    seen = set(queue)
    cleared = 0
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not (0 <= nx < width and 0 <= ny < height) or (nx, ny) in seen:
                continue
            seen.add((nx, ny))
            if _is_background(pixels[nx, ny]):
                pixels[nx, ny] = (0, 0, 0, 0)
                cleared += 1
                queue.append((nx, ny))
    return cleared


def _is_pure_white(pixel) -> bool:
    r, g, b, a = pixel
    low, high = min(r, g, b), max(r, g, b)
    return a > TRANSPARENT and low >= PURE and high - low <= PURE_SPREAD


def _is_near_white(pixel) -> bool:
    r, g, b, a = pixel
    low, high = min(r, g, b), max(r, g, b)
    return a > TRANSPARENT and low >= WHITE and high - low <= GREY_SPREAD


def _patch(pixels, size, start, accepts, seen) -> list:
    """The 4-connected pixels from `start` that `accepts`, marked in `seen`."""
    width, height = size
    seen.add(start)
    queue, patch = deque([start]), []
    while queue:
        x, y = queue.popleft()
        patch.append((x, y))
        for dx, dy in NEIGHBOURS:
            spot = (x + dx, y + dy)
            if 0 <= spot[0] < width and 0 <= spot[1] < height and spot not in seen and accepts(pixels[spot]):
                seen.add(spot)
                queue.append(spot)
    return patch


def _pockets(pixels, size) -> list:
    """Every pixel of the pure-white patches big enough to be background."""
    width, height = size
    seen = set()
    found = []
    for y in range(height):
        for x in range(width):
            if (x, y) not in seen and _is_pure_white(pixels[x, y]):
                patch = _patch(pixels, size, (x, y), _is_pure_white, seen)
                found.extend(patch if len(patch) >= POCKET else ())
    return found


def _is_empty(pixels, size, x, y) -> bool:
    return not (0 <= y < size[1]) or pixels[x, y][3] <= TRANSPARENT


def _is_ground_line(pixels, size, x, y) -> bool:
    """A thin light-grey line with empty space just above and just below it."""
    r, g, b, a = pixels[x, y]
    if a <= TRANSPARENT or min(r, g, b) < GROUND_LIGHT or max(r, g, b) - min(r, g, b) > GREY_SPREAD:
        return False
    reach = range(1, GROUND_REACH + 1)
    return any(_is_empty(pixels, size, x, y - d) for d in reach) and any(_is_empty(pixels, size, x, y + d) for d in reach)


def remove_white_pockets(image: Image.Image) -> int:
    """Clears the white trapped between the legs, then the ground lines left floating. @returns how many."""
    pixels = image.load()
    size = image.size
    seen = set()
    cleared = set()
    for spot in _pockets(pixels, size):
        if spot not in seen:
            cleared.update(_patch(pixels, size, spot, _is_near_white, seen))
    for spot in cleared:
        pixels[spot] = (0, 0, 0, 0)
    width, height = size
    ground = [(x, y) for y in range(height) for x in range(width) if _is_ground_line(pixels, size, x, y)]
    for spot in ground:
        pixels[spot] = (0, 0, 0, 0)
    return len(cleared) + len(ground)


def mirror_frames(image: Image.Image) -> Image.Image:
    """Each frame turned the other way, in its own cell and in the same order."""
    mirrored = image.copy()
    cell = image.width // FRAMES  # the game cuts each frame this wide from floor(i * width / FRAMES)
    for i in range(FRAMES):
        left = (i * image.width) // FRAMES
        box = (left, 0, left + cell, image.height)
        mirrored.paste(image.crop(box).transpose(Image.Transpose.FLIP_LEFT_RIGHT), box[:2])
    return mirrored


def _cleaned(source: Path, actor: str, anim: str, side: str) -> tuple:
    image = Image.open(source / actor / f"{anim}_{side}.png").convert("RGBA")
    cleared = remove_white_halo(image) if actor in CLEAN else 0
    if (actor, anim) in POCKETS:
        cleared += remove_white_pockets(image)
    return image, cleared


def prepare(source: Path, actor: str, anim: str, side: str) -> str:
    mirror = (actor, anim) in MIRRORED and side == "LEFT"
    image, cleared = _cleaned(source, actor, anim, "RIGHT" if mirror else side)
    if mirror:
        image = mirror_frames(image)
    size = image.size
    target = OUT / actor / f"{anim}_{side}.webp"
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=90, alpha_quality=100, method=6)
    saved = Image.open(target).size
    if saved != size:
        raise RuntimeError(f"{target.name}: saved {saved}, expected {size}")
    note = (f", {cleared} white pixels cleared" if cleared else "") + (", mirrored from RIGHT" if mirror else "")
    return f"{actor}/{target.name} {size[0]}x{size[1]}{note}"


def main(argv: list) -> int:
    if not argv:
        print(__doc__)
        return 1
    source = Path(argv[0])
    actors = argv[1:] or list(ACTORS)
    for actor in actors:
        for anim in ACTORS[actor]:
            for side in SIDES:
                print(prepare(source, actor, anim, side))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
