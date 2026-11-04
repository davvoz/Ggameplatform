/**
 * Every tuning value of the simulation. Distances are metres, times seconds.
 * The balance tests in tests/balance.test.js guard these numbers.
 */

const TICK_RATE = 60;

export const SimConfig = Object.freeze({
    tickRate: TICK_RATE,
    dt: 1 / TICK_RATE,

    runner: Object.freeze({
        startX: 0,
        radius: 1.7,
        startSpeed: 16,
        minSpeed: 7,
        maxSpeed: 40,

        // the run gets faster by itself; a hit slows it down for a moment
        cruiseSpeed: 17,
        cruisePerMetre: 0.0034,
        maxCruiseSpeed: 34,
        catchUp: 1,
        slopeEffect: 7,

        gravity: 48,
        // lighter while rising with the button held: longer press, higher jump
        gravityHeld: 22,
        jumpSpeed: 15.5,
        doubleJumpSpeed: 13.5,
        rampLift: 0.65,

        // forgiveness: a press just before landing or just after a ledge counts
        coyoteTicks: 6,
        bufferTicks: 8,

        minFlightTicks: 5,
        perfectMinAirTicks: 20,
        perfectMaxImpact: 0.45,
        perfectBoost: 1.16,
        landingKeep: 0.8,
    }),

    storm: Object.freeze({
        startGap: 36,
        baseSpeed: 16.8,
        speedPerMetre: 0.0044,
        maxGap: 62,
        rainbowPush: 20,
    }),

    paint: Object.freeze({
        bands: 7,
    }),

    pickups: Object.freeze({
        reach: 2.6,
    }),

    obstacles: Object.freeze({
        recoveryTicks: 45,
    }),

    course: Object.freeze({
        lookAhead: 170,
        keepBehind: 150,
        safeStart: 60,
        minCrestY: -4,
        maxCrestY: 14,
        maxSlope: 0.8,
        rampRatio: 0.85,
    }),
});
