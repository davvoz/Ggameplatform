import { Rng } from '../core/Rng.js';

/**
 * Potholes and cracks on the broken stretches of a track (`broken` in
 * config/Tracks.js), laid from the track's seed: the same track always has
 * them in the same places. A pothole lies across part of the road for a
 * few segments (never across the start line); a crack is only drawn. Holes
 * never block the road: one is at most a third of it wide, and two side by
 * side leave room to drive between.
 *
 * @typedef {{id: number, segment: number, length: number, x: number, width: number}} Pothole
 *   segment: its first; length: segments; x: its middle, half widths from the road's; width: half widths
 * @typedef {{segment: number, at: number, from: number, to: number}} Crack
 *   at: how far into its segment (0..1); from, to: across the road, half widths
 */

/**
 * @param {import('./Track.js').Track} track
 * @param {typeof import('../config/Hazards.js').POTHOLES} layout
 * @returns {{holes: Pothole[], cracks: Crack[]}} in order along the lap
 */
export function layPotholes(track, layout) {
    const rng = Rng.fork(track.seed, 'potholes');
    const holes = [];
    const cracks = [];
    let last = -Infinity;
    const { segments } = track;
    const fits = (i) => segments.slice(i, i + layout.length).filter((s) => s.broken).length === layout.length;
    segments.forEach((segment, i) => {
        if (!segment.broken) return;
        if (rng.chance(layout.crackChance)) cracks.push(crackAt(rng, i));
        if (i - last < layout.gap || !rng.chance(layout.chance) || !fits(i)) return;
        last = i;
        const first = { segment: i, length: layout.length, x: rng.range(-layout.span, layout.span), width: rng.range(...layout.width) };
        holes.push({ id: holes.length, ...first });
        const pair = rng.chance(layout.pairChance) ? pairOf(first, rng, layout) : null;
        if (pair) holes.push({ id: holes.length, ...pair });
    });
    return { holes, cracks };
}

/** A second hole across the road from the first, or null when it would not fit on the road. */
function pairOf(first, rng, { span, width, pairApart }) {
    const side = first.x > 0 ? -1 : 1;
    const x = first.x + side * rng.range(...pairApart);
    const hole = { segment: first.segment, length: first.length, x, width: rng.range(...width) };
    return Math.abs(x) <= span ? hole : null;
}

function crackAt(rng, segment) {
    const from = rng.range(-0.9, 0.5);
    return { segment, at: rng.range(0.1, 0.9), from, to: from + rng.range(0.2, 0.5) };
}

const NONE = Object.freeze([]);

/** The potholes and cracks of a race, by segment. */
export class PotholeField {
    /** @type {Pothole[]} */
    holes;
    /** @type {Crack[]} */
    cracks;
    #holesAt = new Map();
    #cracksAt = new Map();

    /** @param {{holes: Pothole[], cracks: Crack[]}} laid */
    constructor({ holes, cracks }) {
        this.holes = holes;
        this.cracks = cracks;
        for (const hole of holes) {
            for (let k = 0; k < hole.length; k++) group(this.#holesAt, hole, hole.segment + k);
        }
        for (const crack of cracks) group(this.#cracksAt, crack, crack.segment);
    }

    /** A road with no broken stretch. */
    static none() {
        return new PotholeField({ holes: [], cracks: [] });
    }

    /** @returns {readonly Pothole[]} the holes lying on a segment */
    holesAt(segment) {
        return this.#holesAt.get(segment) ?? NONE;
    }

    /** @returns {readonly Crack[]} */
    cracksAt(segment) {
        return this.#cracksAt.get(segment) ?? NONE;
    }

    /**
     * The hole a car's wheel is in on this segment, or null.
     * @param {number} x the car's middle @param {number} reach how far from its middle a wheel is
     */
    under(segment, x, reach) {
        return this.holesAt(segment).find((hole) => Math.abs(hole.x - x) < hole.width / 2 + reach) ?? null;
    }

    /**
     * The nearest hole ahead, between two distances (world units), that a
     * car going to `x` would hit, or null.
     * @param {import('./Track.js').Track} track
     */
    ahead(track, z, from, to, x, reach) {
        return this.crossed(track, z + from, z + to, x, reach);
    }

    /**
     * The first hole a car at `x` meets on the segments from `fromZ` to `toZ`
     * (both ends counted), or null.
     * @param {import('./Track.js').Track} track
     */
    crossed(track, fromZ, toZ, x, reach) {
        const count = track.segments.length;
        const last = Math.floor(toZ / track.segmentLength);
        for (let i = Math.floor(fromZ / track.segmentLength); i <= last; i++) {
            const hole = this.under(((i % count) + count) % count, x, reach);
            if (hole) return hole;
        }
        return null;
    }
}

function group(map, item, segment) {
    if (!map.has(segment)) map.set(segment, []);
    map.get(segment).push(item);
}
