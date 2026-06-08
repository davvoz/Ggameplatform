/**
 * Small, allocation-free math helpers shared across the game.
 * @module MathUtils
 */

/**
 * Clamp a value into the inclusive [min, max] range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t blend factor (0..1)
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Wrap an angle to the (-PI, PI] range.
 * @param {number} angle radians
 * @returns {number}
 */
export function wrapAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a <= -Math.PI) a += Math.PI * 2;
    return a;
}

/**
 * Sign helper that returns 0 for 0 (Math.sign returns -0/0).
 * @param {number} value
 * @returns {number} -1, 0 or 1
 */
export function signOf(value) {
    if (value > 0) return 1;
    if (value < 0) return -1;
    return 0;
}
