/**
 * The frame is drawn at a fixed low height and scaled up with square pixels.
 * Its width follows the screen's shape (a phone on its side is wider than a
 * monitor), so the picture fills the screen without stretching. Beyond the
 * width limits it keeps its shape and leaves bars.
 *
 * @param {number} cssWidth @param {number} cssHeight the space on the page
 * @param {{height: number, minWidth: number, maxWidth: number}} screen
 * @returns {{width: number, height: number, cssWidth: number, cssHeight: number}}
 */
export function fitScreen(cssWidth, cssHeight, screen) {
    const aspect = cssWidth / Math.max(1, cssHeight);
    const even = Math.round((screen.height * aspect) / 2) * 2;
    const width = Math.min(screen.maxWidth, Math.max(screen.minWidth, even));
    const scale = Math.min(cssWidth / width, cssHeight / screen.height);
    return { width, height: screen.height, cssWidth: width * scale, cssHeight: screen.height * scale };
}

/** Pixels per world unit at distance 1, from the vertical field of view. */
export function focalLength(screen) {
    return screen.height / 2 / Math.tan((screen.fovY * Math.PI) / 360);
}
