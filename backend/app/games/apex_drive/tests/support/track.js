import { TRACKS } from '../../js/config/Tracks.js';
import { ROAD, TRACK_BUILD } from '../../js/config/Tuning.js';
import { Track } from '../../js/sim/Track.js';

export const OPTIONS = { segmentLength: ROAD.segmentLength, ...TRACK_BUILD };

/** The real track of the game. */
export function duskValley() {
    return new Track({ ...TRACKS.duskValley, id: 'duskValley' }, OPTIONS);
}

/**
 * A square loop 40 x 40 map units, clockwise on the map, starting at its top
 * left corner. Points every 10 units keep the middle of each side straight.
 * Flat, or with one hill in the middle of its first side.
 */
export function squareTrack({ hill = 0 } = {}) {
    const side = [0, 10, 20, 30];
    const points = [
        ...side.map((s) => [s, 0, s === 20 ? hill : 0]),
        ...side.map((s) => [40, s, 0]),
        ...side.map((s) => [40 - s, 40, 0]),
        ...side.map((s) => [0, 40 - s, 0]),
    ];
    return new Track({ name: 'TEST', theme: 'dusk', scale: 1000, heightScale: 1000, laps: 3, points }, OPTIONS);
}
