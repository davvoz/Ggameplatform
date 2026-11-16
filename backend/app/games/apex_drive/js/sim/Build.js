import { PHYSICS } from '../config/Tuning.js';

/**
 * A build is what a car carries: a tier for every part category and the
 * mods fitted. Its stats are the base stats with every effect applied:
 * first all the parts, then all the mods, `mul` before `add` in each.
 *
 * @typedef {{parts: Record<string, number>, mods: string[]}} BuildSpec
 * @typedef {{mul?: Record<string, number>, add?: Record<string, number>}} Effect
 * @typedef {typeof import('../config/Parts.js').BASE_STATS} Stats
 */

/** @param {Stats} stats changed in place @param {Effect} effect */
export function applyEffect(stats, effect = {}) {
    for (const [key, factor] of Object.entries(effect.mul ?? {})) stats[key] *= factor;
    for (const [key, amount] of Object.entries(effect.add ?? {})) stats[key] += amount;
    return stats;
}

/**
 * @param {BuildSpec} build
 * @param {{base: Stats, parts: object, mods: object}} catalog
 * @returns {Stats}
 */
export function computeStats(build, { base, parts, mods }) {
    const stats = { ...base };
    for (const [category, tier] of Object.entries(build.parts)) {
        applyEffect(stats, parts[category]?.tiers[tier]?.effect);
    }
    for (const id of build.mods) applyEffect(stats, mods[id]?.effect);
    stats.nitroCharges = Math.max(0, Math.min(PHYSICS.maxNitro, Math.round(stats.nitroCharges)));
    return stats;
}

/**
 * Top speed on a flat road, world units per second: where the engine's push
 * (power / speed) equals air drag plus rolling (sim/Car.js). The push falls
 * and the drag grows with speed, so the balance is found by halving.
 */
export function topSpeed(stats) {
    const surplus = (v) => stats.power / v - stats.drag * v * v - PHYSICS.rolling * stats.mass;
    let [low, high] = [PHYSICS.minThrustSpeed, PHYSICS.refSpeed * 3];
    for (let i = 0; i < 40; i++) {
        const middle = (low + high) / 2;
        if (surplus(middle) > 0) low = middle;
        else high = middle;
    }
    return low;
}

export function toKmh(speed) {
    return Math.round((speed / PHYSICS.refSpeed) * PHYSICS.refKmh);
}

/**
 * What the garage shows, each as a value and a 0..1 fill against the best a
 * car can reach (`RATING_SCALE`), so the bars of every build compare.
 */
const RATING_SCALE = {
    speed: [240, 340],
    accel: [0.75, 1.9],
    grip: [0.9, 1.7],
    armor: [60, 260],
    nitro: [0, PHYSICS.maxNitro],
};

function fill(value, [low, high]) {
    return Math.max(0, Math.min(1, (value - low) / (high - low)));
}

/** @param {Stats} stats @returns {{key: string, label: string, value: number, fill: number, text: string}[]} */
export function ratings(stats) {
    const kmh = toKmh(topSpeed(stats));
    // pull at mid speed, against the stock car's: power and traction over mass
    const accel = Math.min(stats.power / 6000, stats.traction) / stats.mass / 1750;
    const entries = [
        ['speed', 'SPEED', kmh, `${kmh}`],
        ['accel', 'ACCEL', accel, accel.toFixed(2)],
        ['grip', 'GRIP', stats.grip, stats.grip.toFixed(2)],
        ['armor', 'ARMOR', stats.health, `${Math.round(stats.health)}`],
        // charges, and how long each burns
        ['nitro', 'NITRO', stats.nitroCharges, `${stats.nitroCharges}X${stats.nitroTime.toFixed(1)}S`],
    ];
    return entries.map(([key, label, value, text]) => ({ key, label, value, text, fill: fill(value, RATING_SCALE[key]) }));
}
