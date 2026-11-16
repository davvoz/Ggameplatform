/**
 * Every sound effect as a recipe, synthesised (no files to load):
 * - a tone: { t: wave, from: Hz, to: Hz, d: seconds, v: volume, at: delay }
 * - a noise burst: { n: seconds, f: filter Hz, to: filter Hz at the end, q, v, at }
 * audio/Synth.js plays them. A new sound: a recipe here, then its name where
 * it is played (race events have the event's name, pickups `pickup:<kind>`).
 */

/** A sequence of beeps, `step` seconds apart, the first `at` seconds in. */
function notes(frequencies, { step = 0.08, d = 0.1, v = 0.1, t = 'square', at = 0 } = {}) {
    return frequencies.map((f, i) => ({ t, from: f, to: f, d, v, at: at + i * step }));
}

export const SOUNDS = {
    // ---- the race
    count: [{ t: 'square', from: 440, to: 440, d: 0.18, v: 0.13 }],
    go: [{ t: 'square', from: 880, to: 880, d: 0.45, v: 0.14 }, { t: 'square', from: 1320, to: 1320, d: 0.45, v: 0.06 }],
    perfectStart: notes([784, 988, 1175, 1568], { step: 0.05 }),
    wheelspin: [{ n: 0.6, f: 1800, to: 900, q: 6, v: 0.25 }],
    lap: notes([659, 880], { step: 0.1, d: 0.14 }),
    finalLap: notes([880, 880, 1175], { step: 0.12, d: 0.1, v: 0.12 }),
    finish: [
        ...notes([523, 659, 784, 1047], { step: 0.09, v: 0.1 }),
        { t: 'square', from: 784, to: 784, d: 0.12, v: 0.1, at: 0.45 },
        { t: 'square', from: 1047, to: 1047, d: 0.7, v: 0.11, at: 0.6 },
        { t: 'triangle', from: 523, to: 523, d: 0.7, v: 0.1, at: 0.6 },
    ],
    nitro: [
        { n: 0.7, f: 600, to: 3000, q: 1, v: 0.35 },
        { t: 'sawtooth', from: 120, to: 420, d: 0.5, v: 0.08 },
    ],
    bump: [{ t: 'triangle', from: 140, to: 60, d: 0.12, v: 0.35 }, { n: 0.08, f: 500, v: 0.3 }],
    bumpHurt: [
        { t: 'triangle', from: 160, to: 50, d: 0.16, v: 0.4 },
        { n: 0.1, f: 2600, q: 3, v: 0.25 },
        { t: 'square', from: 1900, to: 1500, d: 0.06, v: 0.05, at: 0.02 },
    ],
    crash: [
        { n: 0.55, f: 900, to: 150, v: 0.55 },
        { t: 'sawtooth', from: 110, to: 35, d: 0.5, v: 0.3 },
        { n: 0.2, f: 3500, q: 2, v: 0.2, at: 0.05 },
    ],
    /** A wheel in a pothole: a dull thud and the body rattling. */
    pothole: [
        { t: 'triangle', from: 110, to: 38, d: 0.18, v: 0.45 },
        { n: 0.12, f: 700, to: 200, v: 0.35 },
        { t: 'square', from: 2100, to: 1700, d: 0.04, v: 0.05, at: 0.03 },
        { t: 'square', from: 1800, to: 1500, d: 0.04, v: 0.04, at: 0.09 },
    ],
    /** A speech bubble: quick chatter; a lapped rival gets a laugh. */
    taunt: notes([660, 880, 740, 990], { step: 0.05, d: 0.04, v: 0.05 }),
    'taunt:lapped': notes([784, 587, 784, 587, 784], { step: 0.08, d: 0.06, v: 0.06 }),
    positionUp: notes([880, 1320], { step: 0.06, d: 0.08, v: 0.08 }),
    positionDown: notes([523, 349], { step: 0.07, d: 0.1, v: 0.08 }),
    'pickup:cash': notes([1319, 1976], { step: 0.07, d: 0.12, v: 0.1 }),
    'pickup:nitro': [{ t: 'sawtooth', from: 300, to: 900, d: 0.2, v: 0.08 }, ...notes([1047, 1568], { step: 0.08, at: 0.1 })],
    'pickup:full': [{ t: 'square', from: 300, to: 300, d: 0.08, v: 0.07 }],
    'pickup:repair': [{ n: 0.06, f: 3000, q: 4, v: 0.25 }, { n: 0.06, f: 2500, q: 4, v: 0.2, at: 0.1 }, ...notes([659, 988], { step: 0.08, d: 0.1, v: 0.07, at: 0.18 })],
    'pickup:shield': [{ t: 'sine', from: 400, to: 1600, d: 0.35, v: 0.18 }, { t: 'sine', from: 600, to: 2400, d: 0.35, v: 0.08 }],
    'pickup:boost': [{ t: 'square', from: 400, to: 2000, d: 0.18, v: 0.08 }, { n: 0.3, f: 1500, to: 4000, v: 0.2 }],

    // ---- the menus
    move: [{ t: 'square', from: 1200, to: 1200, d: 0.03, v: 0.05 }],
    confirm: notes([880, 1320], { step: 0.05, d: 0.07, v: 0.08 }),
    back: notes([660, 440], { step: 0.05, d: 0.07, v: 0.08 }),
    buy: [...notes([1319, 1976, 2637], { step: 0.06, d: 0.1, v: 0.08 }), { n: 0.05, f: 4000, q: 3, v: 0.15 }],
    fit: [{ n: 0.04, f: 2000, q: 4, v: 0.2 }, { t: 'square', from: 700, to: 1100, d: 0.08, v: 0.06, at: 0.05 }],
    deny: [{ t: 'square', from: 140, to: 120, d: 0.22, v: 0.09 }, { t: 'square', from: 147, to: 127, d: 0.22, v: 0.06 }],
    wipe: [{ n: 0.45, f: 400, to: 2400, q: 1, v: 0.12 }],
    start: [{ t: 'sawtooth', from: 110, to: 440, d: 0.4, v: 0.08 }, ...notes([523, 784, 1047], { step: 0.08, v: 0.09, at: 0.3 })],
    podium: [...notes([784, 988, 1175, 1568], { step: 0.1, d: 0.14, v: 0.1 }), { t: 'triangle', from: 784, to: 784, d: 0.8, v: 0.1, at: 0.4 }],
    noPodium: notes([523, 494, 440], { step: 0.14, d: 0.16, v: 0.08, t: 'triangle' }),
};

/**
 * The two volumes the player sets (SOUND panel): steps of 0..`steps`, and
 * where a new player starts. The music starts lower, under the engines.
 */
export const LEVELS = { steps: 10, effects: 10, music: 7 };

/**
 * The engine: gears the speed is shared out in (each one a range of speed
 * ratios) and the sound of the engine across one gear's range of revs.
 */
export const ENGINE = {
    /** Upper end of each gear, as speed / PHYSICS.refSpeed. */
    gears: [0.17, 0.34, 0.53, 0.74, 0.95, 1.4],
    /** Revs just after a shift (0..1 of the gear's range). */
    shiftDrop: 0.32,
    /** Hz of the engine's note from the bottom to the top of a gear's revs. */
    pitch: [48, 150],
    /** Nitro raises the note this much. */
    nitroPitch: 1.18,
    /** Volume idling, on the throttle, coasting. */
    volume: { idle: 0.06, throttle: 0.13, coast: 0.08 },
    /** The filter opens with the revs: Hz at the bottom and top. */
    brightness: [500, 2400],
    skid: { f: 1500, q: 5, v: 0.22 },
    /**
     * The tyres squealing, as in the 16-bit racers: a warbling note. It grows
     * with the grip a bend takes (`bend`: from where to where, Car.gripUsed),
     * or with hard steering at speed (`steer`: steering x speed ratio), the
     * louder of the two; never below `minSpeed`. It rises `rise` Hz with the load.
     */
    squeal: {
        bend: [0.3, 0.7],
        steer: [0.35, 0.75],
        minSpeed: 0.3,
        v: 0.16,
        f: 1050,
        rise: 180,
        bright: 1500,
        wobble: { rate: 21, depth: 80 },
    },
    rumble: { f: 180, v: 0.35 },
    /** On broken road the rumble plays at this share of the grass's. */
    brokenRumble: 0.45,
    wind: { f: 1800, v: 0.08 },
    /** A rival within this many world units (ahead or behind) is heard. */
    rivalRange: 2600,
    rivalVolume: 0.06,
};
