/**
 * Things by the road. `width` is how much of the road a prop takes (half
 * widths): a car that leaves the road and meets one crashes. `at` (half
 * widths from the middle) keeps a kind nearer or farther than the usual
 * band: buildings stand back, cones on the kerb. Their pixel art is in
 * render/art/PropArt.js. A world names the kinds it uses (config/Worlds.js).
 *
 * Chevron signs are not drawn by chance: sim/Scenery.js puts them on the
 * outside of the sharp bends, as warnings.
 */
export const PROPS = {
    pine: { width: 0.34 },
    rock: { width: 0.4 },
    lamp: { width: 0.12 },
    billboard: { width: 0.9 },
    chevron: { width: 0.3 },
    building: { width: 1.5, at: [2.6, 3.4] },
    cone: { width: 0.2, at: [1.45, 1.75] },
    /** A roadworks trestle across a closed lane: it stops a car less hard than a lamp post. */
    barrier: { width: 0.9, soft: { keep: 0.6, damage: 5 } },
    snowPine: { width: 0.34 },
    /** The striped poles that mark a road's edges under the snow, right by the kerb. */
    snowPole: { width: 0.1, at: [1.3, 1.5] },
    cabin: { width: 1.3, at: [2.6, 3.3] },
    snowman: { width: 0.3 },
    /** Broken road ahead: put up by sim/Scenery.js before every broken stretch, never by chance. */
    rough: { width: 0.3 },
    /** The weekly challenge's boards (CHALLENGE_ADS): wide ones with words, square ones, the giant logo. */
    ad: { width: 1.8 },
    adSquare: { width: 1.7 },
    adAvatar: { width: 2.3 },
    adLogo: { width: 2.6 },
    /** Across the road on two posts, high up: the cars drive under it, it stops nobody. */
    adBanner: { width: 0, overhead: true },
};

/**
 * The weekly challenge's boards, in every world (sim/Scenery.js layAds, art
 * in render/art/AdArt.js). Each board has a `kind` (its size, above) and a
 * `look`: its art, or `text` for a wide board with that text on it, or
 * `steem` for an avatar board (kind adAvatar) with that Steem user's avatar (loaded from Steem
 * during the race, as the standings' avatars).
 * - banner: over the road, `segment` segments after the line (the start);
 * - along: spread over the lap from `from` to `to` (shares), on alternate
 *   sides `at` half widths from the middle, the right first;
 * - finish: the last stretch, on the right: one word a board, `every`
 *   segments apart, then the giant logo `before` segments from the line.
 */
export const CHALLENGE_ADS = {
    banner: { segment: 4 },
    along: {
        from: 0.1,
        to: 0.75,
        at: 2.6,
        boards: [
            { kind: 'ad', text: 'NO BRAKES!' },
            // the tall square boards on the left, clear of the minimap
            { kind: 'adSquare', look: 'adCur8' },
            { kind: 'ad', text: 'HODL STEEM' },
            { kind: 'adAvatar', steem: 'luciojolly' },
            { kind: 'ad', text: 'TOP 10 WIN' },
        ],
    },
    finish: { words: ['VOTE', 'CUR8', 'FOR', 'WITNESS'], every: 50, before: 50, at: 2.7, logoAt: 3.6 },
};

export const SCENERY = {
    /** Props stand at least this far from the middle (half widths)... */
    near: 1.7,
    /** ...and at most this far. */
    far: 3.4,
    /** A bend sharper than this gets chevrons on its outside... */
    chevronCurve: 4.5,
    /** ...one every so many segments... */
    chevronEvery: 5,
    /** ...at this distance from the middle. */
    chevronAt: 1.4,
    /** Roadworks: a barrier every so many segments, in the middle of the closed lane. */
    barrierEvery: 7,
    barrierAt: 0.5,
    /** Broken road: warning signs on both sides, this many segments before each broken stretch. */
    roughAt: [32, 16],
};
