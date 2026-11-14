/**
 * Every number that shapes a night, in one place. Distances are world pixels
 * (the arena is 960 x 540), times are seconds, speeds are pixels per second.
 */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const WORLD = Object.freeze({
    width: 960,
    height: 540,
    gravity: 1500,
    /** Ground enemies enter this far outside the screen. */
    entryMargin: 70,
});

export const MAGE = Object.freeze({
    hp: 5,
    /** Where the mage stands, horizontally. */
    x: 480,
    /** Body box around the feet, for hits and for the shield tap. */
    bodyHalfWidth: 30,
    bodyHeight: 120,
    tapHalfWidth: 58,
    tapHeight: 165,
    /** The staff tip, where bolts start. */
    staffForward: 46,
    staffHeight: 104,
    shieldTime: 1.1,
    shieldCooldown: 2.6,
    /** Brief invulnerability after a hit, so one swing cannot hit twice. */
    hurtGrace: 0.9,
});

/**
 * Every bolt costs a charge of energy (gifts and the shield are free); the
 * charges come back by themselves. Tapping faster than they come back does
 * nothing, so the night rewards choosing targets, not tapping fast.
 */
export const ENERGY = Object.freeze({
    max: 4,
    /** Charges back per second. */
    regen: 1.5,
    /** How long the charges blink red after a tap with none left. */
    deniedTime: 0.35,
});

/** A bolt that lands while a monster winds up its blow (the red "!") is critical. */
export const CRITICAL = Object.freeze({
    damageMultiplier: 2,
    /** Charges of energy it gives back. */
    refund: 1,
    points: 50,
});

export const BOLT = Object.freeze({
    speed: 1700,
    damage: 3,
    powerDamage: 2,
});

export const TAP = Object.freeze({
    /** Extra room around a monster's body: fingers are wide. */
    enemyPad: 30,
    shotRadius: 52,
    pickupRadius: 56,
});

export const COMBO = Object.freeze({
    /** The combo cools down after this long without a hit. */
    window: 2.6,
    hitsPerStep: 4,
    maxMultiplier: 6,
});

export const SCORE = Object.freeze({
    shotDown: 25,
    waveClear: 250,
    flawlessWave: 400,
    invaderMultiplier: 5,
});

export const WAVES = Object.freeze({
    /** Monsters in a wave: base + perWave x wave. */
    count: { base: 7, perWave: 2.5 },
    /** Seconds between two arrivals: start - perWave x wave, never under min. */
    gap: { start: 1.1, perWave: 0.08, min: 0.25 },
    /** Monsters on the field at once: base + wave, at most max. */
    alive: { base: 6, max: 18 },
    /** Monster health grows by `step` every `every` waves (x1 on wave 1). */
    toughness: { every: 3, step: 0.35 },
    /** Every this many waves the monsters' blows and shots take one heart more (2 from wave 11...). */
    fury: { every: 10 },
    breakTime: 2.4,
    /** The scene changes after this many waves. */
    wavesPerMap: 4,
    firstSpawnDelay: 0.9,
    /** Waves where an invader from another player joins the fight. */
    invaderEvery: 2,
});

export const PICKUPS = Object.freeze({
    dropChance: 0.13,
    lifetime: 6.5,
    blinkFrom: 2,
    chainTime: 8,
    frostTime: 5,
    frostSlow: 0.4,
    powerTime: 8,
    fallSpeed: 260,
});

export const INVADER = Object.freeze({
    /** Health is multiplied by base + perLevel * level. */
    hpBase: 2,
    hpPerLevel: 0.6,
    speedBoost: 1.12,
    /** Invaders are drawn this much bigger (their shots leave from higher up too). */
    lookScale: 1.12,
    maxLevel: 5,
    /** The lowest wave a run must reach to send an invader. */
    minWaveToSend: 3,
    wavesPerLevel: 4,
});

/** The storm: the mage's ultimate, filled by hits, called with its own button (or E). */
export const STORM = Object.freeze({
    /** Hits (bolts, burnt and reflected shots) that fill it. */
    charge: 70,
    /** Damage of each lightning: kills the small fry of the first waves, hurts the rest. */
    damage: 3,
    /** The first lightning falls this long after the call, the others one after the other. */
    firstStrike: 0.3,
    strikeGap: 0.09,
});
