"""
Generate lightweight WebP preview thumbnails for all games.

Scans each game directory for thumbnail.png and creates a compressed
thumbnail_preview.webp (max 400px wide) for use on the main Games grid.

This reduces page load significantly (e.g. from ~22 MB to ~500 KB total).

Usage:
    python scripts/generate_thumbnail_previews.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image

GAMES_DIR = Path(__file__).parent.parent / "app" / "games"
PREVIEW_MAX_WIDTH = 400
PREVIEW_QUALITY = 75  # WebP quality (0-100)
PREVIEW_FILENAME = "thumbnail_preview.webp"


def generate_preview(game_dir: Path):
    """Generate a lightweight WebP preview for a game's thumbnail."""
    # Look for original thumbnail (png, jpg, jpeg, webp)
    original = None
    for ext in ["png", "jpg", "jpeg", "webp"]:
        candidate = game_dir / f"thumbnail.{ext}"
        if candidate.exists():
            original = candidate
            break

    if not original:
        return None

    preview_path = game_dir / PREVIEW_FILENAME

    try:
        with Image.open(original) as img:
            # Convert RGBA to RGB for WebP compatibility if needed
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize maintaining aspect ratio
            w, h = img.size
            if w > PREVIEW_MAX_WIDTH:
                ratio = PREVIEW_MAX_WIDTH / w
                new_size = (PREVIEW_MAX_WIDTH, int(h * ratio))
                img = img.resize(new_size, Image.LANCZOS)

            # Save as compressed WebP
            img.save(preview_path, "WEBP", quality=PREVIEW_QUALITY, method=4)

            original_kb = original.stat().st_size / 1024
            preview_kb = preview_path.stat().st_size / 1024
            reduction = (1 - preview_kb / original_kb) * 100 if original_kb > 0 else 0

            return {
                "game": game_dir.name,
                "original_kb": round(original_kb, 1),
                "preview_kb": round(preview_kb, 1),
                "reduction": round(reduction, 1),
            }
    except Exception as e:
        print(f"  ❌ Error processing {game_dir.name}: {e}")
        return None


def main():
    if not GAMES_DIR.exists():
        print(f"Games directory not found: {GAMES_DIR}")
        sys.exit(1)

    print(f"📁 Scanning games in: {GAMES_DIR}\n")

    results = []
    total_original = 0
    total_preview = 0

    for game_dir in sorted(GAMES_DIR.iterdir()):
        if not game_dir.is_dir():
            continue
        # Skip backend game directories (Python routers, not static game files)
        if game_dir.name.endswith("_be"):
            continue

        result = generate_preview(game_dir)
        if result:
            results.append(result)
            total_original += result["original_kb"]
            total_preview += result["preview_kb"]
            print(
                f"  ✅ {result['game']:35s} "
                f"{result['original_kb']:>8.1f} KB → {result['preview_kb']:>8.1f} KB "
                f"(-{result['reduction']:.0f}%)"
            )
        else:
            # Check if directory has any content (skip empty/non-game dirs)
            has_html = any(game_dir.glob("*.html"))
            if has_html:
                print(f"  ⚠️  {game_dir.name:35s} No thumbnail found")

    print(f"\n{'='*70}")
    print(f"  Processed: {len(results)} games")
    print(f"  Total original:  {total_original:>10.1f} KB ({total_original/1024:.1f} MB)")
    print(f"  Total previews:  {total_preview:>10.1f} KB ({total_preview/1024:.1f} MB)")
    if total_original > 0:
        print(f"  Total reduction: {(1 - total_preview/total_original)*100:.0f}%")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
