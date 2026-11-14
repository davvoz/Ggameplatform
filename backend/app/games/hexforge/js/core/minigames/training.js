/** Training's rules: hits as the server scores them, the XP and stars they earn, how fast targets come and go. */

export const SECONDS = 15;

export const GOAL = 20;            // hits for the full XP

const STAR_HITS = [6, 12, 18];

/** Hits as the server's score: two hits a perfect beat, an odd one a good beat, ten beats at most. */
export function hitsToScore(hits) {
    const h = Math.max(0, Math.min(GOAL, hits));
    return { perfect: Math.floor(h / 2), good: h % 2 };
}

/** The XP a number of hits is worth, as the server counts it. */
export function sessionXp(maxXp, hits) {
    const { perfect, good } = hitsToScore(hits);
    return Math.round((maxXp * (perfect + 0.5 * good)) / 10);
}

/** 0 to 3 stars for a session. */
export function starsFor(hits) {
    return STAR_HITS.filter((n) => hits >= n).length;
}

/** Seconds a target stays lit, `t` seconds into the session, for a hero of `tier`. */
export function targetLife(t, tier = 1) {
    return Math.max(0.65, 1.35 - 0.025 * t - 0.12 * (tier - 1));
}

/** Seconds until the next target, `t` seconds into the session. */
export function spawnGap(t) {
    return Math.max(0.38, 0.62 - 0.016 * t);
}
