/**
 * The ground of a mission: a height line with gentle slopes, plus one-way
 * platforms (balconies, crates, scaffolding) you can jump onto from below and
 * drop through with down + jump. y grows downwards.
 *
 * @typedef {{x: number, y: number, w: number}} Platform
 */
export class Terrain {
    /** @type {number[]} */ #xs;
    /** @type {number[]} */ #ys;
    /** @type {Platform[]} */ platforms;
    length;

    /**
     * @param {{ground: number[][], platforms?: Platform[], length: number}} spec
     */
    constructor({ ground, platforms = [], length }) {
        this.#xs = ground.map((p) => p[0]);
        this.#ys = ground.map((p) => p[1]);
        this.platforms = platforms.map((p) => ({ ...p }));
        this.length = length;
    }

    /** Height of the ground at x. */
    groundY(x) {
        const xs = this.#xs;
        const ys = this.#ys;
        if (x <= xs[0]) return ys[0];
        const last = xs.length - 1;
        if (x >= xs[last]) return ys[last];
        let lo = 0;
        let hi = last;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (xs[mid] <= x) lo = mid;
            else hi = mid;
        }
        const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
        return ys[lo] + (ys[hi] - ys[lo]) * t;
    }

    /**
     * A platform crossed going down from prevY to y at x.
     * @returns {Platform | null}
     */
    platformCrossed(x, halfW, prevY, y) {
        for (const p of this.platforms) {
            if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
            if (prevY <= p.y + 0.01 && y >= p.y) return p;
        }
        return null;
    }

    /** @param {Platform} p */
    stillOn(p, x, halfW) {
        return x + halfW > p.x + 2 && x - halfW < p.x + p.w - 2;
    }

    /** The highest surface at or below y at x: a platform top or the ground. */
    surfaceBelow(x, y) {
        let best = this.groundY(x);
        for (const p of this.platforms) {
            if (x < p.x || x > p.x + p.w) continue;
            if (p.y >= y - 1 && p.y < best) best = p.y;
        }
        return best;
    }
}
