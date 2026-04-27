import { Collisions } from '../physics/Collisions.js';

/**
 * A curved corridor made of two concentric arc walls (inner and outer).
 *
 * Parameters mirror the straight Corridor for consistency:
 *   midRadius   — radius at the centreline of the corridor
 *   width       — gap between inner and outer wall
 *   startAngle  — angular start of the corridor (radians, 0 = right)
 *   angularSpan — angular length of the corridor (radians, positive = CCW)
 *
 * Derived values:
 *   innerRadius = midRadius - width / 2
 *   outerRadius = midRadius + width / 2
 *   endAngle    = startAngle + angularSpan
 *
 * Coordinates: world-space (top already added by _buildCurvedCorridors).
 */
export class CurvedCorridor {
    /** @type {number} */ cx;
    /** @type {number} */ cy;
    /** @type {number} */ midRadius;
    /** @type {number} */ width;
    /** @type {number} */ startAngle;   // radians
    /** @type {number} */ angularSpan;  // radians
    /** @type {number} */ segments;
    /** @type {number} */ restitution;

    /** @type {Array<{ax:number,ay:number,bx:number,by:number}>} */
    #innerSegs = [];
    /** @type {Array<{ax:number,ay:number,bx:number,by:number}>} */
    #outerSegs = [];

    /**
     * @param {number} cx
     * @param {number} cy
     * @param {number} midRadius    centreline radius
     * @param {number} width        gap between inner and outer wall
     * @param {number} startAngle   radians (internal, converted from degrees by Section)
     * @param {number} angularSpan  radians (internal, converted from degrees by Section)
     * @param {{ segments?: number, restitution?: number }} [opts]
     */
    constructor(cx, cy, midRadius, width, startAngle, angularSpan, opts = {}) {
        this.cx          = cx;
        this.cy          = cy;
        this.midRadius   = midRadius;
        this.width       = width;
        this.startAngle  = startAngle;
        this.angularSpan = angularSpan;
        this.segments    = opts.segments    ?? 12;
        this.restitution = opts.restitution ?? 0.55;
        this.#build();
    }

    /** @param {import('../physics/Ball.js').Ball} ball */
    resolve(ball) {
        for (const s of this.#innerSegs) {
            Collisions.circleVsSegment(ball, s.ax, s.ay, s.bx, s.by, this.restitution);
        }
        for (const s of this.#outerSegs) {
            Collisions.circleVsSegment(ball, s.ax, s.ay, s.bx, s.by, this.restitution);
        }
    }

    /** Call after editing properties to refresh geometry. */
    rebuild() {
        this.#innerSegs.length = 0;
        this.#outerSegs.length = 0;
        this.#build();
    }

    /** Derived inner radius. */
    get innerRadius() { return this.midRadius - this.width / 2; }
    /** Derived outer radius. */
    get outerRadius() { return this.midRadius + this.width / 2; }
    /** Derived end angle. */
    get endAngle()    { return this.startAngle + this.angularSpan; }

    /** Expose arc descriptors for renderer. */
    get arcs() {
        const end = this.endAngle;
        return [
            { cx: this.cx, cy: this.cy, radius: this.innerRadius, startAngle: this.startAngle, endAngle: end },
            { cx: this.cx, cy: this.cy, radius: this.outerRadius, startAngle: this.startAngle, endAngle: end },
        ];
    }

    // ── Private ──────────────────────────────────────────────────────────────

    #build() {
        this.#buildArc(this.innerRadius, this.#innerSegs);
        this.#buildArc(this.outerRadius, this.#outerSegs);
    }

    #buildArc(radius, out) {
        const n   = this.segments;
        const end = this.endAngle;
        for (let i = 0; i < n; i++) {
            const a1 = this.startAngle + (i / n)       * (end - this.startAngle);
            const a2 = this.startAngle + ((i + 1) / n) * (end - this.startAngle);
            out.push({
                ax: this.cx + radius * Math.cos(a1),
                ay: this.cy + radius * Math.sin(a1),
                bx: this.cx + radius * Math.cos(a2),
                by: this.cy + radius * Math.sin(a2),
            });
        }
    }
}
