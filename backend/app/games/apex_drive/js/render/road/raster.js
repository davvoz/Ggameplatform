import { FULL } from '../../sim/Ground.js';

/**
 * Paints projected strips into a pixel buffer, one screen row at a time,
 * like the scanline road of the 16-bit racers. Strips come near to far; a
 * row already painted by a nearer strip stays, so a crest hides the road
 * behind it. Rows nothing reaches stay transparent: the backdrop shows there.
 *
 * A row is the ground beside the road, then each ribbon of asphalt on it
 * (sim/Ground.js: one on most of the road, a narrower one, two on a fork,
 * none over a gap) with its rumble strips and lane marks; a ramp's asphalt
 * is striped. Over the abyss the ground is VOID, left for render/road/abyss.js.
 *
 * Pure function over a Uint32Array: testable without a browser.
 *
 * @typedef {{grass: number, rumble: number, asphalt: number, lane: number|null, ramp: number[]}} RowColors
 *   pixel words (see color.js); lane null: no lane marks on this strip; ramp: a ramp's two stripes
 */

/** Rumble strips are this fraction of the road's half width. */
const RUMBLE = 1 / 7;
/** Lane marks are this fraction of the road's half width. */
const LANE = 1 / 28;
/** A pixel with nothing on it over the abyss: no alpha, so never seen unless painted over. */
export const VOID = 1;

function span(pixels, rowStart, width, from, to, color) {
    const a = Math.max(0, Math.round(from));
    const b = Math.min(width, Math.round(to));
    if (b > a) pixels.fill(color, rowStart + a, rowStart + b);
}

/** The ribbons on a row, eased from the strip's far edge (t = 0) to its near one (t = 1). */
function ribbonsOn(strip, t) {
    const near = strip.ribbons ?? FULL;
    const far = strip.farRibbons?.length === near.length ? strip.farRibbons : near;
    if (near === FULL && far === FULL) return FULL;
    return near.map((r, i) => ({ c: far[i].c + (r.c - far[i].c) * t, w: far[i].w + (r.w - far[i].w) * t, ramp: r.ramp }));
}

/** One row: the ground everywhere, then each ribbon's rumble strips, asphalt and lane marks. */
function paintRow(pixels, width, row, { middle, half, ground }, { colors, lanes, ribbons, stripe }) {
    const start = row * width;
    pixels.fill(ground, start, start + width);
    for (const r of ribbons) {
        // written as the single road always was, so its pixels stay the same
        const m = middle + r.c * half;
        const h = r.w * half;
        const rumble = h * RUMBLE;
        span(pixels, start, width, m - h - rumble, m + h + rumble, colors.rumble);
    }
    for (const r of ribbons) {
        const m = middle + r.c * half;
        span(pixels, start, width, m - r.w * half, m + r.w * half, r.ramp ? stripe : colors.asphalt);
    }
    if (colors.lane === null) return;
    const mark = Math.max(0.5, half * LANE);
    for (const r of ribbons) {
        if (r.ramp) continue;
        const count = Math.max(1, Math.round(lanes * r.w));
        const left = middle + (r.c - r.w) * half;
        for (let k = 1; k < count; k++) {
            const at = left + (2 * r.w * half * k) / count;
            span(pixels, start, width, at - mark, at + mark, colors.lane);
        }
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
        const ground = strip.abyss ? VOID : colors.grass;
        const stripe = colors.ramp?.[strip.index % 2] ?? colors.asphalt;
        for (let row = first; row < last; row++) {
            const t = (row - far.y) / (near.y - far.y);
            const place = { middle: far.x + (near.x - far.x) * t, half: far.w + (near.w - far.w) * t, ground };
            paintRow(pixels, width, row, place, { colors, lanes, ribbons: ribbonsOn(strip, t), stripe });
        }
        top = Math.min(top, first);
    }
    return top;
}
