import { ABYSS } from '../config/Hazards.js';
import { PHYSICS } from '../config/Tuning.js';
import { onRamp, respawnPlace } from './Ground.js';

/**
 * Up and down, over the abyss. A car that runs out of ground leaving a ramp
 * flies: it rises at a share of its speed and gravity brings it down; on
 * ground it lands (hard landings knock it), over the void it falls. A car
 * that runs out of ground anywhere else falls at once. A fall lasts a moment,
 * then the car is put back on the road ahead (`comeBack`).
 *
 * `lift` is measured from the road's line (the heights of the track, which
 * go on across a gap), so a jump over a gap that drops lands lower.
 */

/** Whether the car stands on a ramp's asphalt right now (asked before it moves). */
export function onRampNow(car, track) {
    return !car.loose && onRamp(track.segmentAt(car.z), car.x);
}

/**
 * Moves the car up and down after its step along the road.
 * @param {import('./Car.js').Car} car
 * @param {import('./Track.js').Track} track
 * @param {boolean} fromRamp it stood on a ramp before this step
 * @returns {'launch'|'land'|'hardLanding'|'fall'|null} what happened
 */
export function fly(car, track, fromRamp, dt) {
    if (car.falling > 0) {
        car.falling += dt;
        car.climb -= ABYSS.gravity * dt;
        car.lift += car.climb * dt;
        car.speed *= Math.exp(-ABYSS.fallBrake * dt);
        return null;
    }
    if (car.airborne) return glide(car, track, dt);
    if (track.groundAt(car.z, car.x)) return null;
    if (fromRamp && car.speed > 0) {
        car.airborne = true;
        car.climb = car.speed * (track.slopeAt(car.z) + ABYSS.kick);
        car.lift = 0;
        return 'launch';
    }
    car.falling = dt;
    car.climb = 0;
    return 'fall';
}

function glide(car, track, dt) {
    car.climb -= ABYSS.gravity * dt;
    const sinking = car.climb - car.speed * track.slopeAt(car.z);
    car.lift += sinking * dt;
    if (car.lift > 0) return null;
    car.lift = 0;
    car.airborne = false;
    if (!track.groundAt(car.z, car.x)) {
        car.falling = dt;
        return 'fall';
    }
    car.climb = 0;
    if (sinking > -ABYSS.hardLanding) return 'land';
    car.speed *= ABYSS.landKeep;
    car.hurt(ABYSS.landDamage);
    return 'hardLanding';
}

/** Whether a fall has lasted long enough for the car to come back. */
export function fallen(car) {
    return car.falling >= ABYSS.fallTime;
}

/** Puts a car that fell back on the road ahead, nearly stopped and knocked about. */
export function comeBack(car, track) {
    const place = respawnPlace(track, car.z, car.x);
    const start = car.z - track.progressIn(car.z) * track.segmentLength;
    car.z = start + (place.ahead + 0.5) * track.segmentLength;
    car.x = place.x;
    car.speed = ABYSS.respawnSpeed * PHYSICS.refSpeed;
    car.falling = 0;
    car.airborne = false;
    car.lift = 0;
    car.climb = 0;
    car.shove = 0;
    car.hurt(ABYSS.fallDamage);
}

/**
 * Whether a car leaving the ramp ending at segment `lip` at `speed` clears
 * the gap (on the line x), drag left aside: what the rivals and the tests ask.
 */
export function clears(track, lip, x, speed) {
    const step = 1 / 120;
    let z = (lip + 1) * track.segmentLength;
    let climb = speed * (track.slopeAt(z - 1) + ABYSS.kick);
    let lift = 0;
    for (let t = 0; t < 10; t += step) {
        z += speed * step;
        climb -= ABYSS.gravity * step;
        lift += (climb - speed * track.slopeAt(z)) * step;
        if (lift <= 0) return track.groundAt(z, x);
    }
    return false;
}

/**
 * The least speed that clears the gap after segment `lip` on the line x, to 1% of the reference
 * speed. Searched upwards, not halved: far too fast a car may land past its branch's end.
 */
export function clearSpeed(track, lip, x) {
    const step = PHYSICS.refSpeed * 0.01;
    for (let speed = step; speed <= PHYSICS.refSpeed * 2; speed += step) {
        if (clears(track, lip, x, speed)) return speed;
    }
    return Infinity;
}

const LIPS = new WeakMap();

/**
 * The track's jumps: every ramp's last segment, on the middle of its ribbon,
 * and the speed that clears its gap. Worked out once a track.
 * @returns {{index: number, x: number, speed: number}[]}
 */
export function lipsOf(track) {
    let lips = LIPS.get(track);
    if (lips) return lips;
    const { segments } = track;
    lips = segments.flatMap((segment, i) => {
        const next = segments[(i + 1) % segments.length];
        return segment.ribbons
            .filter((ribbon) => ribbon.ramp && !next.ribbons.some((r) => r.ramp && Math.abs(r.c - ribbon.c) < r.w))
            .map((ribbon) => ({ index: i, x: ribbon.c, speed: clearSpeed(track, i, ribbon.c) }));
    });
    LIPS.set(track, lips);
    return lips;
}

/** The next jump within `reach` world units ahead of z, on the line nearest x: {lip, distance}, or null. */
export function jumpAhead(track, z, x, reach) {
    let found = null;
    for (const lip of lipsOf(track)) {
        const distance = track.gap(z, (lip.index + 1) * track.segmentLength);
        // a jump on the other branch of a fork is not this car's
        if (distance < 0 || distance > reach || Math.abs(lip.x - x) > 1) continue;
        if (!found || distance < found.distance || (distance === found.distance && Math.abs(lip.x - x) < Math.abs(found.lip.x - x))) {
            found = { lip, distance };
        }
    }
    return found;
}
