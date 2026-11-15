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
    count: { base: 6, perWave: 2 },
    /** Seconds between two arrivals: start - perWave x wave, never under min. */
    gap: { start: 1.1, perWave: 0.037, min: 0.55 }, // 0.55 from wave 15 on
    /** Monsters on the field at once: base + wave, at most max. */
    alive: { base: 4, max: 12 },
    /**
     * Monster health is x1 until wave `from`, then grows by `step` every
     * `every` waves (x1.5 from wave 6, x2 from 10...): the one-bolt monsters
     * need two from wave 6. Bats take only part of it (`grit` in `Enemies.js`).
     */
    toughness: { from: 6, every: 4, step: 0.5 },
    breakTime: 2.4,
    /** The scene changes after this many waves. */
    wavesPerMap: 4,
    firstSpawnDelay: 0.9,
    /** Waves where an invader from another player closes the fight, as its boss. */
    invaderEvery: 2,
});

/**
 * The trip to the next scene, after the wave that ends one, in three parts:
 * a curtain of pixels closes in to a ring of light round the mage (`close`),
 * he dances his victory in it until the ring shuts (`cheer`; the dance starts
 * with the curtain), the scene changes behind it and it opens again (`open`).
 * The night holds still meanwhile.
 */
export const SCENE_CHANGE = Object.freeze({ close: 0.75, cheer: 1.65, open: 0.75 });

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

/**
 * Every few waves (`WAVES.invaderEvery`) a boss closes the wave: it comes last,
 * once the field is clear, after a warning with its owner's name. The bosses
 * are the invaders other players sent, taking turns; when the roster runs out
 * it starts again from the first, each one stronger every time it comes back.
 * With no invaders at all, the forest sends its own.
 */
export const INVADER = Object.freeze({
    /** Health is multiplied by (base + perLevel * level), and by the wave's own toughness. */
    hpBase: 9,
    hpPerLevel: 1.2,
    /** Each time the roster starts over, its bosses get this much more health (x1.25, x1.5...)... */
    hpPerLap: 0.25,
    /** ...for this many laps at most (then x2 stays). */
    maxLaps: 4,
    /** Invaders are drawn this much bigger, and their body (for taps and hits) grows with them. */
    lookScale: 1.3,
    /** The share of the usual knockback a critical hit gives them (plain bolts do not stagger them). */
    knockback: 0.4,
    /** Seconds of warning, with the field clear, before the invader steps in. */
    heraldTime: 1.8,
    /** Seconds the wave still lasts after its boss falls, while its fall plays (`render/BossFallArt.js`). */
    farewell: 1.9,
    maxLevel: 5,
    /** The lowest wave a run must reach to send an invader. */
    minWaveToSend: 3,
    wavesPerLevel: 4,
});

/**
 * What only bosses do, and where their level shows beyond their health
 * (`sim/enemies/BossKit.js`): bigger volleys and more bats called.
 */
export const BOSS = Object.freeze({
    /**
     * Below this share of its health a boss is furious: quicker steps, blows
     * and shots, and critical hits no longer stop it (the shield still does).
     */
    furyAt: 0.5,
    furySpeed: 1.3,
    /** Wind-ups, rests and reloads are this many times shorter once furious. */
    furyTempo: 1.35,
    /** At these shares of its health a boss calls bats to its side (1 + level / 2 of them). */
    callsAt: [0.75, 0.35],
    /** Archers and brawlers loose 2 + level / 2 shots in one go, this far apart. */
    volleyBase: 2,
    volleyGap: 0.22,
    /**
     * The warrior's charge: from at least `from` away on its level, a long
     * rally (the red "!"), then a run at `pace` times its step that hits for
     * `damage` hearts; then it waits `cooldown` seconds to charge again.
     */
    charge: { from: 200, rally: 0.7, pace: 4, damage: 2, cooldown: 4.5 },
    /** A bat boss does not burst on its bite: it flies up and away, hangs there, dives again. */
    swoop: { height: 160, away: 260, pace: 1.6, rest: 0.7 },
});

/** The storm: the mage's ultimate, filled by hits, called with its own button (or E). */
export const STORM = Object.freeze({
    /** Hits (bolts, burnt and reflected shots) that fill it. */
    charge: 70,
    /** Charge a lost heart adds (not the last one). */
    hurtCharge: 10,
    /** Damage of each lightning: kills the small fry of the first waves, hurts the rest. */
    damage: 3,
    /** The first lightning falls this long after the call, the others one after the other. */
    firstStrike: 0.3,
    strikeGap: 0.09,
});
