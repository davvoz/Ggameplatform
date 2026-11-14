"""python -m unittest discover -s tools -p "test_*.py"  (from the game folder)"""

import unittest

import prepare_sprites as ps
from PIL import Image

CLEAR = (0, 0, 0, 0)
WHITE = (252, 250, 255, 255)
CLOTH = (200, 200, 210, 255)
OUTLINE = (30, 20, 40, 255)
GROUND = (183, 180, 190, 240)


def figure_with_pocket() -> Image.Image:
    """Two legs (outlined cloth) with pure white between them, closed below by a grey ground line."""
    image = Image.new("RGBA", (40, 30), CLEAR)
    for x in range(5, 35):
        for y in range(5, 20):
            image.putpixel((x, y), OUTLINE if x in (5, 34) or y == 5 else CLOTH)
    for x in range(12, 28):
        for y in range(10, 20):
            image.putpixel((x, y), WHITE)
    for x in range(5, 35):
        image.putpixel((x, 20), GROUND)
    image.putpixel((8, 8), WHITE)  # a highlight on the cloth
    return image


class PocketTest(unittest.TestCase):
    def test_clears_the_white_between_the_legs_and_the_ground_line(self):
        image = figure_with_pocket()
        ps.remove_white_pockets(image)
        self.assertEqual(image.getpixel((20, 15)), CLEAR)
        self.assertEqual(image.getpixel((20, 20)), CLEAR, "the ground line under the pocket")

    def test_keeps_the_cloth_its_outline_and_small_highlights(self):
        image = figure_with_pocket()
        ps.remove_white_pockets(image)
        self.assertEqual(image.getpixel((8, 15)), CLOTH)
        self.assertEqual(image.getpixel((5, 15)), OUTLINE)
        self.assertEqual(image.getpixel((8, 8)), WHITE)


class MirrorTest(unittest.TestCase):
    def test_turns_each_frame_in_its_own_cell_keeping_the_order(self):
        width = ps.FRAMES * 7 + 3  # cells that do not divide the sheet evenly, like the real ones
        image = Image.new("RGBA", (width, 2), CLEAR)
        for i in range(ps.FRAMES):
            image.putpixel(((i * width) // ps.FRAMES, 0), (i, 0, 0, 255))  # a dot on each cell's left edge
        mirrored = ps.mirror_frames(image)
        self.assertEqual(mirrored.size, image.size)
        cell = width // ps.FRAMES
        for i in range(ps.FRAMES):
            right_edge = (i * width) // ps.FRAMES + cell - 1
            self.assertEqual(mirrored.getpixel((right_edge, 0)), (i, 0, 0, 255))


if __name__ == "__main__":
    unittest.main()
