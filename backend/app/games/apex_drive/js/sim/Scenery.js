import { Rng } from '../core/Rng.js';

/**
 * Props by the road, laid from the track's seed: the world's own kinds
 * scattered on both sides, chevron signs on the outside of every sharp
 * bend, warning signs on both sides before broken road, and barriers across
 * the lane closed for roadworks. They are solid: the race checks a car
 * leaving the road (or in roadworks) against them.
 *
 * @typedef {{segment: number, z: number, x: number, kind: string, width: number, look?: string, steem?: string, overhead?: boolean}} Prop
 *   z within one lap; x half widths from the middle (negative: left); look: a challenge board's art;
 *   steem: the Steem user whose avatar a board shows; overhead: over the road, nobody hits it
 */

/**
 * @param {import('./Track.js').Track} track
 * @param {{props: Record<string, number>, propEvery: number}} world
 * @param {typeof import('../config/Props.js').PROPS} kinds
 * @param {typeof import('../config/Props.js').SCENERY} layout
 * @param {Set<number>} [taken] segments left free of scenery (the challenge's boards stand there)
 * @returns {Prop[]} in order along the lap
 */
export function layScenery(track, world, kinds, layout, taken = new Set()) {
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
        if (segment.tunnel || taken.has(i)) return;
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

/**
 * The weekly challenge's boards (config CHALLENGE_ADS): the banner over the
 * road after the line, the boards spread along the lap (moved out of a
 * tunnel), and on the last stretch one word a board, then the giant logo
 * (dropped when in a tunnel, so the words keep their places).
 * @param {typeof import('../config/Props.js').CHALLENGE_ADS} ads
 * @returns {Prop[]} each with the `look` it is drawn with (and `steem`, an avatar's)
 */
export function layAds(track, ads, kinds) {
    const place = (board, segment) => ({
        ...board,
        look: lookOf(board),
        segment,
        z: (segment + 0.5) * track.segmentLength,
        ...kinds[board.kind],
    });
    return [
        place({ kind: 'adBanner', x: 0 }, ads.banner.segment),
        ...alongTheLap(track, ads.along).map(([board, segment]) => place(board, segment)),
        ...beforeTheLine(track, ads.finish).map(([board, segment]) => place(board, segment)),
    ].sort((a, b) => a.z - b.z);
}

/** A board's art: its own look, a text board's, an avatar's frame, or its kind's. */
function lookOf(board) {
    if (board.look) return board.look;
    if (board.text) return `ad:${board.text}`;
    if (board.steem) return 'adAvatar';
    return board.kind;
}

/** [board, segment]: evenly from `from` to `to` of the lap, sides alternating, out of tunnels. */
function alongTheLap({ segments }, { from, to, at, boards }) {
    const count = segments.length;
    return boards.map((board, i) => {
        const share = from + ((to - from) * i) / Math.max(1, boards.length - 1);
        let segment = Math.floor(share * count);
        for (let n = 0; n < count && segments[segment].tunnel; n++) segment = (segment + 1) % count;
        return [{ ...board, x: (i % 2 === 0 ? 1 : -1) * at }, segment];
    });
}

/** [board, segment]: the words `every` segments apart, then the logo `before` segments from the line. */
function beforeTheLine({ segments }, { words, every, before, at, logoAt }) {
    const count = segments.length;
    const boards = [...words.map((text) => ({ kind: 'ad', text, x: at })), { kind: 'adLogo', x: logoAt }];
    return boards.flatMap((board, i) => {
        const segment = count - before - (boards.length - 1 - i) * every;
        return segment < 0 || segments[segment].tunnel ? [] : [[board, segment]];
    });
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
