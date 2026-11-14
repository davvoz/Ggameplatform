/** The gremlin hunt's rules: when each gremlin sets off, how fast, from where, and the stars for the catch. */

const STAR_SHARE = [5 / 12, 9 / 12, 1];

/** When each gremlin of a gang of `total` sets off (seconds after GO), faster and faster. */
export function gangSchedule(total, rng = Math.random) {
    const times = [];
    let t = 0.4;
    for (let i = 0; i < total; i++) {
        times.push(Number(t.toFixed(2)));
        const pair = i > 2 && rng() < 0.25;          // now and then two at once
        t += pair ? 0.2 : Math.max(0.75, 1.5 - 0.07 * i) + rng() * 0.3;
    }
    return times;
}

/** Cells per second for a gremlin setting off `t` seconds in. */
export function gremlinSpeed(t) {
    return Math.min(2.8, 1.5 + 0.11 * t);
}

/** 0 to 3 stars for `caught` of `total`. */
export function gremlinStars(caught, total) {
    return STAR_SHARE.filter((share) => caught >= Math.ceil(total * share)).length;
}

/** A start on the edge of the field: one of the four sides, anywhere along it. */
export function edgePoint(grid, rng = Math.random) {
    const along = 1 + rng() * (grid - 2);
    const side = Math.floor(rng() * 4);
    if (side === 0) return { x: along, y: 0.2 };
    if (side === 1) return { x: grid - 0.2, y: along };
    if (side === 2) return { x: along, y: grid - 0.2 };
    return { x: 0.2, y: along };
}
