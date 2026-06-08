import { clamp } from '../core/MathUtils.js';

/**
 * Pure track data + geometry queries. It knows the shape of the circuit, its
 * checkpoints and how to project a world position onto the centerline, but it
 * holds NO race rules (laps, standings, timing live in RaceManager).
 *
 * The centerline is an ellipse sampled into `SAMPLES` points; sample 0 is the
 * start/finish line. Forward = direction of increasing index.
 */
export class Track {
    /** @param {typeof import('../config/GameConfig.js').GameConfig} config */
    constructor(config) {
        const t = config.TRACK;
        this.N = t.SAMPLES;
        this.halfWidth = t.ROAD_HALF_WIDTH;
        /** @type {{x:number,z:number}[]} */
        this.points = new Array(this.N);
        /** @type {{x:number,z:number}[]} */
        this.tangents = new Array(this.N);
        /** @type {{x:number,z:number}[]} */
        this.normals = new Array(this.N);
        /** @type {number[]} sample indices that act as checkpoints */
        this.checkpoints = [];
        this._proj = { index: 0, continuous: 0, lateral: 0 };
        this._build(t.RADIUS_X, t.RADIUS_Z, t.CHECKPOINTS);
    }

    _build(radiusX, radiusZ, checkpointCount) {
        for (let i = 0; i < this.N; i++) {
            const a = (i / this.N) * Math.PI * 2;
            this.points[i] = { x: Math.cos(a) * radiusX, z: Math.sin(a) * radiusZ };
            const tx = -Math.sin(a) * radiusX;
            const tz = Math.cos(a) * radiusZ;
            const len = Math.hypot(tx, tz) || 1;
            this.tangents[i] = { x: tx / len, z: tz / len };
            this.normals[i] = { x: tz / len, z: -tx / len }; // tangent rotated -90deg
        }
        const step = Math.floor(this.N / checkpointCount);
        for (let c = 0; c < checkpointCount; c++) this.checkpoints.push((c * step) % this.N);
    }

    /**
     * @param {number} index integer index (wrapped)
     * @returns {{x:number,z:number}} stored centerline point (do not mutate)
     */
    pointAt(index) {
        const i = ((index % this.N) + this.N) % this.N;
        return this.points[i];
    }

    /**
     * Heading (radians) of the centerline at a sample.
     * @param {number} index
     * @returns {number}
     */
    headingAt(index) {
        const i = ((index % this.N) + this.N) % this.N;
        const tg = this.tangents[i];
        return Math.atan2(tg.x, tg.z);
    }

    /**
     * Project a world position onto the centerline using a local search window
     * around the last known index (cheap, allocation-free).
     * @param {number} x
     * @param {number} z
     * @param {number} lastIndex previous projection index for this body
     * @returns {{index:number, continuous:number, lateral:number}} reused object
     */
    project(x, z, lastIndex) {
        let best = lastIndex;
        let bestD = Infinity;
        for (let o = -3; o <= 14; o++) {
            const i = (((lastIndex + o) % this.N) + this.N) % this.N;
            const p = this.points[i];
            const dx = x - p.x;
            const dz = z - p.z;
            const d = dx * dx + dz * dz;
            if (d < bestD) { bestD = d; best = i; }
        }
        return this._refine(x, z, best);
    }

    _refine(x, z, best) {
        const a = this.points[best];
        const b = this.points[(best + 1) % this.N];
        const ex = b.x - a.x;
        const ez = b.z - a.z;
        const segLen2 = ex * ex + ez * ez || 1;
        const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / segLen2, 0, 1);
        const projX = a.x + ex * t;
        const projZ = a.z + ez * t;
        this._proj.index = best;
        this._proj.continuous = best + t;
        this._proj.lateral = Math.hypot(x - projX, z - projZ);
        return this._proj;
    }

    /**
     * Build a starting grid just ahead of the start line.
     * @param {number} count number of cars
     * @param {number} spacing depth between rows (world units)
     * @returns {{x:number,z:number,heading:number}[]}
     */
    startGrid(count, spacing) {
        const base = this.points[0];
        const fwd = this.tangents[0];
        const nrm = this.normals[0];
        const heading = this.headingAt(0);
        const grid = [];
        for (let k = 0; k < count; k++) {
            const row = Math.floor(k / 2);
            const side = (k % 2 === 0) ? -1 : 1;
            const ahead = 2 + spacing * row;
            const lateral = side * this.halfWidth * 0.4;
            grid.push({
                x: base.x + fwd.x * ahead + nrm.x * lateral,
                z: base.z + fwd.z * ahead + nrm.z * lateral,
                heading,
            });
        }
        return grid;
    }
}
