/**
 * LevelData - defines enemy waves, bosses, and other parameters for each level.
 * Levels are defined in LEVEL_DATA.js, but this module also generates extra bonus
 * waves based on level and world progression, using getWorldConfig() and POOL_MAP to
 * 
 * Each level defines exact enemy waves that spawn in order.
 * Waves are sequential: all enemies in a wave must be cleared before next wave.
 * Last level in a boss-cycle has a boss fight.
 * 
 * Wave format:
 *   enemies: array of { type, x, pattern } - exact enemies to spawn
 *   delay:   seconds to wait before this wave starts (after previous cleared)
 * 
 * Level format:
 *   waves:          array of wave definitions
 *   boss:           boss level (null = no boss)
 *   speedMult:      enemy speed multiplier
 *   name:           display name for level
 *   description:    brief description
 */

import { LEVEL_DATA, makeWave, e } from "./LEVEL_DATA.js";

/**
 * Per-world configuration: speed damping, relLevel offset, bonus-wave formula.
 * Entries are ordered from highest threshold down so Array.find() returns the
 * correct world on the first match.
 */
const WORLD_CONFIG = [
    { threshold: 90, offset: 90, speedFactor: 0.75, bonusDivisor: 5, maxBonus: 5 }, // W4 – quantum realm
    { threshold: 60, offset: 60, speedFactor: 0.78, bonusDivisor: 5, maxBonus: 5 }, // W3 – simulation break
    { threshold: 30, offset: 30, speedFactor: 0.82, bonusDivisor: 5, maxBonus: 5 }, // W2 – alien worlds
    { threshold: 0, offset: 0, speedFactor: 1, bonusDivisor: 3, maxBonus: 8 }, // W1 – original
];

/** Returns the config entry that matches the given level. */
function getWorldConfig(level) {
    return WORLD_CONFIG.find(w => level > w.threshold) ??
        WORLD_CONFIG.at(-1);
}

/**
 * Enemy pool per level range, ordered ascending by maxLevel.
 * Array.find() returns the first entry where level <= maxLevel.
 */
const POOL_MAP = [
    { maxLevel: 5, pool: ['scout', 'swarm', 'fighter'] },
    { maxLevel: 12, pool: ['fighter', 'heavy', 'phantom', 'swarm'] },
    { maxLevel: 22, pool: ['fighter', 'heavy', 'phantom', 'sentinel'] },
    { maxLevel: 30, pool: ['heavy', 'phantom', 'sentinel'] },
    { maxLevel: 35, pool: ['stalker', 'jungle_vine', 'nest', 'fighter', 'scout'] },
    { maxLevel: 40, pool: ['stalker', 'lava_golem', 'nest', 'heavy', 'fighter'] },
    { maxLevel: 45, pool: ['stalker', 'frost_elemental', 'nest', 'sentinel', 'heavy'] },
    { maxLevel: 50, pool: ['stalker', 'sand_wurm', 'nest', 'phantom', 'sentinel'] },
    { maxLevel: 55, pool: ['stalker', 'mech_drone', 'nest', 'sentinel', 'heavy', 'phantom'] },
    { maxLevel: 60, pool: ['stalker', 'toxic_blob', 'nest', 'sentinel', 'phantom', 'mech_drone'] },
    { maxLevel: 65, pool: ['glitch_drone', 'data_cube', 'fragment_shard', 'warp_bug'] },
    { maxLevel: 70, pool: ['glitch_drone', 'fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost'] },
    { maxLevel: 75, pool: ['data_cube', 'fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost'] },
    { maxLevel: 80, pool: ['fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost', 'data_cube'] },
    { maxLevel: 85, pool: ['warp_bug', 'error_node', 'mirror_ghost', 'fragment_shard', 'data_cube', 'glitch_drone'] },
    { maxLevel: 90, pool: ['error_node', 'mirror_ghost', 'warp_bug', 'data_cube', 'fragment_shard'] },
    { maxLevel: 95, pool: ['quark_triplet', 'neutrino_ghost', 'gluon_chain', 'boson_carrier'] },
    { maxLevel: 100, pool: ['neutrino_ghost', 'quark_triplet', 'boson_carrier', 'positron_mirror'] },
    { maxLevel: 105, pool: ['boson_carrier', 'gluon_chain', 'higgs_field', 'neutrino_ghost', 'quark_triplet'] },
    { maxLevel: 110, pool: ['higgs_field', 'boson_carrier', 'positron_mirror', 'gluon_chain', 'quark_triplet'] },
    { maxLevel: 115, pool: ['positron_mirror', 'neutrino_ghost', 'higgs_field', 'boson_carrier', 'gluon_chain'] },
    { maxLevel: Infinity, pool: ['quark_triplet', 'neutrino_ghost', 'boson_carrier', 'higgs_field', 'positron_mirror', 'gluon_chain'] },
];

export function getLevelData(level) {
    const idx = Math.min(level - 1, LEVEL_DATA.length - 1);
    const base = LEVEL_DATA[idx];

    // Generate bonus waves based on level
    const bonusWaves = generateBonusWaves(level);
    const sMult = base.speedMult * getWorldConfig(level).speedFactor;
    return {
        ...base,
        speedMult: sMult,
        waves: [...base.waves, ...bonusWaves]
    };
}

/**
 * Generate extra enemy waves based on level.
 * More waves and tougher compositions at higher levels.
 */
function generateBonusWaves(level) {
    // Use world-relative level so each world feels consistent in length
    const worldCfg = getWorldConfig(level);
    const relLevel = level - worldCfg.offset;

    // Boss every 5 levels within each world (relLevel % 5 === 0)
    const isBoss = relLevel % 5 === 0;

    const bonusCount = isBoss ? Math.floor(relLevel / 10) : Math.floor(relLevel / worldCfg.bonusDivisor) + 1;
    // Clamp to reasonable range
    const maxBonusWaves = worldCfg.maxBonus;
    const count = Math.min(maxBonusWaves, Math.max(1, bonusCount));

    const formations = ['none', 'vee', 'line', 'diamond', 'pincer', 'ring', 'stagger', 'cross', 'arrow'];
    const patterns = ['straight', 'sine', 'zigzag', 'dive', 'circle', 'spiral', 'strafe', 'swoop', 'pendulum',
        'quantum_tunnel', 'wave_function', 'orbital', 'superposition'];

    const pool = POOL_MAP.find(p => level <= p.maxLevel).pool;

    return generateEnemyWaves(count, relLevel, pool, patterns, formations);
}

function generateEnemyWaves(count, relLevel, pool, patterns, formations) {
    const waves = [];
    for (let w = 0; w < count; w++) {
        // Enemy count scales with world-relative level: 3 at L1, up to 6 at endgame
        const enemyCount = Math.min(6, 3 + Math.floor(relLevel / 7) + Math.floor(w / 3));
        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const type = pool[Math.floor(Math.random() * pool.length)];
            const x = 0.1 + (i / (enemyCount - 1 || 1)) * 0.8; // spread 0.1-0.9
            const pat = relLevel > 8 ? patterns[Math.floor(Math.random() * patterns.length)] : patterns[Math.floor(Math.random() * 4)];
            enemies.push(e(type, Number.parseFloat(x.toFixed(2)), pat));
        }
        const formation = formations[Math.floor(Math.random() * formations.length)];
        const delay = w === 0 ? 1.5 : (0.5 + Math.random() * 0.5);
        waves.push(makeWave(enemies, Number.parseFloat(delay.toFixed(1)), formation));
    }
    return waves;
}

export function getTotalLevels() {
    return LEVEL_DATA.length;
}


