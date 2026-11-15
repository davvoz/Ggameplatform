/**
 * Monster stats. Behaviour lives in `sim/enemies/`, looks in `config/Sprites.js`.
 *
 * - `body`: half width and height of the body box above the feet (flyers: around the centre).
 * - `reach`: how close a melee monster gets before it swings.
 * - `windup` / `recover`: the swing is telegraphed, then it rests.
 * - `range`: archers keep between `range[0]` and `range[1]` from the mage.
 * - `grit`: the share of the waves' toughness it takes (1 when missing): bats, the swarm, take half.
 * - `muzzle`: where shots leave, ahead of and above the feet: the bow string and
 *   the hands in the sprite's release frame (archer SPELL 6, Ken SPELL 8).
 */
export const ENEMIES = Object.freeze({
    bat: {
        hp: 1, speed: 125, score: 100, damage: 1,
        flying: true, body: { halfWidth: 34, height: 52 },
        bob: { amplitude: 34, period: 1.3 },
        grit: 0.5,
        firstWave: 1,
    },
    warrior: {
        hp: 1, speed: 58, score: 300, damage: 1,
        body: { halfWidth: 34, height: 112 },
        reach: 92, windup: 0.5, recover: 0.55, stagger: 0.22, knockback: 20,
        firstWave: 1,
    },
    archer: {
        hp: 1, speed: 62, score: 250, damage: 1,
        body: { halfWidth: 28, height: 110 },
        range: [250, 390], windup: 0.75, recover: 0.4, reload: 2.4, stagger: 0.22, knockback: 12,
        shot: 'arrow', muzzle: { forward: 52, up: 114 },
        firstWave: 2,
    },
    brawler: {
        hp: 2, speed: 80, score: 450, damage: 1,
        body: { halfWidth: 30, height: 112 },
        reach: 86, windup: 0.36, recover: 0.5, stagger: 0.2, knockback: 16,
        throwRange: 230, throwWindup: 0.55, reload: 3.4,
        shot: 'fireball', muzzle: { forward: 52, up: 97 },
        firstWave: 4,
    },
});

export const SHOTS = Object.freeze({
    arrow: { speed: 330, damage: 1, radius: 14 },
    fireball: { speed: 250, damage: 1, radius: 22 },
});

/** How the monster mix grows, wave by wave. */
export const WAVE_MIX = Object.freeze([
    { from: 1, weights: { bat: 5, warrior: 3 } },
    { from: 2, weights: { bat: 4, warrior: 3, archer: 2 } },
    { from: 4, weights: { bat: 4, warrior: 3, archer: 3, brawler: 1 } }, // brawlers come in a few at a time
    { from: 6, weights: { bat: 4, warrior: 3, archer: 3, brawler: 2 } },
]);
