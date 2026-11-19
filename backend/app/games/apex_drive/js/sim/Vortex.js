import { VORTEX } from '../config/Hazards.js';
import { PHYSICS } from '../config/Tuning.js';

/**
 * The grid vortex (config/Hazards.js VORTEX). A segment of a `vortex`
 * stretch has a `roll`, 0..1, eased in and out over VORTEX.ease segments:
 * 0 is the flat road, 1 a closed tube, in between a half pipe. Across it the
 * surface is an arc of a circle of radius VORTEX.radius / roll touching the
 * road's line at the bottom; a car's x stays the distance along the surface
 * from the bottom, in half widths, out to `spanOf(roll)` either side. In a
 * closed tube x goes round: CIRCLE is a lap, and +-CIRCLE / 2 meet on the
 * ceiling. The whole surface is the track: no grass, no edge.
 *
 * A `turbo` stretch puts a strip along the surface at a place across
 * (`turbo` on the segment, half widths from the bottom).
 *
 * @typedef {{x: number, y: number, angle: number}} SurfacePoint
 *   half widths from the bottom of the road's line (x to the right, y up), and how far the surface leans there (radians)
 */

/** A lap round a closed tube, half widths. */
export const CIRCLE = 2 * Math.PI * VORTEX.radius;

const smoothstep = (t) => t * t * (3 - 2 * t);

/** How far either side of the bottom the surface reaches, half widths: the flat road's, up to half the tube's lap. */
export function spanOf(roll) {
    return PHYSICS.maxOffset + (CIRCLE / 2 - PHYSICS.maxOffset) * roll;
}

/** Whether a segment is a closed tube, where x goes round. */
export function isClosed(segment) {
    return segment.roll >= 1;
}

/** The point of the surface x along it from the bottom, on a segment rolled this much. @returns {SurfacePoint} */
export function surfaceAt(roll, x) {
    if (!roll) return { x, y: 0, angle: 0 };
    const radius = VORTEX.radius / roll;
    const angle = x / radius;
    return { x: Math.sin(angle) * radius, y: (1 - Math.cos(angle)) * radius, angle };
}

/** How far `to` is from `from` across a segment (half widths), the shorter way round in a closed tube. */
export function acrossOn(segment, from, to) {
    const apart = to - from;
    return isClosed(segment) ? apart - CIRCLE * Math.round(apart / CIRCLE) : apart;
}

/** A place across brought onto a segment's surface: round a closed tube, or held within a half pipe's lips. */
export function onSurface(segment, x) {
    if (isClosed(segment)) return x - CIRCLE * Math.round(x / CIRCLE);
    const span = spanOf(segment.roll);
    return Math.max(-span, Math.min(span, x));
}

/**
 * Gives the segments of the track's `vortex` stretches their `roll` and
 * their surface as one ribbon, and the `turbo` ones their strip.
 * @param {object[]} segments the track's, changed in place
 */
export function layVortex(segments, def) {
    const count = segments.length;
    for (const [from, to] of def.vortex ?? []) {
        const first = Math.round(from * count);
        const last = Math.round(to * count);
        for (let i = first; i < last; i++) {
            const roll = smoothstep(Math.min(1, Math.min(i - first + 1, last - i) / VORTEX.ease));
            const segment = segments[i % count];
            segment.roll = roll;
            segment.ribbons = [{ c: 0, w: spanOf(roll) }];
        }
    }
    for (const [from, to, x] of def.turbo ?? []) {
        for (let i = Math.round(from * count); i < Math.round(to * count); i++) segments[i % count].turbo = x;
    }
}

/** Half widths a second a car at x slides towards the bottom of a rolled segment (0 on the flat). */
export function slideOf(roll, x) {
    return roll ? -VORTEX.gravity * Math.sin(surfaceAt(roll, x).angle) : 0;
}

/** Whether a car at x on a rolled segment is too slow to hold on: up past the walls, under the speed that sticks it there. */
export function letsGo(roll, x, speedRatio) {
    if (!roll) return false;
    const overhang = -Math.cos(surfaceAt(roll, x).angle);
    return overhang > 0 && speedRatio < VORTEX.stick * Math.sqrt(overhang);
}

/** Whether a car at x is on a segment's turbo strip. */
export function onTurbo(segment, x) {
    return segment.turbo !== undefined && Math.abs(acrossOn(segment, segment.turbo, x)) <= VORTEX.turboWidth;
}

/**
 * A car dropping across the tube: it falls towards the bottom, the wheel
 * idle; at the end it lands hard there.
 * @param {import('./Car.js').Car} car
 * @returns {'drop'|'hardLanding'|null} what happened this step
 */
export function drop(car, roll, dt) {
    if (car.dropping === 0) {
        if (car.loose || !letsGo(roll, car.x, car.speedRatio)) return null;
        car.dropping = dt;
        car.dropFrom = car.x;
        return 'drop';
    }
    car.dropping += dt;
    const t = Math.min(1, car.dropping / VORTEX.dropTime);
    car.x = car.dropFrom * (1 - smoothstep(t));
    if (t < 1) return null;
    car.dropping = 0;
    car.x = 0;
    car.speed *= VORTEX.dropKeep;
    car.hurt(VORTEX.dropDamage);
    return 'hardLanding';
}
