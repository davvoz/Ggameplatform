import { Collisions } from '../physics/Collisions.js';

/**
 * A straight corridor made of two parallel wall segments.
 * Defined by two axis endpoints (ax,ay)→(bx,by) and a perpendicular width.
 * Angle and length are derived automatically so the editor can drag endpoints.
 *
 * Coordinates: world-space (top already added by _buildCorridors).
 */
export class Corridor {
    /** @type {number} */ ax;
    /** @type {number} */ ay;
    /** @type {number} */ bx;
    /** @type {number} */ by;
    /** @type {number} */ width;
    /** @type {number} */ restitution;

    // Each wall: { ax, ay, bx, by }
    #wallA = null;
    #wallB = null;

    /**
     * @param {number} ax          axis start X
     * @param {number} ay          axis start Y
     * @param {number} bx          axis end X
     * @param {number} by          axis end Y
     * @param {number} width       gap between the two walls
     * @param {number} restitution
     */
    constructor(ax, ay, bx, by, width, restitution = 0.55) {
        this.ax          = ax;
        this.ay          = ay;
        this.bx          = bx;
        this.by          = by;
        this.width       = width;
        this.restitution = restitution;
        this.#build();
    }

    /** @param {import('../physics/Ball.js').Ball} ball */
    resolve(ball) {
        const w = this.#wallA;
        const v = this.#wallB;
        Collisions.circleVsSegment(ball, w.ax, w.ay, w.bx, w.by, this.restitution);
        Collisions.circleVsSegment(ball, v.ax, v.ay, v.bx, v.by, this.restitution);
    }

    /** Call after editing properties to refresh geometry. */
    rebuild() { this.#build(); }

    /** Expose wall pair for renderer. */
    get walls() { return [this.#wallA, this.#wallB]; }

    // ── Private ──────────────────────────────────────────────────────────────

    #build() {
        const dx   = this.bx - this.ax;
        const dy   = this.by - this.ay;
        const len  = Math.hypot(dx, dy) || 1;
        // Unit perpendicular (rotated 90° CCW)
        const ox = -(dy / len) * (this.width / 2);
        const oy =  (dx / len) * (this.width / 2);

        this.#wallA = {
            ax: this.ax + ox, ay: this.ay + oy,
            bx: this.bx + ox, by: this.by + oy,
        };
        this.#wallB = {
            ax: this.ax - ox, ay: this.ay - oy,
            bx: this.bx - ox, by: this.by - oy,
        };
    }
}
