import { BODY, PHYSICS } from '../../config/Tuning.js';
import { pushOf } from '../Currents.js';
import { jumpAhead } from '../Flight.js';
import { nearestRibbon } from '../Ground.js';
import { letsGo, slideOf } from '../Vortex.js';

/**
 * The driving every computer car shares: it reads the road ahead, slows
 * before a bend to the speed its own grip can hold, steers towards the
 * place its behaviour asks for (making up for the bend's push), goes round a
 * slower car or a pothole in its way, keeps out of a lane closed for works,
 * and lights the nitro on a straight when asked. Over the abyss it keeps to
 * the asphalt: where the road narrows, on the branch of a fork it is
 * heading for (the nearest), and flat out in the middle of a ramp, with
 * nitro if it needs it to clear the gap. In a current across the road it
 * steers against the drift. In the vortex it keeps to the bottom of the
 * tube against the walls' pull, and rides a turbo strip when it is fast
 * enough to hold on up there.
 *
 * A behaviour only says where to be and how hard to push: an Aim.
 *
 * @typedef {{x: number, pace: number, nitro: boolean}} Aim
 *   x: place across the road; pace: share of the safe speed (1 = on the limit)
 */

/** World units looked ahead for bends: near (steering) and far (braking); where a branch is heading (lead). */
const LOOK = { steer: 1400, from: 600, to: 4600, step: 400, straight: 9000, lead: 3600 };
/** On narrow asphalt the car keeps this much more of the lost width away from the edges. */
const NARROW_KEEP = 1.4;
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
/** A jump within this far ahead (world units) is driven for: flat out, aimed at the ramp's middle... */
const JUMP = { reach: 7000, margin: 1.12 };
/** A turbo strip is ridden by a car this much faster than the speed that holds it on there. */
const TURBO_MARGIN = 1.25;
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
        const z = self.car.z;
        const inWay = Math.abs(race.track.across(z, self.car.x, other.car.x)) < BLOCKED.width
            || Math.abs(race.track.across(z, aimX, other.car.x)) < BLOCKED.width;
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

/**
 * The asphalt the car is heading for, as the span its middle keeps within:
 * the ribbon nearest it a little ahead (or here, over a gap ahead), its
 * middle taken further on (`LOOK.lead`) so the car moves with a branch that
 * bends away or comes back. On the usual road that is the whole width,
 * ROAD_EDGE from the middle; on narrow asphalt the car keeps further in.
 * @returns {{c: number, w: number, edge: number}}
 */
function laneSpan(track, car) {
    const vortex = vortexSpan(track, car);
    if (vortex) return vortex;
    for (const ahead of [LOOK.steer, 0, LOOK.steer * 2]) {
        const ribbon = nearestRibbon(track.ribbonsAt(car.z + ahead), car.x);
        if (!ribbon) continue;
        const later = nearestRibbon(track.ribbonsAt(car.z + LOOK.lead), ribbon.c);
        const c = later && Math.abs(later.c - ribbon.c) < ribbon.w ? later.c : ribbon.c;
        return { c, w: ribbon.w, edge: Math.max(0, ROAD_EDGE - (1 - ribbon.w) * NARROW_KEEP) };
    }
    return { c: 0, w: 1, edge: ROAD_EDGE };
}

/**
 * In the vortex (rolled here or a little ahead): a turbo strip coming, when
 * the car is fast enough to hold on there, else the bottom of the tube as wide as the usual road; null out of it.
 */
function vortexSpan(track, car) {
    const here = track.segmentAt(car.z);
    const ahead = track.segmentAt(car.z + LOOK.steer);
    if (!here.roll && !ahead.roll) return null;
    const turbo = [ahead, track.segmentAt(car.z + LOOK.lead)].find((segment) => segment.turbo !== undefined && segment.roll);
    if (turbo && !letsGo(turbo.roll, turbo.turbo, car.speedRatio / TURBO_MARGIN)) return { c: turbo.turbo, w: 1, edge: 0 };
    return { c: 0, w: 1, edge: ROAD_EDGE };
}

/** An aim across the usual road (-1..1) brought onto the span: scaled to it, kept within its edges. */
function onSpan(span, x) {
    return span.c + clamp(x * span.w, -span.edge, span.edge);
}

/** Where to go round a car: on the side the car already leans to, else where the road is wider. */
function passingPlace(self, other, span, track) {
    const apart = track.across(self.car.z, other.car.x, self.car.x);
    let side = other.car.x >= span.c ? -1 : 1;
    if (Math.abs(apart) > 0.15) side = Math.sign(apart);
    return clamp(other.car.x + side * BLOCKED.pass, span.c - span.edge, span.c + span.edge);
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

    const span = laneSpan(track, car);
    const jump = jumpAhead(track, car.z, car.x, JUMP.reach);
    const blocked = carInWay(self, race, span.c + aim.x * span.w);
    let wanted = blocked ? passingPlace(self, blocked.racer, span, track) : onSpan(span, aim.x);
    if (jump) wanted = jump.lip.x;
    const dodge = besideHoles(race, car, wanted);
    const target = openLane(track, car.z, dodge);
    const gain = dodge === wanted ? STEER_GAIN : STEER_GAIN * HOLES.gain;
    const curve = track.segmentAt(car.z + LOOK.steer).curve;
    const outward = (curve * ratio * ratio * PHYSICS.centrifugal) / grip;
    const under = track.segmentAt(car.z);
    const drift = pushOf(under.current).across + slideOf(under.roll ?? 0, car.x);
    const pull = track.across(car.z, car.x, target) * gain + outward - drift;
    const steer = ratio > 0.05 ? clamp(pull / (PHYSICS.steer * Math.min(1, ratio)), -1, 1) : 0;
    // closing fast on a car still in the way: lift rather than ram it
    const tooClose = blocked && blocked.gap < BLOCKED.lift && Math.abs(track.across(car.z, car.x, blocked.racer.car.x)) < BLOCKED.width;

    if (jump) return flatOut(car, steer, jump.lip.speed * JUMP.margin);
    const straight = sharpestAhead(track, car.z, LOOK.from, LOOK.straight, LOOK.step * 2) < STRAIGHT_CURVE;
    return {
        steer,
        throttle: ratio < limit && !tooClose,
        brake: ratio > limit * 1.08,
        nitro: aim.nitro && straight && car.nitro > 0 && !car.boosting,
    };
}

/** A ramp coming: throttle down, no brakes, nitro if the car is short of the speed that clears the gap. */
function flatOut(car, steer, needed) {
    return { steer, throttle: true, brake: false, nitro: car.speed < needed && car.nitro > 0 && !car.boosting };
}

/** The racing line: towards the inside of the bend coming. */
export function racingLine(track, z) {
    return clamp(track.segmentAt(z + LOOK.steer * 2).curve * 0.07, -0.6, 0.6);
}
