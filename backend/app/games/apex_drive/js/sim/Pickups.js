import { Rng } from '../core/Rng.js';

/**
 * Power ups laid along the road from the track's seed: the same track
 * always has them in the same places. They are taken per lap: what the
 * player takes on lap 2 is back on lap 3.
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
            items.push({ id: items.length, z: (segment + 0.5) * track.segmentLength, x: lane, kind: rng.weighted(weights) });
        }
        segment += rng.int(layout.gap[0], layout.gap[1]);
    }
    return items;
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
     * @returns {Pickup[]}
     */
    collect(fromZ, toZ, x, reach) {
        const found = [];
        for (const item of this.items) {
            const lap = Math.floor((toZ - item.z) / this.#length);
            const at = lap * this.#length + item.z;
            const passed = at > fromZ && at <= toZ;
            if (passed && Math.abs(item.x - x) <= reach && this.isThere(item, lap)) {
                this.#taken.add(`${lap}:${item.id}`);
                found.push(item);
            }
        }
        return found;
    }
}
