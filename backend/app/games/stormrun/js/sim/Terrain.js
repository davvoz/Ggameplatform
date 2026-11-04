/**
 * The ground: smooth segments between knots, which are the crests and the
 * valleys of the hills. It uses polynomials only: Math.sin and friends can
 * differ between JavaScript engines, plain arithmetic cannot.
 */

const smoothstep = (t) => t * t * (3 - 2 * t);
const smoothstepSlope = (t) => 6 * t * (1 - t);

export class Terrain {
    #segments = [];
    #cursor = 0;
    #lastX;
    #lastY;

    /**
     * @param {number} x first knot
     * @param {number} y
     */
    constructor(x, y) {
        this.#lastX = x;
        this.#lastY = y;
    }

    /** @returns {number} x of the last knot */
    get endX() {
        return this.#lastX;
    }

    /** @returns {number} y of the last knot */
    get endY() {
        return this.#lastY;
    }

    /** Extend the ground to a new knot, on the right of the last one. */
    addKnot(x, y) {
        this.#segments.push({ x0: this.#lastX, x1: x, y0: this.#lastY, y1: y });
        this.#lastX = x;
        this.#lastY = y;
    }

    /** Forget the segments that end before x. */
    trimBefore(x) {
        let drop = 0;
        while (drop < this.#segments.length - 1 && this.#segments[drop].x1 < x) drop++;
        if (drop > 0) {
            this.#segments.splice(0, drop);
            this.#cursor = Math.max(0, this.#cursor - drop);
        }
    }

    /** @returns {number} ground height at x */
    heightAt(x) {
        const s = this.#segmentAt(x);
        const t = this.#progress(s, x);
        return s.y0 + (s.y1 - s.y0) * smoothstep(t);
    }

    /** @returns {number} dy/dx of the ground at x */
    slopeAt(x) {
        const s = this.#segmentAt(x);
        const t = this.#progress(s, x);
        return ((s.y1 - s.y0) * smoothstepSlope(t)) / (s.x1 - s.x0);
    }

    #progress(segment, x) {
        const t = (x - segment.x0) / (segment.x1 - segment.x0);
        return Math.min(1, Math.max(0, t));
    }

    // Lookups are nearly sequential, so the cursor walks instead of searching.
    #segmentAt(x) {
        const segments = this.#segments;
        let i = Math.min(this.#cursor, segments.length - 1);
        while (i > 0 && x < segments[i].x0) i--;
        while (i < segments.length - 1 && x >= segments[i].x1) i++;
        this.#cursor = i;
        return segments[i];
    }
}
