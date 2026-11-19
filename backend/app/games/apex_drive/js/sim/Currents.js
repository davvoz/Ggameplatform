import { CURRENTS } from '../config/Hazards.js';

/**
 * Ocean currents on a track (config/Tracks.js `currents`: [from, to, along,
 * across], shares of the lap and strengths from -1 to 1). Each segment in
 * one gets its `current` ({along, across}, eased in and out over
 * CURRENTS.ease segments); elsewhere it has none. The car feels it
 * (sim/Car.js), the rivals steer against it (sim/ai/driving.js), the road
 * shows it flowing (render/road/water.js).
 *
 * @typedef {{along: number, across: number}} Current
 */

const smoothstep = (t) => t * t * (3 - 2 * t);

/** @param {object[]} segments the track's, changed in place */
export function layCurrents(segments, def) {
    const count = segments.length;
    for (const [from, to, along, across] of def.currents ?? []) {
        const first = Math.round(from * count);
        const last = Math.round(to * count);
        for (let i = first; i < last; i++) {
            const ease = smoothstep(Math.min(1, Math.min(i - first, last - 1 - i) / CURRENTS.ease));
            segments[i % count].current = { along: along * ease, across: across * ease };
        }
    }
}

/** The push along the road (units/s^2) and the drift across it (half widths/s) of a current, none without one. */
export function pushOf(current) {
    if (!current) return { along: 0, across: 0 };
    const along = current.along * (current.along > 0 ? CURRENTS.along : CURRENTS.against);
    return { along, across: current.across * CURRENTS.across };
}

/**
 * The way a current mostly flows, for the player to be told: 'with' the
 * car, 'against' it, to the 'left' or the 'right'; null for none, or one
 * too weak to say (under CURRENTS.felt).
 * @returns {'with'|'against'|'left'|'right'|null}
 */
export function flowOf(current) {
    if (!current || Math.max(Math.abs(current.along), Math.abs(current.across)) < CURRENTS.felt) return null;
    if (Math.abs(current.along) >= Math.abs(current.across)) return current.along > 0 ? 'with' : 'against';
    return current.across > 0 ? 'right' : 'left';
}
