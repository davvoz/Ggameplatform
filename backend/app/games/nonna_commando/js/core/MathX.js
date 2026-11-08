/**
 * Deterministic math for the simulation.
 *
 * The ECMAScript spec lets Math.sin, Math.atan2 and friends differ between
 * engines by a few ulps, which is enough to split two replays apart. These
 * versions use only + - * / and Math.floor/Math.sqrt, which IEEE 754 fixes
 * exactly, so every engine computes the same bits.
 */

export const PI = 3.141592653589793;
export const TAU = PI * 2;
const HALF_PI = PI / 2;

/** @param {number} a radians */
export function sinX(a) {
    let x = a - TAU * Math.floor((a + PI) / TAU);
    if (x > HALF_PI) x = PI - x;
    else if (x < -HALF_PI) x = -PI - x;
    const x2 = x * x;
    return x * (1 - (x2 / 6) * (1 - (x2 / 20) * (1 - (x2 / 42) * (1 - (x2 / 72) * (1 - x2 / 110)))));
}

/** @param {number} a radians */
export function cosX(a) {
    return sinX(a + HALF_PI);
}

/** Angle of the vector (x, y), max error about 0.0001 rad. */
export function atan2X(y, x) {
    if (x === 0 && y === 0) return 0;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const swap = ay > ax;
    const t = swap ? ax / ay : ay / ax;
    const t2 = t * t;
    let r = t * (0.9998660 + t2 * (-0.3302995 + t2 * (0.1801410 + t2 * (-0.0851330 + t2 * 0.0208351))));
    if (swap) r = HALF_PI - r;
    if (x < 0) r = PI - r;
    return y < 0 ? -r : r;
}

export function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}

export function approach(value, target, step) {
    if (value < target) return Math.min(value + step, target);
    return Math.max(value - step, target);
}

export function sign(v) {
    return v < 0 ? -1 : 1;
}

/** Overlap of two boxes given as centre-bottom bodies or plain rects. */
export function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
}
