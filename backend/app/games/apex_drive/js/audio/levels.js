/**
 * Volume steps (what the player sets, 0..steps) to gains. The ear hears
 * loudness roughly as the square of the gain, so the steps sound even.
 */

/** A saved step made safe: a whole number within 0..steps, or the fallback. */
export function stepOf(value, fallback, steps) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.min(steps, Math.max(0, Math.round(value)));
}

/** @returns {number} 0..1 */
export function gainOf(step, steps) {
    return (step / steps) ** 2;
}
