/**
 * The sprite sheets and how each pose is played.
 *
 * Every sheet is a strip of 11 frames, one file per facing
 * (`ANIM_LEFT.webp`, `ANIM_RIGHT.webp`). `scale` turns sheet pixels into world
 * pixels, `feet` is the sheet row the feet stand on (flyers: `anchor: 'center'`).
 *
 * A pose is `{ anim, ms, loop }` (played at its own pace) or
 * `{ anim, timed, from, to }`: frames `from..to` spread over the duration of
 * the monster's stat named `timed`, so a swing lands exactly when it hits.
 */
export const FRAMES = 11;

export const ACTORS = Object.freeze({
    mage: {
        folder: 'assets/sprites/mage', scale: 1.14, feet: 148,
        anims: ['IDLE', 'SPELL', 'TAKE_DAMAGE', 'BLOCK'],
        poses: {
            idle: { anim: 'IDLE', ms: 140, loop: true },
            cast: { anim: 'SPELL', ms: 30 },
            hurt: { anim: 'TAKE_DAMAGE', ms: 38 },
            shield: { anim: 'BLOCK', ms: 110, loop: true },
            dead: { anim: 'TAKE_DAMAGE', ms: 90 },
        },
    },
    warrior: {
        folder: 'assets/sprites/warrior', scale: 1.08, feet: 146,
        anims: ['IDLE', 'WALK', 'ATTACK', 'TAKE_DAMAGE'],
        poses: {
            spawn: { anim: 'IDLE', ms: 150, loop: true },
            idle: { anim: 'IDLE', ms: 150, loop: true },
            walk: { anim: 'WALK', ms: 95, loop: true },
            fall: { anim: 'TAKE_DAMAGE', ms: 60 },
            windup: { anim: 'ATTACK', timed: 'windup', from: 0, to: 6 },
            recover: { anim: 'ATTACK', timed: 'recover', from: 7, to: 10 },
            stagger: { anim: 'TAKE_DAMAGE', ms: 30 },
            // the boss's charge: the axe raised, then a run
            rally: { anim: 'ATTACK', timed: 'rally', from: 0, to: 3 },
            charge: { anim: 'WALK', ms: 40, loop: true },
        },
    },
    archer: {
        folder: 'assets/sprites/elf', scale: 1.08, feet: 149,
        anims: ['IDLE', 'WALK', 'SPELL', 'TAKE_DAMAGE'],
        poses: {
            spawn: { anim: 'IDLE', ms: 150, loop: true },
            idle: { anim: 'IDLE', ms: 150, loop: true },
            walk: { anim: 'WALK', ms: 95, loop: true },
            fall: { anim: 'TAKE_DAMAGE', ms: 60 },
            windup: { anim: 'SPELL', timed: 'windup', from: 0, to: 6 },
            recover: { anim: 'SPELL', timed: 'recover', from: 7, to: 10 },
            stagger: { anim: 'TAKE_DAMAGE', ms: 30 },
            // the boss's volley: the release, over and over
            volley: { anim: 'SPELL', timed: 'volleyGap', from: 4, to: 6 },
        },
    },
    brawler: {
        folder: 'assets/sprites/ken', scale: 1.3, feet: 135,
        anims: ['IDLE', 'WALK', 'ATTACK', 'SPELL', 'TAKE_DAMAGE'],
        poses: {
            spawn: { anim: 'IDLE', ms: 150, loop: true },
            idle: { anim: 'IDLE', ms: 150, loop: true },
            walk: { anim: 'WALK', ms: 90, loop: true },
            fall: { anim: 'TAKE_DAMAGE', ms: 60 },
            windup: { anim: 'ATTACK', timed: 'windup', from: 0, to: 5 },
            throw: { anim: 'SPELL', timed: 'throwWindup', from: 0, to: 8 },
            volley: { anim: 'SPELL', timed: 'volleyGap', from: 6, to: 8 },
            recover: { anim: 'ATTACK', timed: 'recover', from: 6, to: 10 },
            stagger: { anim: 'TAKE_DAMAGE', ms: 30 },
        },
    },
    bat: {
        folder: 'assets/sprites/bat', scale: 0.8, anchor: 'center',
        anims: ['IDLE', 'TAKE_DAMAGE'],
        poses: {
            spawn: { anim: 'IDLE', ms: 90, loop: true },
            fly: { anim: 'IDLE', ms: 80, loop: true },
            stagger: { anim: 'TAKE_DAMAGE', ms: 40 },
        },
    },
});

/** The mage's victory sheet: a 5 x 6 grid. */
export const CELEBRATION = Object.freeze({ file: 'assets/sprites/mage/CELEBRATE.webp', columns: 5, rows: 6, ms: 70 });
