/**
 * Single source of truth for tunable constants.
 * No magic numbers anywhere else in the codebase.
 */
export const GameConfig = Object.freeze({
    // Virtual canvas (portrait, mobile-first)
    VIEW_WIDTH: 480,
    VIEW_HEIGHT: 720,

    // Tall world — one SECTION_HEIGHT per section declared in board.json.
    // Section count and derived values (MAIN_TABLE_TOP, WORLD_HEIGHT) are read
    // at runtime from BoardManager / LevelConfigStore — not hardcoded here.
    WORLD_WIDTH: 480,
    SECTION_HEIGHT: 720,

    // Physics — real-pinball feel: gravity + restitution only, no air damping.
    GRAVITY: 1900,                  // px/s^2 (world units)
    BALL_RADIUS: 10,
    BALL_MAX_SPEED: 2200,
    BALL_RESTITUTION_WALL: 0.72,    // lively bounces, like a steel ball on metal
    BALL_RESTITUTION_BUMPER: 1.05,  // active push
    BALL_RESTITUTION_SLING: 1.15,
    BALL_RESTITUTION_TARGET: 0.5,
    PHYSICS_SUBSTEPS: 16,     // see PhysicsWorld._assertNoTunneling: max substep displacement must stay < BALL_RADIUS
    FRAME_DT_CLAMP: 0.05,     // hard cap on frame dt (50 ms). Tab-switch / debugger pauses must not break physics.
    WALL_SKIN: 2,             // extra detection margin for wall segments: ball bounces 2px before visual wall

    // Flipper
    FLIPPER_LENGTH: 64,
    FLIPPER_LENGTH_MINI: 40,
    FLIPPER_THICKNESS: 14,
    FLIPPER_REST_ANGLE: 0.42,        // tip points DOWN-INWARD from pivot at rest
    FLIPPER_ACTIVE_ANGLE: -0.58,     // tip swings UP-INWARD when active
    FLIPPER_SPEED: 28,               // rad/s
    FLIPPER_IMPULSE: 1180,           // base impulse magnitude
    FLIPPER_LENGTH_BIG: 180,              // extra-long "boss flippers" for UpperTable
    // Bumper
    BUMPER_RADIUS: 22,
    BUMPER_KICK: 480,               // velocity ADDED outward on contact
    BUMPER_SCORE: 100,

    // Slingshot
    SLING_KICK: 560,                // velocity ADDED along outward normal
    SLING_SCORE: 50,

    // Warp hole
    WARP_SCORE: 500,

    // Drop target
    TARGET_WIDTH: 26,
    TARGET_HEIGHT: 10,
    TARGET_SCORE: 250,
    TARGET_BANK_BONUS: 5000,

    // Kicker (one-shot up-launcher between sections)
    KICKER_IMPULSE: 1100,
    KICKER_SCORE: 75,

    // Spring (wall-mounted launch pad)
    SPRING_POWER: 1300,
    SPRING_SCORE: 150,

    // LaunchSpring (player-controlled plunger entity)
    LAUNCH_SPRING_MAX_POWER:   3200,  // px/s at full retraction
    LAUNCH_SPRING_CHARGE_TIME: 1.2,   // seconds to fully retract
    LAUNCH_SPRING_MAX_EXT:     80,    // default max pad travel (px)
    LAUNCH_SPRING_LOCK_TIME:   0.18,  // seconds pad stays locked after firing
    LAUNCH_SPRING_RESET_SPEED: 6,   // chargeRatio/s during snap-back (fast snap)
    LAUNCH_SPRING_RESTITUTION: 0.2,   // low — pad pushes gently, not bounces
    LAUNCH_SPRING_MIN_PULL:    0.3,   // minimum pull fraction on tap (prevents dead launch)

    // Scoring & multipliers
    COMBO_WINDOW: 1.6,              // seconds between hits to keep combo
    COMBO_MAX: 8,
    MULT_MAX: 8,
    MULT_DECAY_AFTER: 6,            // seconds without scoring -> decay one step

    // Zone multiplier tiers (height-based bonus: higher on board = more points)
    // maxFraction: fraction of worldHeight (0 = top, 1 = bottom). Sorted ascending.
    // First matching tier wins.
    ZONE_TIERS: [
        { maxFraction: 0.2,  mult: 3,   label: 'APEX', color: '#ffd700' },
        { maxFraction: 0.45, mult: 2,   label: 'HIGH', color: '#ff9900' },
        { maxFraction: 0.7,  mult: 1.5, label: 'MID',  color: '#88cc44' },
        { maxFraction: 1,    mult: 1,   label: 'BASE', color: '#6a4a7e' },
    ],

    // Ball management
    BALLS_PER_GAME: 3,
    BALL_SAVE_TIME: 4,
    EXTRA_BALL_SCORE_THRESHOLD: 1_000_000,
    TILT_SHAKE_LIMIT: 3,            // shakes before tilt penalty

    // Boss
    BOSS_PHASE_HP: [60, 90, 130],
    BOSS_HIT_SCORE: 300,
    BOSS_PHASE_BONUS: 25_000,
    BOSS_DEFEAT_BONUS: 250_000,
    DRAGON_HP: 50,
    WITCH_HP: 45,
    GOLEM_HP: 55,
    MINI_BOSS_BONUS: 50_000,

    // Mission system (6 missions)
    MISSION_COUNT: 6,
    MISSION_TIMEOUT: 30,
    MISSION_REWARD: 30_000,

    // Camera
    CAMERA_LERP: 6,
    CAMERA_LOOKAHEAD: 60,
    // Fraction of transition duration used for the "cover" (bar-in) phase.
    // Camera pan completes at this point; bar then retreats revealing new floor.
    TRANSITION_COVER_FRAC: 0.45,

    // Global palette (HUD, ball, particles)
    COLOR_BG: '#04020a',
    COLOR_GOLD: '#ffd700',
    COLOR_WHITE: '#f4e8ff',
    COLOR_DIM: '#6a4a7e',
    COLOR_RED: '#ff1a1a',
    COLOR_PURPLE: '#8822ee',
    COLOR_PURPLE_DARK: '#3a0855',

    // HUD
    SCORE_DIGITS: 8,

    // Input
    INPUT_LEFT_KEY: 'ArrowLeft',
    INPUT_RIGHT_KEY: 'ArrowRight',
    INPUT_LAUNCH_KEY: 'ArrowDown',
    INPUT_TILT_KEY: 'KeyT',

    // Audio
    AUDIO_MASTER: 0.22,
    AUDIO_DEFAULT_MUTED: false,
    AUDIO_PROFILE_TRANSITION: 0.55,   // s — LP / reverb / comp crossfade on section change
    AUDIO_DEFAULT_PROFILE: 'inferno', // profile id applied at game start
    AUDIO_BGM_VOLUME: 0.35,           // background music gain (feeds into master chain)
    AUDIO_BGM_PATH:   'assets/background/PINBALL2.mp3',

    // Anti-stuck (last-resort rescue only — real pinball never needs it)
    STUCK_VEL_THRESHOLD: 25,
    STUCK_TIME: 4,
    STUCK_NUDGE_X: 120,
    STUCK_NUDGE_Y: 260,
    // Position-based stuck: ball moved < threshold over window seconds.
    STUCK_POS_WINDOW: 3,
    STUCK_POS_THRESHOLD: 40,
    // Display-stuck (HUD RESET button glow): more sensitive than nudge.
    STUCK_DISPLAY_WINDOW: 2,
    STUCK_DISPLAY_THRESHOLD: 60,
    // Nudge randomisation factors (kept here so tuning lives in one place).
    NUDGE_X_RANDOM_BASE: 0.6,
    NUDGE_X_RANDOM_RANGE: 0.6,
    NUDGE_Y_RANDOM_BASE: 0.7,
    NUDGE_Y_RANDOM_RANGE: 0.5,
    NUDGE_SHAKE: 0.15,

    // Drain animation phase boundaries (seconds since drain start).
    // Read by both the Renderer (DrainOverlayRenderer) and the BallLifecycle
    // controller — keep them in one place to avoid desync.
    DRAIN_IMPLODE_END: 0.55,
    DRAIN_HOLD_END:    2.5,
    DRAIN_SPAWN_END:   3.2,

    // Tilt — escalation factors and impulse magnitudes.
    TILT_INTENSITY_BASE:   0.7,
    TILT_INTENSITY_STEP:   0.25,
    TILT_KICK_X:           280,
    TILT_KICK_Y:           340,
    TILT_KICK_X_RAND_BASE: 0.7,
    TILT_KICK_X_RAND_RANGE: 0.6,
    TILT_KICK_Y_RAND_BASE: 0.5,
    TILT_KICK_Y_RAND_RANGE: 0.5,
    TILT_SHAKE:            0.4,
    TILT_FX_COLOR:         '#ff4400',
    TILT_FX_RADIUS:        14,
    TILT_FX_SPEED:         260,
    TILT_FX_LIFE:          0.5,

    // Game-over UX
    MENU_GUARD_TIME:       2,         // seconds the game-over banner is locked

    // Playfield boundary (left wall position in world coords).
    PLAYFIELD_LEFT_X:      20,

    // Loop self-protection: bail out after N consecutive frame errors.
    LOOP_MAX_ERRORS:       30,

    // Particles (FX pool size)
    PARTICLE_POOL: 96,
    PARTICLE_LIFE: 0.55,

    // Hint overlay duration on first ball
    HINT_DURATION: 6,

    // Plunger (hold-to-charge launcher)
    PLUNGER_MIN_VEL: 1100,           // released instantly with no charge
    PLUNGER_MAX_VEL: 2000,           // fully charged release (must clear the tunnel)
    PLUNGER_CHARGE_TIME: 1.2,        // seconds to reach full power

    // Plunger lane geometry (top-right corner)
    PLUNGER_TUBE_WIDTH: 30,          // horizontal column width (right wall - inner wall)
    DEFLECTOR_RADIUS: 60,            // outer-curve radius (must be > tube width)
    DEFLECTOR_SEGMENTS: 12,          // straight segments approximating each arc

    // HUD canvas action buttons (canvas pixel space, VIEW_WIDTH=480, top bar=40px)
    HUD_BTN_Y:        8,              // top edge of all buttons (px)
    HUD_BTN_W:        44,             // button width (px)
    HUD_BTN_H:        24,             // button height (px)
    HUD_BTN_RESCUE_X: 144,            // RESET button left edge
    HUD_BTN_TILT_X:   196,            // TILT  button left edge
    HUD_BTN_BGM_X:    248,            // BGM toggle left edge
    HUD_BTN_SFX_X:    300,            // SFX toggle left edge
    HUD_BTN_PAUSE_X:  352,            // PAUSE toggle left edge

    // ── Mobile control bar (canvas-px band BELOW the playfield) ─────────────
    // Total physical canvas height = VIEW_HEIGHT + CTRL_BAR_HEIGHT.
    // Renderer is clipped to the playfield; HUD owns the bar exclusively.
    CTRL_BAR_HEIGHT:  170,
    CTRL_BTN_PAD:     14,             // outer padding (canvas px)
    CTRL_BTN_GAP:     14,             // gap between LEFT and RIGHT buttons
});
