/** The anvil's rules: five strikes on a moving marker, rated perfect, good or miss, and the stars they earn. */

export const STRIKES = 5;

const STAR_POINTS = [3, 6, 9];        // perfect 2 points, good 1

/** How a strike at position `p` (0..1) rates with zone half-widths for strike `n`. */
export function rateStrike(p, n) {
    const { perfect, good } = zones(n);
    const off = Math.abs(p - 0.5);
    if (off <= perfect) return 'perfect';
    if (off <= good) return 'good';
    return 'miss';
}

export function zones(n) {
    return { perfect: 0.065 - 0.007 * n, good: 0.17 - 0.012 * n };
}

/** Where the marker is at `t` seconds into strike `n`: a ping-pong 0..1, faster each strike. */
export function markerAt(t, n) {
    const cycles = t * (0.75 + 0.18 * n);
    const f = cycles % 1;
    return f < 0.5 ? f * 2 : 2 - f * 2;
}

/** 0 to 3 stars for a round. */
export function anvilStars(perfect, good) {
    const points = 2 * perfect + good;
    return STAR_POINTS.filter((n) => points >= n).length;
}
