/**
 * Simulation constants. Distances are in world pixels, speeds in pixels per
 * tick, durations in ticks (60 per second). The view is part of the rules: the
 * screen decides when enemies wake up, so it never depends on the device.
 */

export const TICK_RATE = 60;

export const View = Object.freeze({
    width: 384,
    height: 216,
    /** the camera follows the player once she passes this fraction of the screen */
    followAt: 0.42,
    /** enemies wake up this far beyond the right edge */
    wakeMargin: 8,
    /** enemies left this far behind the left edge are gone */
    despawnMargin: 96,
});

export const PlayerTuning = Object.freeze({
    runSpeed: 1.5,
    crouchSpeed: 0.6,
    accel: 0.35,
    airAccel: 0.22,
    gravity: 0.24,
    jumpSpeed: 5.2,
    /** releasing jump early cuts the rise to this speed */
    jumpCut: 2.2,
    maxFall: 6,
    coyoteTicks: 6,
    jumpBufferTicks: 7,
    width: 14,
    height: 28,
    crouchHeight: 16,
    maxHearts: 3,
    startLives: 3,
    startBombs: 10,
    maxBombs: 30,
    hurtInvulnTicks: 100,
    respawnInvulnTicks: 150,
    deathTicks: 70,
    bombCooldown: 18,
    meleeRange: 24,
    meleeTicks: 16,
    meleeDamage: 8,
    /** hip height above the feet, where the upper body is drawn and bullets leave */
    gunY: 18,
    gunYCrouch: 9,
});

export const Physics = Object.freeze({
    gravity: 0.24,
    maxFall: 6,
});

export const ScoreTuning = Object.freeze({
    /** heat needed for each step of the multiplier */
    heatPerStep: 5,
    maxMultiplier: 8,
    /** ticks after the last kill before the multiplier starts to cool */
    chainTicks: 180,
    /** ticks between each step lost while cooling */
    coolTicks: 75,
    /** a hit on anything keeps the chain warm for at least this long */
    hitKeepAlive: 50,
    pointBlankRange: 52,
    rescue: 1000,
    swat: 200,
    goldTooth: 5000,
    /** end of mission */
    rescueBonus: 2000,
    allTeethBonus: 15000,
    flawlessBonus: 20000,
    accuracyPerPercent: 100,
    timeBonusPerSecond: 50,
    livesBonus: 25000,
    extraLifeEvery: 200000,
});
