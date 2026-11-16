/**
 * Every number that shapes the look and the feel, in one place.
 * World units: the road is 2 x ROAD.halfWidth wide, the camera sits
 * CAMERA.height above it. Screen units: pixels of the low resolution frame.
 */

/** Simulation ticks per second. */
export const TICK_RATE = 60;

/**
 * The frame is drawn at a fixed low height and scaled up with square pixels,
 * like a 16-bit console. Its width follows the screen's shape, within limits.
 */
export const SCREEN = {
    height: 180,
    minWidth: 240,
    maxWidth: 432,
    /** Where the horizon sits on a flat road, as a fraction of the height. */
    horizon: 0.4,
    /** Vertical field of view, degrees. */
    fovY: 70,
};

export const ROAD = {
    segmentLength: 200,
    halfWidth: 1100,
    /** Segments per light or dark band (rumble strips, grass, lane marks). */
    bandSegments: 3,
    lanes: 3,
    /** Segments projected ahead of the camera. */
    drawDistance: 300,
    /** Fog starts at this fraction of the draw distance... */
    fogStart: 0.2,
    /** ...and is full at this one (weather can bring both nearer). */
    fogEnd: 1,
    /** Fog is drawn in this many steps: the banding is part of the look. */
    fogSteps: 10,
};

export const CAMERA = {
    height: 1000,
    /** How far behind the car the camera rides. */
    behind: 1400,
    /** How much the camera tilts with the road's slope (0 = never). */
    pitch: 0.6,
    /** Largest tilt, pixels. */
    maxPitch: 10,
    /** Fraction of the way to the target tilt covered each frame. */
    pitchEase: 0.12,
    /** On a crest the backdrop comes down to the road's last row, at most this far (pixels)... */
    maxDrop: 70,
    /** ...covering this fraction of the way each frame. */
    dropEase: 0.35,
};

/**
 * Driving on a touch screen (input/Controls.js, touch mode only; the
 * keyboard and the mouse drive as before). A held half of the screen
 * steers gently at first and fully after a moment, so a short tap is a
 * small correction; the throttle stays open while racing.
 */
export const TOUCH = {
    /** Steering the moment a finger lands... */
    steerFrom: 0.3,
    /** ...growing to full lock in this many seconds of holding. */
    steerRamp: 0.45,
};

/** How a car's drawn pose follows its steering (render/art/lean.js); the handling is PHYSICS.turnEase. */
export const LEAN = {
    /** Steering the drawn lean covers per second: straight to full lock in 1 / rate seconds. */
    rate: 3.5,
    /** The lean that shows the fullest turning pose; the poses in between share the way to it. */
    fullAt: 0.6,
    /** A pose is kept until the lean is this far past its edge. */
    margin: 0.05,
};

/** How a track's map becomes a road: see sim/Track.js. */
export const TRACK_BUILD = {
    /** Spline samples per stretch between two control points. */
    density: 48,
    /** The road bends this much more than the map, for a livelier drive. */
    curveGain: 1.6,
    /** Turns are averaged over this many segments on each side, so they ease in and out. */
    smoothing: 12,
};

/**
 * The car's physics. Speeds are world units per second; a car's own numbers
 * (power, drag, grip...) come from its build (config/Parts.js, sim/Build.js).
 * The engine pushes with power / speed, capped by traction at low speed;
 * air drag grows with the square of the speed: top speed is where they meet.
 */
export const PHYSICS = {
    /** Below this speed the engine's push is capped by traction, not power. */
    minThrustSpeed: 2500,
    /** Tyres on the asphalt, always slowing the car a little (units/s^2, x the car's mass). */
    rolling: 120,
    brake: 11000,
    /** Speed that counts as "full" for steering and bends, and the km/h it is shown as. */
    refSpeed: 12000,
    refKmh: 290,
    /** Road half widths per second of steering at full speed. */
    steer: 2.2,
    /** How hard a bend pushes the car outward. */
    centrifugal: 0.3,
    /** A bend asking more than grip x slipLimit makes the car slide... */
    slipLimit: 1.5,
    /** ...pushed further out by this much of the excess... */
    slidePush: 1.4,
    /** ...and losing this fraction of its speed per second per unit of excess. */
    slideScrub: 0.35,
    /** How fast the wheel follows the input (per second). */
    turnEase: 9,
    /** Sideways shoves (bumps) die out at this rate (per second). */
    shoveDecay: 5,
    /** The car cannot leave the road by more than this (road half widths). */
    maxOffset: 2.4,
    /** On the grass a car slows down to its offRoadLimit at this rate. */
    offRoadDrag: 7000,
    /** At zero health the engine gives this much less. */
    damagePower: 0.4,
    /** Nitro also lets the tyres push this much harder. */
    nitroTraction: 1.35,
    /** Most nitro charges a car can hold, whatever its build, pickups and drifts. */
    maxNitro: 5,
};

/** The size of a car on the road, for collisions and drafting. */
export const BODY = {
    /** Road half widths. */
    width: 0.46,
    /** World units. */
    length: 420,
};

export const CONTACT = {
    /** A bump shoves both cars sideways at this speed (half widths per second), times the other's ram. */
    shove: 1.1,
    /** The car behind keeps this much of the speed difference. */
    rearKeep: 0.35,
    damage: 5,
    /** Seconds before the same two cars can hurt each other again. */
    cooldown: 0.6,
    /** A prop by the road: the car keeps this much of its speed. */
    crashKeep: 0.3,
    crashDamage: 14,
    /** Seconds before the same car can crash into a prop again. */
    crashCooldown: 0.8,
};

export const DRAFT = {
    /** World units behind a car where its slipstream helps. */
    range: 2600,
    /** How close sideways (half widths) the cars must be. */
    width: 0.4,
};

export const RACE = {
    /** Seconds on the grid before the lights. */
    grid: 1.6,
    /** Seconds of countdown: 3, 2, 1. */
    countdown: 3,
    /** Grid rows behind the start line, world units apart. */
    gridGap: 520,
    /** Grid columns, half widths from the middle. */
    gridSide: 0.42,
    /** Pressing the throttle at most this long before GO (x the car's launchWindow) is a perfect start... */
    launchWindow: 0.4,
    /** ...worth this many seconds of free nitro (x the car's launchBoost). */
    launchBoost: 1.1,
    /** Rivals far behind the player get up to `boost` more power, far ahead up to `boost` less. */
    rubberBand: { span: 30000, boost: 0.08 },
    /** A rival within this many world units on the road is watched for being overtaken. */
    passRange: 2000,
    /** Seconds the FINISH banner stays before the results. */
    finishHold: 3,
};

/** Credits a new career starts with. */
export const START_CREDITS = 1500;

/** Prize money by finishing place, before the world's prize scale. */
export const PRIZES = [1500, 1000, 700, 450, 250, 120];

/** A place this good or better unlocks the next track. */
export const PODIUM = 3;
