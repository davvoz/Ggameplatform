import { Rng } from '../core/Rng.js';

/**
 * Props by the road, laid from the track's seed: the world's own kinds
 * scattered on both sides, chevron signs on the outside of every sharp
 * bend, warning signs on both sides before broken road, and barriers across
 * the lane closed for roadworks. They are solid: the race checks a car
 * leaving the road (or in roadworks) against them.
 *
 * @typedef {{segment: number, z: number, x: number, kind: string, width: number}} Prop
 *   z within one lap; x half widths from the middle (negative: left)
 */

/**
 * @param {import('./Track.js').Track} track
 * @param {{props: Record<string, number>, propEvery: number}} world
 * @param {typeof import('../config/Props.js').PROPS} kinds
 * @param {typeof import('../config/Props.js').SCENERY} layout
 * @returns {Prop[]} in order along the lap
 */
export function layScenery(track, world, kinds, layout) {
    const rng = Rng.fork(track.seed, 'scenery');
    const props = [];
    const add = (segment, x, kind) => props.push({
        segment,
        z: (segment + 0.5) * track.segmentLength,
        x,
        kind,
        width: kinds[kind].width,
    });

    const warnings = roughWarnings(track, layout.roughAt);
    track.segments.forEach((segment, i) => {
        if (segment.closed && i % layout.barrierEvery === 0) {
            props.push({ segment: i, z: (i + 0.5) * track.segmentLength, x: segment.closed * layout.barrierAt, kind: 'barrier', ...kinds.barrier });
        }
        if (segment.tunnel) return;
        if (warnings.has(i)) {
            for (const side of [-1, 1]) add(i, side * layout.chevronAt, 'rough');
            return;
        }
        const chevron = Math.abs(segment.curve) > layout.chevronCurve && i % layout.chevronEvery === 0;
        if (chevron) {
            // the outside of a right bend is on the left
            add(i, -Math.sign(segment.curve) * layout.chevronAt, 'chevron');
            return;
        }
        for (const side of [-1, 1]) {
            if (!rng.chance(1 / world.propEvery)) continue;
            const x = rng.range(layout.near, layout.far);
            const kind = rng.weighted(world.props);
            add(i, side * within(x, kinds[kind].at, layout), kind);
        }
    });
    return props;
}

/** The segments the broken road's warning signs stand on: so many segments before each broken stretch. */
function roughWarnings({ segments }, before) {
    const count = segments.length;
    const at = new Set();
    segments.forEach((segment, i) => {
        const starts = segment.broken && !segments[(i - 1 + count) % count].broken;
        if (starts) for (const distance of before) at.add((i - distance + count) % count);
    });
    return at;
}

/** A distance drawn from the usual band, moved into a kind's own band (`at`) if it has one. */
function within(x, at, { near, far }) {
    if (!at) return x;
    return at[0] + ((x - near) / (far - near)) * (at[1] - at[0]);
}

/** The props of a segment, for collisions. @param {Prop[]} props */
export function bySegment(props) {
    const map = new Map();
    for (const prop of props) {
        if (!map.has(prop.segment)) map.set(prop.segment, []);
        map.get(prop.segment).push(prop);
    }
    return map;
}
