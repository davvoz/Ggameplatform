import { BODY, PHYSICS } from '../../config/Tuning.js';

/**
 * The driving every computer car shares: it reads the road ahead, slows
 * before a bend to the speed its own grip can hold, steers towards the
 * place its behaviour asks for (making up for the bend's push), goes round a
 * slower car or a pothole in its way, keeps out of a lane closed for works,
 * and lights the nitro on a straight when asked.
 *
 * A behaviour only says where to be and how hard to push: an Aim.
 *
 * @typedef {{x: number, pace: number, nitro: boolean}} Aim
 *   x: place across the road; pace: share of the safe speed (1 = on the limit)
 */

/** World units looked ahead for bends: near (steering) and far (braking). */
const LOOK = { steer: 1400, from: 600, to: 4600, step: 400, straight: 9000 };
/** Past roadworks the car keeps this far into the open lane (half widths from the middle). */
const WORKS_KEEP = 0.55;
/**
 * Potholes are watched for this far ahead (world units) and passed this far
 * from their edge (half widths), steering this much more briskly than usual.
 */
const HOLES = { from: 0, to: 6000, near: 3000, clear: BODY.width / 2 + 0.1, gain: 2.5 };
/** How briskly the car closes the gap to its aim (per second). */
const STEER_GAIN = 2.2;
/** Cars this close ahead (world units) and this close sideways are in the way. */
const BLOCKED = { range: 1800, width: BODY.width * 1.25, pass: 0.62, lift: 900 };
const ROAD_EDGE = 0.78;
/** A bend gentler than this does not spoil a straight (for the nitro). */
const STRAIGHT_CURVE = 1.6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** The sharpest bend between two distances ahead of z. */
export function sharpestAhead(track, z, from, to, step = LOOK.step) {
    let sharpest = 0;
    for (let d = from; d <= to; d += step) sharpest = Math.max(sharpest, Math.abs(track.segmentAt(z + d).curve));
    return sharpest;
}

/** Highest speed ratio (speed / refSpeed) at which a bend's push stays within the grip. */
export function safeRatio(curve, grip) {
    if (curve < 1e-6) return Infinity;
    return Math.sqrt((grip * PHYSICS.slipLimit) / (curve * PHYSICS.centrifugal));
}

/** The nearest slower car ahead in the way (of where the car is, or where it goes), or null. */
function carInWay(self, race, aimX) {
    let nearest = null;
    let nearestGap = Infinity;
    for (const other of race.racers) {
        const gap = race.track.gap(self.car.z, other.car.z);
        if (other === self || gap <= 0 || gap >= BLOCKED.range || other.car.speed > self.car.speed + 400) continue;
        const inWay = Math.abs(other.car.x - self.car.x) < BLOCKED.width || Math.abs(other.car.x - aimX) < BLOCKED.width;
        if (inWay && gap < nearestGap) [nearest, nearestGap] = [other, gap];
    }
    return nearest && { racer: nearest, gap: nearestGap };
}

/** Roadworks here or coming: the aim kept on the open side of the road. */
function openLane(track, z, x) {
    const closed = [0, LOOK.steer, LOOK.to].map((ahead) => track.segmentAt(z + ahead).closed).find(Boolean);
    if (!closed) return x;
    return closed > 0 ? Math.min(x, -WORKS_KEEP) : Math.max(x, WORKS_KEEP);
}

/**
 * A pothole coming where the car is (soon) or where it is going: the aim
 * moved to the free place beside the holes of that stretch nearest the car
 * (two holes side by side are passed between or round, whichever is nearer).
 */
function besideHoles(race, car, x) {
    const { potholes, track } = race;
    if (!potholes?.holes.length) return x;
    const hole = potholes.ahead(track, car.z, HOLES.from, HOLES.near, car.x, HOLES.clear)
        ?? potholes.ahead(track, car.z, HOLES.from, HOLES.to, x, HOLES.clear);
    if (!hole) return x;
    const holes = potholes.holesAt(hole.segment);
    const inHole = (place) => holes.some((h) => Math.abs(h.x - place) < h.width / 2 + HOLES.clear);
    const free = holes
        .flatMap((h) => [-1, 1].map((side) => h.x + side * (h.width / 2 + HOLES.clear + 0.01)))
        .filter((place) => Math.abs(place) <= ROAD_EDGE && !inHole(place));
    return free.reduce((best, place) => (Math.abs(place - car.x) < Math.abs(best - car.x) ? place : best), free[0] ?? x);
}

/** Where to go round a car: on the side the car already leans to, else where the road is wider. */
function passingPlace(self, other) {
    const apart = self.car.x - other.car.x;
    let side = other.car.x >= 0 ? -1 : 1;
    if (Math.abs(apart) > 0.15) side = Math.sign(apart);
    return clamp(other.car.x + side * BLOCKED.pass, -ROAD_EDGE, ROAD_EDGE);
}

/**
 * @param {import('../Race.js').Racer} self
 * @param {{track: import('../Track.js').Track, racers: import('../Race.js').Racer[], grip: number,
 *   potholes?: import('../Potholes.js').PotholeField}} race
 * @param {Aim} aim
 * @returns {import('../Car.js').DriveInput}
 */
export function drive(self, race, aim) {
    const { car } = self;
    const { track } = race;
    const grip = car.stats.grip * race.grip;
    const limit = safeRatio(sharpestAhead(track, car.z, LOOK.from, LOOK.to), grip) * aim.pace;
    const ratio = car.speedRatio;

    const blocked = carInWay(self, race, aim.x);
    const wanted = blocked ? passingPlace(self, blocked.racer) : clamp(aim.x, -ROAD_EDGE, ROAD_EDGE);
    const dodge = besideHoles(race, car, wanted);
    const target = openLane(track, car.z, dodge);
    const gain = dodge === wanted ? STEER_GAIN : STEER_GAIN * HOLES.gain;
    const curve = track.segmentAt(car.z + LOOK.steer).curve;
    const outward = (curve * ratio * ratio * PHYSICS.centrifugal) / grip;
    const pull = (target - car.x) * gain + outward;
    const steer = ratio > 0.05 ? clamp(pull / (PHYSICS.steer * Math.min(1, ratio)), -1, 1) : 0;
    // closing fast on a car still in the way: lift rather than ram it
    const tooClose = blocked && blocked.gap < BLOCKED.lift && Math.abs(blocked.racer.car.x - car.x) < BLOCKED.width;

    const straight = sharpestAhead(track, car.z, LOOK.from, LOOK.straight, LOOK.step * 2) < STRAIGHT_CURVE;
    return {
        steer,
        throttle: ratio < limit && !tooClose,
        brake: ratio > limit * 1.08,
        nitro: aim.nitro && straight && car.nitro > 0 && !car.boosting,
    };
}

/** The racing line: towards the inside of the bend coming. */
export function racingLine(track, z) {
    return clamp(track.segmentAt(z + LOOK.steer * 2).curve * 0.07, -0.6, 0.6);
}
