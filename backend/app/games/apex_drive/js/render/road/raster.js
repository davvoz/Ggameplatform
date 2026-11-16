/**
 * Paints projected strips into a pixel buffer, one screen row at a time,
 * like the scanline road of the 16-bit racers. Strips come near to far; a
 * row already painted by a nearer strip stays, so a crest hides the road
 * behind it. Rows nothing reaches stay transparent: the backdrop shows there.
 *
 * Pure function over a Uint32Array: testable without a browser.
 *
 * @typedef {{grass: number, rumble: number, asphalt: number, lane: number|null}} RowColors
 *   pixel words (see color.js); lane null: no lane marks on this strip
 */

/** Rumble strips are this fraction of the road's half width. */
const RUMBLE = 1 / 7;
/** Lane marks are this fraction of the road's half width. */
const LANE = 1 / 28;

function span(pixels, rowStart, width, from, to, color) {
    const a = Math.max(0, Math.round(from));
    const b = Math.min(width, Math.round(to));
    if (b > a) pixels.fill(color, rowStart + a, rowStart + b);
}

/** One row: grass everywhere, then rumble strips, asphalt and lane marks. */
function paintRow(pixels, width, row, middle, half, colors, lanes) {
    const start = row * width;
    pixels.fill(colors.grass, start, start + width);
    const rumble = half * RUMBLE;
    span(pixels, start, width, middle - half - rumble, middle + half + rumble, colors.rumble);
    span(pixels, start, width, middle - half, middle + half, colors.asphalt);
    if (colors.lane === null) return;
    const mark = Math.max(0.5, half * LANE);
    for (let k = 1; k < lanes; k++) {
        const at = middle - half + (2 * half * k) / lanes;
        span(pixels, start, width, at - mark, at + mark, colors.lane);
    }
}

/**
 * @param {Uint32Array} pixels width x height, cleared here
 * @param {number} width
 * @param {number} height
 * @param {import('./project.js').Strip[]} strips near to far; each gets `clip`, the first row
 *   hidden by nearer road (sprites standing on it are cut there)
 * @param {(strip: import('./project.js').Strip) => RowColors} colorsOf
 * @param {number} lanes
 * @returns {number} the highest row painted (height when none)
 */
export function paintRoad(pixels, width, height, strips, colorsOf, lanes) {
    pixels.fill(0);
    let top = height;
    for (const strip of strips) {
        const { near, far } = strip;
        // rows from here down belong to nearer road: what stands on this strip is cut there
        strip.clip = top;
        // hidden behind a nearer crest, or seen from behind (beyond a crest)
        if (far.y >= top || far.y >= near.y) continue;
        const first = Math.max(0, Math.ceil(far.y));
        const last = Math.min(top, Math.ceil(near.y));
        const colors = colorsOf(strip);
        for (let row = first; row < last; row++) {
            const t = (row - far.y) / (near.y - far.y);
            paintRow(pixels, width, row, far.x + (near.x - far.x) * t, far.w + (near.w - far.w) * t, colors, lanes);
        }
        top = Math.min(top, first);
    }
    return top;
}
