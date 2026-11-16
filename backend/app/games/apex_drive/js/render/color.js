/** Colours as the 32-bit words of an ImageData buffer (little endian: 0xAABBGGRR). */

/** @param {string} hex '#rrggbb' @returns {[number, number, number]} */
export function rgbOf(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** @param {[number, number, number]} rgb */
export function toPixel([r, g, b]) {
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** `from` moved towards `to` by `amount` (0..1), as a pixel word. */
export function mixPixel(from, to, amount) {
    const a = rgbOf(from);
    const b = rgbOf(to);
    return toPixel(a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount)));
}
