/**
 * Single source of truth for every tunable number in cur8rancing.
 * No magic numbers are allowed outside this object.
 */
export const GameConfig = Object.freeze({
    RACE: Object.freeze({
        LAPS: 3,
        OPPONENTS: 3,          // AI cars in addition to the player
        GRID_SPACING: 5,       // world units between cars on the start grid
    }),

    TRACK: Object.freeze({
        SAMPLES: 240,          // centerline resolution (also lap-progress resolution)
        RADIUS_X: 120,
        RADIUS_Z: 80,
        ROAD_HALF_WIDTH: 9,
        CHECKPOINTS: 8,        // evenly spaced gates, index 0 = start/finish
        ROAD_COLOR: 0x2a2d3a,
        EDGE_COLOR: 0xf5f5f5,
        GRASS_COLOR: 0x1d3a24,
    }),

    PHYSICS: Object.freeze({
        REF_MASS: 1000,        // mass that yields the model's nominal acceleration
        DRAG: 0.45,            // air resistance proportional to speed
        ROLL_RESIST: 9,        // constant deceleration when coasting (u/s^2)
        BRAKE_DECEL: 46,       // braking deceleration (u/s^2)
        MAX_REVERSE: 12,       // top reverse speed (u/s)
        STEER_RATE: 1.9,       // base yaw rate (rad/s)
        TURN_SPEED_REF: 10,    // speed at which steering reaches full authority
        GRASS_DAMP: 0.94,      // per-frame speed retention off-road
        GRASS_MAX_SPEED: 18,   // speed cap on grass
    }),

    CAMERA: Object.freeze({
        FOV: 60,
        DISTANCE: 13,
        HEIGHT: 6.5,
        LOOK_AHEAD: 9,
        LERP: 6,               // follow smoothing factor (per second)
        NEAR: 0.5,
        FAR: 900,
    }),

    COUNTDOWN: Object.freeze({
        STEPS: Object.freeze([3, 2, 1]),
        STEP_TIME: 1,        // seconds per number
        GO_TIME: 0.7,          // seconds the "GO!" stays on screen
    }),

    AI: Object.freeze({
        LOOKAHEAD: 7,          // centerline samples ahead to aim at
        STEER_BAND: 0.6,       // radians mapped to full steering
        THROTTLE_CUT: 0.75,    // how much corners reduce throttle
        MIN_THROTTLE: 0.45,
        BRAKE_THRESHOLD: 0.95, // corner sharpness (rad) that triggers braking
        BRAKE_AMOUNT: 0.6,
        SKILL_SPREAD: 0.08,    // per-car deterministic throttle variation
    }),

    CAR: Object.freeze({
        LENGTH: 4.5,           // target length after model normalization (u)
        SHADOW_RADIUS: 1.8,
        GLASS: Object.freeze({
            COLOR: 0x0c1018,   // tinted dark glass, identical on every car
            METALNESS: 0.9,
            ROUGHNESS: 0.08,
            BAND_LOW: 0.52,    // normalized height where the greenhouse starts
            BAND_HIGH: 0.84,   // normalized height where the roof takes over
        }),
    }),

    DISPLAY: Object.freeze({
        SPEED_FACTOR: 3,     // world u/s -> displayed "km/h"
        HUD_HZ: 12,            // HUD refresh rate (Hz) to avoid DOM thrash
    }),

    SCORE: Object.freeze({
        POSITION_POINTS: Object.freeze([1000, 600, 400, 200, 100]),
        TIME_BONUS_CAP: 500,   // bonus = max(0, CAP - seconds)
    }),

    RENDER: Object.freeze({
        SKY_COLOR: 0x10131f,
        FOG_NEAR: 180,
        FOG_FAR: 520,
        PIXEL_RATIO_CAP: 2,
    }),
});
