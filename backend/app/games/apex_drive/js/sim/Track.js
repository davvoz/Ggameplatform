/**
 * A closed road, cut in segments of equal length. It is built from a map
 * (config/Tracks.js): a smooth closed curve runs through the control points,
 * is walked at equal steps, and every step becomes a segment that knows
 * - how much the road turns there (`curve`, world units of sideways drift
 *   per segment, what the pseudo-3D projection accumulates),
 * - its height at both ends (`y1`, `y2`),
 * - the road's heading there, unwrapped (for the scrolling backdrop).
 * The walked points are the minimap's plan, so map and road always agree.
 *
 * Distances along the road (`z`) may grow past one lap: every query wraps.
 */

const TAU = Math.PI * 2;

/** @typedef {{index: number, curve: number, turn: number, heading: number, y1: number, y2: number}} Segment */
/** @typedef {{x: number, y: number}} PlanPoint a point of the map, in map units */

export function wrap(value, size) {
    return ((value % size) + size) % size;
}

/** An angle brought within (-PI, PI]. */
function wrapAngle(angle) {
    return angle - TAU * Math.round(angle / TAU);
}

/** Uniform Catmull-Rom between b and c (a and d are their neighbours). */
function catmull(a, b, c, d, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
}

/** The closed spline through the points, sampled densely: [{x, y, h}]. */
function sampleSpline(points, density) {
    const count = points.length;
    const dense = [];
    for (let i = 0; i < count; i++) {
        const [a, b, c, d] = [-1, 0, 1, 2].map((k) => points[wrap(i + k, count)]);
        for (let s = 0; s < density; s++) {
            const t = s / density;
            dense.push({
                x: catmull(a.x, b.x, c.x, d.x, t),
                y: catmull(a.y, b.y, c.y, d.y, t),
                h: catmull(a.h, b.h, c.h, d.h, t),
            });
        }
    }
    return dense;
}

/** Points every `step` world units along the closed polyline `dense`. */
function walk(dense, count) {
    const loop = [...dense, dense[0]];
    const lengths = [0];
    for (let i = 1; i < loop.length; i++) {
        lengths.push(lengths[i - 1] + Math.hypot(loop[i].x - loop[i - 1].x, loop[i].y - loop[i - 1].y));
    }
    const step = lengths.at(-1) / count;
    const points = [];
    let j = 0;
    for (let k = 0; k < count; k++) {
        const distance = k * step;
        while (lengths[j + 1] < distance) j++;
        const t = (distance - lengths[j]) / (lengths[j + 1] - lengths[j] || 1);
        const [p, q] = [loop[j], loop[j + 1]];
        points.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, h: p.h + (q.h - p.h) * t });
    }
    return points;
}

function closedLength(dense) {
    let total = 0;
    for (let i = 0; i < dense.length; i++) {
        const next = dense[(i + 1) % dense.length];
        total += Math.hypot(next.x - dense[i].x, next.y - dense[i].y);
    }
    return total;
}

/** Circular box average: turns ease in and out, their sum stays the same. */
function smooth(values, radius) {
    const count = values.length;
    const span = radius * 2 + 1;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += values[wrap(k, count)];
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
        out[i] = sum / span;
        sum += values[wrap(i + radius + 1, count)] - values[wrap(i - radius, count)];
    }
    return out;
}

export class Track {
    /** @type {Segment[]} */
    segments;
    /** @type {PlanPoint[]} one per segment, in map units */
    plan;
    segmentLength;
    /** One lap, world units. */
    length;
    /** Heading gained over one lap (+-2 PI). */
    lapTurn;
    id;
    name;
    laps;
    weather;
    seed;

    /**
     * @param {object} def a track of config/Tracks.js (with its key as `id`)
     * @param {{segmentLength: number, density: number, curveGain: number, smoothing: number}} options
     */
    constructor(def, { segmentLength, density, curveGain, smoothing }) {
        const points = def.points.map(([x, y, h]) => ({ x: x * def.scale, y: y * def.scale, h: h * def.heightScale }));
        const dense = sampleSpline(points, density);
        const count = Math.max(3, Math.round(closedLength(dense) / segmentLength));
        const steps = walk(dense, count);
        const raw = steps.map((p, i) => {
            const q = steps[(i + 1) % count];
            return Math.atan2(q.y - p.y, q.x - p.x);
        });
        const turns = smooth(raw.map((angle, i) => wrapAngle(raw[(i + 1) % count] - angle)), smoothing);

        let heading = raw[0];
        this.segments = steps.map((p, i) => {
            const segment = {
                index: i,
                turn: turns[i],
                curve: turns[i] * segmentLength * curveGain,
                heading,
                y1: p.h,
                y2: steps[(i + 1) % count].h,
            };
            // tunnels: [from, to] shares of the lap
            if (def.tunnels?.some(([from, to]) => i / count >= from && i / count < to)) segment.tunnel = true;
            // roadworks: [from, to, side] shares of the lap, the lane closed on `side` (-1 left, 1 right)
            const works = def.roadworks?.find(([from, to]) => i / count >= from && i / count < to);
            if (works) segment.closed = works[2];
            // broken road: [from, to] shares of the lap (potholes: sim/Potholes.js)
            if (def.broken?.some(([from, to]) => i / count >= from && i / count < to)) segment.broken = true;
            heading += turns[i];
            return segment;
        });
        this.lapTurn = heading - raw[0];
        this.hasTunnels = this.segments.some((segment) => segment.tunnel);
        this.plan = steps.map((p) => ({ x: p.x / def.scale, y: p.y / def.scale }));
        this.segmentLength = segmentLength;
        this.length = count * segmentLength;
        this.id = def.id;
        this.name = def.name;
        this.laps = def.laps;
        this.weather = def.weather;
        this.seed = def.seed;
    }

    /**
     * How far ahead on the road `toZ` is from `fromZ` (behind if negative),
     * the shorter way round the loop. Cars count their distance since the
     * start: a car a lap down is a lap behind in z, yet beside on the road.
     */
    gap(fromZ, toZ) {
        const ahead = wrap(toZ - fromZ, this.length);
        return ahead > this.length / 2 ? ahead - this.length : ahead;
    }

    /** @returns {Segment} */
    segmentAt(z) {
        return this.segments[Math.floor(wrap(z, this.length) / this.segmentLength) % this.segments.length];
    }

    /** How far into its segment z is, 0..1. */
    progressIn(z) {
        return wrap(z, this.segmentLength) / this.segmentLength;
    }

    elevationAt(z) {
        const segment = this.segmentAt(z);
        return segment.y1 + (segment.y2 - segment.y1) * this.progressIn(z);
    }

    /** Rise per unit of road under z. */
    slopeAt(z) {
        const segment = this.segmentAt(z);
        return (segment.y2 - segment.y1) / this.segmentLength;
    }

    /** The road's heading at z, never wrapped: one more lap adds `lapTurn`. */
    headingAt(z) {
        const segment = this.segmentAt(z);
        const laps = Math.floor(z / this.length);
        return segment.heading + segment.turn * this.progressIn(z) + laps * this.lapTurn;
    }

    /** @returns {PlanPoint} where z is on the map */
    planAt(z) {
        const segment = this.segmentAt(z);
        const p = this.plan[segment.index];
        const q = this.plan[(segment.index + 1) % this.plan.length];
        const t = this.progressIn(z);
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    }
}
