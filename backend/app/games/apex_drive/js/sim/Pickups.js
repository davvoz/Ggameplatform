import { Rng } from '../core/Rng.js';
import { FULL, nearestRibbon } from './Ground.js';
import { CIRCLE, isClosed } from './Vortex.js';

/**
 * Power ups laid along the road from the track's seed: the same track
 * always has them in the same places. They are taken per lap: what the
 * player takes on lap 2 is back on lap 3. Where the road narrows a lane is
 * brought onto the narrower asphalt; on a fork it is the middle of the
 * branch on its side; over a gap there is none. In the vortex's tube one
 * lane in three is on the ceiling.
 *
 * @typedef {{id: number, z: number, x: number, kind: string}} Pickup z within one lap
 */

/**
 * @param {import('./Track.js').Track} track
 * @param {typeof import('../config/Pickups.js').PICKUPS} kinds
 * @param {typeof import('../config/Pickups.js').PICKUP_LAYOUT} layout
 * @returns {Pickup[]} in order along the lap
 */
export function layPickups(track, kinds, layout) {
    const rng = Rng.fork(track.seed, 'pickups');
    const weights = Object.fromEntries(Object.entries(kinds).map(([kind, spec]) => [kind, spec.weight]));
    const count = track.segments.length;
    const items = [];
    let segment = layout.clearStart;
    while (segment < count - layout.clearStart) {
        const lanes = [...layout.lanes];
        const take = rng.chance(layout.pairChance) ? 2 : 1;
        for (let i = 0; i < take; i++) {
            const lane = lanes.splice(rng.int(0, lanes.length - 1), 1)[0];
            const kind = rng.weighted(weights);
            const x = inVortex(track.segments[segment], lane) ?? onAsphalt(track.segments[segment].ribbons, lane);
            if (x !== null) items.push({ id: items.length, z: (segment + 0.5) * track.segmentLength, x, kind });
        }
        segment += rng.int(layout.gap[0], layout.gap[1]);
    }
    return items;
}

/**
 * A lane in the vortex: in a closed tube the middle lane is up on the
 * ceiling (for the brave), the others at the bottom; on a half pipe the
 * usual lanes; null out of it.
 */
function inVortex(segment, lane) {
    if (!segment.roll) return null;
    return isClosed(segment) && lane === 0 ? CIRCLE / 2 : lane;
}

/** A lane of the usual road on a segment's asphalt, or null over a gap. */
function onAsphalt(ribbons, lane) {
    if (ribbons === FULL) return lane;
    if (ribbons.length > 1) return nearestRibbon(ribbons, lane === 0 ? -1 : lane).c;
    return ribbons.length === 1 ? ribbons[0].c + lane * ribbons[0].w : null;
}

export class PickupField {
    /** @type {Pickup[]} */
    items;
    #taken = new Set();
    #length;

    /** @param {Pickup[]} items @param {number} lapLength */
    constructor(items, lapLength) {
        this.items = items;
        this.#length = lapLength;
    }

    /** Whether an item is still on the road on a given lap. */
    isThere(item, lap) {
        return !this.#taken.has(`${lap}:${item.id}`);
    }

    /**
     * Takes what the car drove over between two positions.
     * @param {number} fromZ @param {number} toZ unwrapped, toZ >= fromZ
     * @param {number} x the car's place across the road
     * @param {number} reach half widths
     * @param {(z: number, from: number, to: number) => number} [across] how far apart two places across are at z
     *   (sim/Track.js `across`: round the vortex's tube the shorter way)
     * @returns {Pickup[]}
     */
    collect(fromZ, toZ, x, reach, across = (z, from, to) => to - from) {
        const found = [];
        for (const item of this.items) {
            const lap = Math.floor((toZ - item.z) / this.#length);
            const at = lap * this.#length + item.z;
            const passed = at > fromZ && at <= toZ;
            if (passed && Math.abs(across(at, x, item.x)) <= reach && this.isThere(item, lap)) {
                this.#taken.add(`${lap}:${item.id}`);
                found.push(item);
            }
        }
        return found;
    }
}
