/**
 * Potholes and cracks painted into the road's pixels, after the road
 * (raster.js), on the strips they lie on and only on the rows those strips
 * showed: a crest hides them like it hides the road.
 *
 * A pothole is an oval over its few segments: its far wall catches the
 * light, its floor is dark, its near lip is a pale edge. A crack is a jagged
 * dark line across part of the road, drawn only near enough to read.
 *
 * Pure function over a Uint32Array, like raster.js.
 *
 * @typedef {{inside: number, wall: number, rim: number, crack: number}} HoleColors pixel words
 */

/** The part of its length a hole's oval takes, from its near end (0) to its far one (1). */
const HOLE = { middle: 0.5, half: 0.47 };
/** Rows of the oval past these shares of its depth are its far wall and its near lip. */
const LOOK = { wall: 0.35, lip: -0.7 };
/** Cracks show on strips at least this many pixels wide (half the road). */
const CRACK_FROM = 24;

function span(pixels, rowStart, width, from, to, color) {
    const a = Math.max(0, Math.round(from));
    const b = Math.min(width, Math.round(to));
    if (b > a) pixels.fill(color, rowStart + a, rowStart + b);
}

/** The rows a strip painted (not hidden by nearer road), or null. */
function shownRows({ near, far, clip }) {
    if (clip === undefined || far.y >= clip || far.y >= near.y) return null;
    const first = Math.max(0, Math.ceil(far.y));
    const last = Math.min(clip, Math.ceil(near.y));
    return last > first ? { first, last } : null;
}

/** The road's middle and half width on a row of a strip; t: 0 at its far edge, 1 at its near one. */
function across({ near, far }, row) {
    const t = (row - far.y) / (near.y - far.y);
    return { t, middle: far.x + (near.x - far.x) * t, half: far.w + (near.w - far.w) * t };
}

function paintHole(pixels, width, strip, rows, hole, colors) {
    // which of the hole's segments this strip is
    const part = strip.index - hole.segment;
    for (let row = rows.first; row < rows.last; row++) {
        const { t, middle, half } = across(strip, row);
        // where in the oval this row is: -1 at its near lip, 1 at its far wall
        const e = ((part + 1 - t) / hole.length - HOLE.middle) / HOLE.half;
        if (Math.abs(e) > 1) continue;
        const reach = (hole.width / 2) * Math.sqrt(1 - e * e);
        let color = colors.inside;
        if (e > LOOK.wall) color = colors.wall;
        else if (e < LOOK.lip) color = colors.rim;
        span(pixels, row * width, width, middle + (hole.x - reach) * half, middle + (hole.x + reach) * half, color);
    }
}

function paintCrack(pixels, width, strip, rows, crack, color) {
    const row = Math.round(strip.far.y + (strip.near.y - strip.far.y) * (1 - crack.at));
    if (row < rows.first || row >= rows.last) return;
    const { middle, half } = across(strip, row);
    if (half < CRACK_FROM) return;
    const from = Math.max(0, Math.round(middle + crack.from * half));
    const to = Math.min(width, Math.round(middle + crack.to * half));
    for (let x = from; x < to; x++) {
        // a jagged line: it steps a row down and back now and then
        const y = row + (((x * 7 + crack.segment) >> 2) % 2);
        if (y < rows.last) pixels[y * width + x] = color;
    }
}

/**
 * @param {Uint32Array} pixels the road, as raster.js painted it
 * @param {number} width
 * @param {import('./project.js').Strip[]} strips with their `clip` (set by paintRoad)
 * @param {import('../../sim/Potholes.js').PotholeField} field
 * @param {(strip: import('./project.js').Strip) => {hole?: HoleColors}} colorsOf
 */
export function paintPotholes(pixels, width, strips, field, colorsOf) {
    for (const strip of strips) {
        if (!strip.broken) continue;
        const holes = field.holesAt(strip.index);
        const cracks = field.cracksAt(strip.index);
        const rows = holes.length + cracks.length > 0 ? shownRows(strip) : null;
        const colors = rows && colorsOf(strip).hole;
        if (!colors) continue;
        for (const crack of cracks) paintCrack(pixels, width, strip, rows, crack, colors.crack);
        for (const hole of holes) paintHole(pixels, width, strip, rows, hole, colors);
    }
}
