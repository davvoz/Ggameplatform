/**
 * SurvivorConfig — All numeric constants for the Custom Survivor world (W5).
 *
 * Pure data module — no game-object imports. Edit numbers here only.
 *
 * Survivor design pillars:
 *  - Single uninterrupted run (no levels, no checkpoints).
 *  - Player picks up to MAX_PICKS perks BEFORE the run starts.
 *  - 4 boss milestones (one per source world) and 12 mini-bosses
 *    (3 per source world), structured in 4 phases.
 *  - Progression is KILL-BASED, not time-based: each "step" between
 *    milestones requires KILLS_PER_STEP regular enemy kills.
 *  - Continuous mixed-pool enemy waves at a high, sustained pace —
 *    intense from the very first second on every difficulty.
 *  - Win condition: defeat the final (4th) boss.
 */

/** Maximum number of perk picks the player can spend pre-run. */
export const MAX_PICKS = 10;

/** Boss roster — finals of each source world ("masters of every reality"). */
export const SURVIVOR_BOSS_IDS = [6, 12, 18, 24];

/**
 * Mini-boss roster — 3 from each source world (12 total).
 * Reuses existing MINIBOSS_DEFS from Enemy.js.
 */
export const SURVIVOR_MINIBOSS_IDS = [
    1, 2, 3,        // World 1 mini-bosses
    5, 6, 7,        // World 2
    9, 10, 11,      // World 3
    13, 14, 15      // World 4
];

/** World identifier reserved for Custom Survivor. */
export const SURVIVOR_WORLD_ID = 5;

/**
 * Kills required between consecutive milestones inside a phase.
 * A phase = 4 steps × KILLS_PER_STEP + 3 mini-bosses + 1 boss.
 */
export const KILLS_PER_STEP = 25;

/**
 * Per-phase regular-enemy spawn rate (enemies/second).
 * Rate escalates with phase to keep pressure rising.
 */
export const PHASE_SPAWN_RATE = [1.5, 2.05, 2.5, 3.05];

/** Max simultaneously-alive non-boss enemies (cap to protect perf). */
export const MAX_LIVE_ENEMIES = 28;

/** Wave size: enemies spawned per emit batch. */
export const WAVE_SIZE_MIN = 2;
export const WAVE_SIZE_MAX = 5;

/** Movement patterns randomly assigned to spawned enemies. */
export const SURVIVOR_PATTERNS = [
    'straight', 'sine', 'zigzag', 'dive', 'circle',
    'spiral', 'strafe', 'swoop', 'pendulum'
];

/** Power-up drop rate during survivor (slightly higher than campaign). */
export const SURVIVOR_DROP_RATE = 0.3;
