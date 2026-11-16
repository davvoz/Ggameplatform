/**
 * What the engine and the tyres should sound like at a moment of a race,
 * worked out from the race alone (pure, tested in Node). audio/EngineSound.js
 * turns it into sound.
 *
 * @typedef {object} EngineState
 * @property {number} gear 1..
 * @property {number} revs 0..1 within the gear
 * @property {boolean} throttle
 * @property {boolean} boosting
 * @property {number} skid 0..1: sliding, or a wheelspin at the start
 * @property {number} squeal 0..1: the tyres in a hard turn at speed (or a slide)
 * @property {number} rumble 0..1: the grass under the wheels, or broken road (softer)
 * @property {number} wind 0..1
 * @property {{near: number, pan: number, revs: number}|null} rival the nearest one: near 0..1, pan -1..1
 * @property {{f: number, q: number, v: number}|null} ambience the weather's hiss (rain), if any
 */

/**
 * The gear for a speed ratio and how far up its revs are. After a shift the
 * revs drop to `shiftDrop`, as a real gearbox makes them.
 * @param {number} ratio speed / refSpeed
 * @param {{gears: number[], shiftDrop: number}} engine
 */
export function gearOf(ratio, { gears, shiftDrop }) {
    const index = gears.findIndex((top) => ratio < top);
    const gear = index < 0 ? gears.length - 1 : index;
    const bottom = gear === 0 ? 0 : gears[gear - 1];
    const share = Math.min(1, Math.max(0, (ratio - bottom) / (gears[gear] - bottom)));
    const revs = gear === 0 ? share : shiftDrop + (1 - shiftDrop) * share;
    return { gear: gear + 1, revs };
}

/** 0 up to `from`, 1 from `to`, a straight line between. */
function share(value, [from, to]) {
    return Math.max(0, Math.min(1, (value - from) / (to - from)));
}

/** How hard the tyres work: the grip the bend takes, or hard steering at speed; a slide is all. */
function squealOf(car, ratio, { bend, steer, minSpeed }) {
    if (car.offRoad || ratio < minSpeed) return 0;
    if (car.sliding) return 1;
    return Math.max(share(car.gripUsed, bend), share(Math.abs(car.turn) * Math.min(1, ratio), steer));
}

/** The nearest rival within range, as loud as it is near, on its side. */
function nearestRival(race, range) {
    const player = race.player.car;
    let best = null;
    for (const racer of race.racers) {
        if (racer.isPlayer) continue;
        const gap = Math.abs(race.track.gap(player.z, racer.car.z));
        if (gap < range && (!best || gap < best.gap)) best = { gap, car: racer.car };
    }
    if (!best) return null;
    return {
        near: 1 - best.gap / range,
        pan: Math.max(-1, Math.min(1, (best.car.x - player.x) * 1.5)),
        revs: Math.min(1, best.car.speedRatio),
    };
}

/** The grass rumbles under the wheels; broken road rattles, softer. */
function rumbleOf(race, car, ratio, broken) {
    if (ratio <= 0.02) return 0;
    const full = Math.min(1, ratio * 2);
    if (car.offRoad) return full;
    return race.track?.segmentAt(car.z).broken ? full * broken : 0;
}

/**
 * @param {import('../sim/Race.js').Race} race
 * @param {typeof import('../config/Sounds.js').ENGINE} engine
 * @returns {EngineState}
 */
export function engineState(race, engine) {
    const car = race.player.car;
    const ratio = car.speedRatio;
    const { gear, revs } = gearOf(ratio, engine);
    // on the grid the engine is revved by the throttle, the car standing still
    const waiting = race.phase === 'grid' || race.phase === 'countdown';
    return {
        gear,
        revs: waiting && car.throttle ? 0.75 : revs,
        throttle: car.throttle,
        boosting: car.boosting,
        skid: car.sliding && ratio > 0.1 ? 1 : 0,
        squeal: squealOf(car, ratio, engine.squeal),
        rumble: rumbleOf(race, car, ratio, engine.brokenRumble),
        wind: Math.min(1, ratio * ratio),
        rival: nearestRival(race, engine.rivalRange),
        ambience: race.weather?.ambience ?? null,
    };
}
