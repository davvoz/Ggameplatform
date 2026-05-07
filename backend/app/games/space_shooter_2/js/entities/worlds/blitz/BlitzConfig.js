/**
 * BlitzConfig — All numeric constants for the Blitz Run mode (W6).
 *
 * Pure data module — no game-object imports.
 *
 * Blitz design pillars:
 *  - Kill enemies within a 2s window to grow the chain multiplier.
 *  - Score goes ONLY to "unbanked" — lost on death unless you BANK first.
 *  - Banking converts unbanked → safe score but resets the multiplier to ×1.
 *  - The tension is always: "do I bank now or push for a higher multiplier?"
 *  - 10% of unbanked is recovered on death as consolation (reduces frustration).
 *  - Waves escalate every PHASE_KILL_THRESHOLD kills through 4 enemy phases.
 *  - Each CYCLE (200 kills): miniboss at 75, miniboss at 150, boss at 200.
 *  - After the boss the cycle resets phases and escalates further.
 */

/** Seconds the player has to get the next kill before the chain resets. */
export const CHAIN_WINDOW = 2;

/** Maximum chain multiplier cap. */
export const MAX_MULTIPLIER = 50;

/** Kills per phase escalation step. */
export const PHASE_KILL_THRESHOLD = 50;

/** Per-phase regular-enemy spawn rate (enemies/second) — NORMAL baseline. */
export const PHASE_SPAWN_RATE = [1.2, 1.8, 2.4, 3];

/** Max simultaneously-alive enemies (performance cap) — NORMAL baseline. */
export const MAX_LIVE_ENEMIES = 18;

/** Wave size: enemies spawned per batch. */
export const WAVE_SIZE_MIN = 2;
export const WAVE_SIZE_MAX = 4;

/** Fraction of unbanked score recovered on death (consolation prize). */
export const DEATH_BANK_RECOVERY = 0.1;

/**
 * Per-difficulty scaling for Blitz Run.
 *
 * spawnMult   — multiplies PHASE_SPAWN_RATE
 * maxLive     — overrides MAX_LIVE_ENEMIES
 * chainWindow — overrides CHAIN_WINDOW (longer = more forgiving)
 * speedMult   — passed as wave speed multiplier to spawnWave()
 * perkEvery   — perk screen unlocks every N banks
 * perkCosts   — safe-score cost for each perk action (instead of platform coins)
 */
export const BLITZ_DIFFICULTY = {
    boring: {
        spawnMult: 0.5,  maxLive: 8,  chainWindow: 4,   speedMult: 0.6,
        perkEvery: 2,
        perkCosts: { reroll: 100,  rare: 300,  epic: 600,   choose_any: 1200  }
    },
    normal: {
        spawnMult: 0.85, maxLive: 14, chainWindow: 2.5, speedMult: 0.8,
        perkEvery: 3,
        perkCosts: { reroll: 500,  rare: 1500, epic: 3000,  choose_any: 6000  }
    },
    hard: {
        spawnMult: 0.95, maxLive: 17, chainWindow: 2.2, speedMult: 0.9,
        perkEvery: 3,
        perkCosts: { reroll: 1000, rare: 3000, epic: 6000,  choose_any: 12000 }
    },
    panic: {
        spawnMult: 1.65, maxLive: 30, chainWindow: 1,   speedMult: 1.35,
        perkEvery: 4,
        perkCosts: { reroll: 2000, rare: 6000, epic: 12000, choose_any: 24000 }
    },
};

/** World identifier for Blitz. */
export const BLITZ_WORLD_ID = 6;

/** Virtual level slot used by blitz — must not collide with campaign (1-120) or survivor (121). */
export const BLITZ_VIRTUAL_LEVEL = 151;

/**
 * Enemy pool per phase — all reuse existing ENEMY_TYPES.
 * Phase index matches PHASE_SPAWN_RATE index.
 */
export const PHASE_POOLS = [
    // Phase 0 — W1 staples
    ['scout', 'swarm', 'fighter', 'phantom'],
    // Phase 1 — W2 mix
    ['stalker', 'lava_golem', 'sand_wurm', 'fighter', 'heavy'],
    // Phase 2 — W3 mix
    ['glitch_drone', 'fragment_shard', 'warp_bug', 'data_cube', 'stalker'],
    // Phase 3 — W4 apex
    ['quark_triplet', 'neutrino_ghost', 'higgs_field', 'positron_mirror', 'mirror_ghost']
];

// ─── Cycle system ────────────────────────────────────────────────────────────

/**
 * Kill milestones within a single cycle that trigger a boss/miniboss.
 * `cycleKill` is relative to the start of the current cycle.
 */
export const BLITZ_EVENTS = [
    { cycleKill: 75,  type: 'miniboss' },
    { cycleKill: 150, type: 'miniboss' },
    { cycleKill: 200, type: 'boss'     },
];

/** Total kills that constitute one cycle (must match last BLITZ_EVENTS.cycleKill). */
export const BLITZ_CYCLE_KILLS = 200;

/**
 * Miniboss type IDs used in Blitz, 2 per cycle.
 * Ordered as pairs so consecutive cycles feel meaningfully different.
 */
export const BLITZ_MINIBOSS_POOL = [1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16];

/**
 * Boss type IDs used in Blitz — one per cycle, cycling through all 4 worlds.
 * These are the strongest end-of-world bosses.
 */
export const BLITZ_BOSS_POOL = [6, 12, 18, 24];

/** Number of cycles before Blitz ends in victory. */
export const BLITZ_MAX_CYCLES = 3;
