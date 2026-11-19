import { ABYSS } from '../config/Hazards.js';

/**
 * Where there is ground under a car. A segment's road is a list of ribbons
 * of asphalt, each with its middle `c` and its half width `w` (in half widths
 * of the usual road, like a car's x): one full ribbon on most of the road,
 * one narrower where the road narrows, two where it forks, none over the gap
 * of a jump. Beside the ribbons is ground (grass, snow, rock: off the road,
 * slow but solid), unless the segment is over the abyss: then it is void.
 *
 * A ribbon may be a `ramp` (the stretch before a gap: a car leaving it flies)
 * or have a `face` (the first segment after a gap: its rock wall shows below).
 *
 * @typedef {{c: number, w: number, ramp?: boolean, face?: boolean}} Ribbon
 */

/** The usual road: one ribbon, the whole width. */
export const FULL = Object.freeze([Object.freeze({ c: 0, w: 1 })]);

const smoothstep = (t) => t * t * (3 - 2 * t);

/** The entry of `ranges` ([from, to, ...] shares of the lap) holding segment i, as [entry, ease 0..1], or null. */
function rangeAt(ranges, i, count, ease) {
    for (const range of ranges ?? []) {
        const from = Math.round(range[0] * count);
        const to = Math.round(range[1] * count);
        if (i < from || i >= to) continue;
        const inside = Math.min(i - from, to - 1 - i);
        return [range, smoothstep(Math.min(1, inside / ease))];
    }
    return null;
}

/** The ribbons of segment i before the jumps: narrowed or forked. */
function ribbonsOf(def, i, count) {
    const fork = rangeAt(def.forks, i, count, ABYSS.forkEase);
    if (fork) {
        const [[, , apart], e] = fork;
        const c = 0.5 + (apart - 0.5) * e;
        const w = 0.5 + (ABYSS.branch - 0.5) * e;
        return [{ c: -c, w }, { c, w }];
    }
    const narrow = rangeAt(def.narrows, i, count, ABYSS.narrowEase);
    if (narrow) {
        const [[, , width], e] = narrow;
        return [{ c: 0, w: 1 + (width - 1) * e }];
    }
    return FULL;
}

/** A jump's side picks the ribbons it cuts: -1 the left branch, 1 the right, none all of them. */
function cuts(ribbon, side) {
    return side === undefined || Math.sign(ribbon.c) === side;
}

/** The gap and the ramp of every jump: [lip share, gap segments, side?]. */
function layJumps(segments, jumps) {
    const count = segments.length;
    for (const [at, gap, side] of jumps ?? []) {
        const lip = Math.round(at * count);
        for (let k = 1; k <= gap; k++) {
            const segment = segments[(lip + k) % count];
            segment.ribbons = segment.ribbons.filter((ribbon) => !cuts(ribbon, side));
            segment.abyss = true;
        }
        for (let k = 0; k < ABYSS.ramp; k++) {
            const segment = segments[(lip - k + count) % count];
            segment.ribbons = segment.ribbons.map((ribbon) => (cuts(ribbon, side) ? { ...ribbon, ramp: true } : ribbon));
        }
    }
}

/** A ribbon with no ground under it on the segment before is the far wall of a gap: its face shows. */
function layFaces(segments) {
    const count = segments.length;
    segments.forEach((segment, i) => {
        const before = segments[(i - 1 + count) % count];
        if (!segment.abyss && !before.abyss) return;
        segment.ribbons = segment.ribbons.map((ribbon) => {
            const held = before.ribbons.some((r) => Math.abs(r.c - ribbon.c) < r.w + ribbon.w);
            return held ? ribbon : { ...ribbon, face: true };
        });
    });
}

/**
 * Gives every segment its `ribbons` and its `abyss` flag, from the track's
 * `abyss`, `narrows`, `forks` and `jumps` (config/Tracks.js).
 * @param {object[]} segments the track's, changed in place
 */
export function layGround(segments, def) {
    const count = segments.length;
    segments.forEach((segment, i) => {
        segment.ribbons = ribbonsOf(def, i, count);
        segment.abyss = rangeAt(def.abyss, i, count, 1) !== null || rangeAt(def.forks, i, count, 1) !== null;
    });
    layJumps(segments, def.jumps);
    layFaces(segments);
}

/** Whether x is on the asphalt of a ribbon (its rumble strips widen it by `edge`). */
export function onRibbons(ribbons, x, edge = 0) {
    return ribbons.some((r) => Math.abs(x - r.c) <= r.w * (1 + edge));
}

/** The ribbon x is on or nearest to, or null when there is none. */
export function nearestRibbon(ribbons, x) {
    let best = null;
    let distance = Infinity;
    for (const ribbon of ribbons) {
        const d = Math.max(0, Math.abs(x - ribbon.c) - ribbon.w);
        if (d < distance) [best, distance] = [ribbon, d];
    }
    return best;
}

/** Whether a car at x on this segment stands on something: the asphalt, or the ground beside it. */
export function hasGround(segment, x) {
    return !segment.abyss || onRibbons(segment.ribbons, x, ABYSS.edge);
}

/** Following the ribbon under x for `length` segments from `start`: no gap and no ramp on the way. */
function clearAhead(segments, start, x, length) {
    let along = x;
    for (let k = 0; k < length; k++) {
        const segment = segments[(start + k) % segments.length];
        const ribbon = nearestRibbon(segment.ribbons, along);
        if (!ribbon || ribbon.ramp || !onRibbons([ribbon], along)) return false;
        along = ribbon.c;
    }
    return true;
}

/**
 * Where a car that fell comes back: the first place from z on, on the
 * middle of the nearest ribbon, with the road ahead whole for a while (no
 * gap to clear from a standstill, no ramp to fly off too slow).
 * @param {import('./Track.js').Track} track
 * @returns {{ahead: number, x: number}} segments ahead of z's, and the place across
 */
export function respawnPlace(track, z, x) {
    const { segments } = track;
    const start = track.segmentAt(z).index;
    for (let ahead = 0; ahead < segments.length; ahead++) {
        const segment = segments[(start + ahead) % segments.length];
        const ribbon = nearestRibbon(segment.ribbons, x);
        if (ribbon && clearAhead(segments, start + ahead, ribbon.c, ABYSS.respawnClear)) return { ahead, x: ribbon.c };
    }
    return { ahead: 0, x: 0 };
}

/** Whether x is on a ramp's asphalt at this segment (leaving it into a gap is a jump, not a fall). */
export function onRamp(segment, x) {
    return segment.ribbons.some((r) => r.ramp && Math.abs(x - r.c) <= r.w * (1 + ABYSS.edge));
}
