/**
 * The arsenal. Every weapon answers a different problem on the battlefield:
 *
 *  - Mestolo pistol: endless and precise. Good for picking off rockets.
 *  - Heavy Machinegun: a sweeping stream that shreds crowds and balloons.
 *  - Lupara shotgun: point blank wall of lead, pierces lines of grunts,
 *    pays the point blank bonus by design.
 *  - Fireworks launcher: seeking rockets with splash; the answer to vehicles.
 *  - Candle flamer: short cone that pierces and burns through tray shields.
 *
 * `shot` names the projectile kind spawned (see sim/Projectiles.js).
 * `ammo` 0 means endless.
 */

export const WeaponId = Object.freeze({
    PISTOL: 'pistol',
    HEAVY: 'heavy',
    SHOTGUN: 'shotgun',
    FIREWORKS: 'fireworks',
    FLAMER: 'flamer',
});

export const Weapons = Object.freeze({
    pistol: {
        id: 'pistol', name: 'MESTOLO', letter: '', ammo: 0,
        cooldown: 10, burst: 1, shot: 'bullet', speed: 6.5, damage: 1, spread: 0,
        recoil: 3, countsAccuracy: true, sound: 'pistol',
    },
    heavy: {
        id: 'heavy', name: 'HEAVY MG', letter: 'H', ammo: 200,
        cooldown: 4, burst: 1, shot: 'heavyBullet', speed: 7.5, damage: 1, spread: 0.9,
        recoil: 2, countsAccuracy: true, sound: 'heavy', sweeps: true,
    },
    shotgun: {
        id: 'shotgun', name: 'LUPARA', letter: 'S', ammo: 30,
        cooldown: 30, burst: 1, shot: 'blast', speed: 0, damage: 7, spread: 0,
        recoil: 6, countsAccuracy: true, sound: 'shotgun',
    },
    fireworks: {
        id: 'fireworks', name: 'FIREWORKS', letter: 'R', ammo: 30,
        cooldown: 20, burst: 1, shot: 'rocket', speed: 2, damage: 6, spread: 0,
        recoil: 4, countsAccuracy: true, sound: 'rocket',
    },
    flamer: {
        id: 'flamer', name: 'CANDLE FLAMER', letter: 'F', ammo: 160,
        cooldown: 3, burst: 1, shot: 'flame', speed: 3.6, damage: 0.4, spread: 0.5,
        recoil: 0, countsAccuracy: false, sound: 'flame',
    },
});

/** Ammo gained by picking up a crate of a weapon already in hand. */
export const AMMO_REFILL_FRACTION = 1;
