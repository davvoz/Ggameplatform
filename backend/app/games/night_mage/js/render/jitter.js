import { Rng } from '../core/Rng.js';

/**
 * Randomness for looks only (sparks, weather, shake, noise): a seeded
 * generator, so nothing on screen needs Math.random. It never touches the
 * simulation, which has its own streams.
 */
const looks = new Rng(0x6e6d);

/** A float in [min, max). */
export function jitter(min = 0, max = 1) {
    return looks.range(min, max);
}

/** One of the items of a list. */
export function pickOne(list) {
    return looks.pick(list);
}
