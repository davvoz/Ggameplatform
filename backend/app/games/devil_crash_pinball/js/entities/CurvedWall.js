import { Collisions } from '../physics/Collisions.js';

/**
 * A circular-arc wall segment used as a smooth deflector.
 * Generates N straight physics segments internally so it is transparent
 * to the Collisions system, but renders as a smooth canvas arc.
 *
 * Coordinates: world-space (section top already applied by _buildCurves).
 */
export class CurvedWall {
    /** @type {number} */ cx;
    /** @type {number} */ cy;
    /** @type {number} */ radius;
    /** @type {number} */ startAngle; // radians
    /** @type {number} */ endAngle;   // radians
    /** @type {number} */ segments;
    /** @type {number} */ restitution;
    /** @type {number} */ thickness;

    /** @type {Array<{ax:number,ay:number,bx:number,by:number}>} */
    #segs = [];

    /**
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @param {number} startAngle  radians
     * @param {number} endAngle    radians
     * @param {number} segments    number of physics segments
     * @param {number} restitution
     */
    constructor(cx, cy, radius, startAngle, endAngle, segments = 12, restitution = 0.55) {
        this.cx          = cx;
        this.cy          = cy;
        this.radius      = radius;
        this.startAngle  = startAngle;
        this.endAngle    = endAngle;
        this.segments    = segments;
        this.restitution = restitution;
        this.thickness   = 4;
        this.#buildSegments();
    }

    /** @param {import('../physics/Ball.js').Ball} ball */
    resolve(ball) {
        for (const s of this.#segs) {
            Collisions.circleVsSegment(ball, s.ax, s.ay, s.bx, s.by, this.restitution);
        }
    }

    /** Rebuild segments after property change (editor live-update). */
    rebuild() {
        this.#segs.length = 0;
        this.#buildSegments();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    #buildSegments() {
        const n = this.segments;
        for (let i = 0; i < n; i++) {
            const a1 = this.startAngle + (i / n) * (this.endAngle - this.startAngle);
            const a2 = this.startAngle + ((i + 1) / n) * (this.endAngle - this.startAngle);
            this.#segs.push({
                ax: this.cx + this.radius * Math.cos(a1),
                ay: this.cy + this.radius * Math.sin(a1),
                bx: this.cx + this.radius * Math.cos(a2),
                by: this.cy + this.radius * Math.sin(a2),
            });
        }
    }
}
