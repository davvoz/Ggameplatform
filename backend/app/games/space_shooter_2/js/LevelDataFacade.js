/**
 * LevelData - 30 discrete levels (no randomization)
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

export function getLevelData(level) {
    const idx = Math.min(level - 1, LEVEL_DATA.length - 1);
    const base = LEVEL_DATA[idx];

    // Generate bonus waves based on level
    const bonusWaves = generateBonusWaves(level);
    // World 2 speed damping: reduce inherited speedMult to keep normal difficulty manageable
    // World 3 speed damping: slightly less reduction than W2
    // World 4 speed damping: quantum realm, similar to W3
    const sMult = level > 90 ? base.speedMult * 0.75
        : level > 60 ? base.speedMult * 0.78
            : level > 30 ? base.speedMult * 0.82
                : base.speedMult;
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
    // Boss levels get fewer bonus waves (focus on the boss)
    const w1BossLevels = [5, 10, 15, 20, 25, 30];
    const w2BossLevels = [35, 40, 45, 50, 55, 60];
    const w3BossLevels = [65, 70, 75, 80, 85, 90];
    const w4BossLevels = [95, 100, 105, 110, 115, 120];
    const isBoss = w1BossLevels.includes(level) || w2BossLevels.includes(level) || w3BossLevels.includes(level) || w4BossLevels.includes(level);

    // Use world-relative level so each world feels consistent in length
    const relLevel = level > 90 ? level - 90 : (level > 60 ? level - 60 : (level > 30 ? level - 30 : level));

    const bonusCount = isBoss ? Math.floor(relLevel / 10) : (level > 90
        ? Math.floor(relLevel / 5) + 1   // W4: quantum cadence
        : level > 60
            ? Math.floor(relLevel / 5) + 1   // W3: similar to W2
            : level > 30
                ? Math.floor(relLevel / 5) + 1   // W2: fewer bonus waves
                : Math.floor(relLevel / 3) + 1); // W1: original formula
    // Clamp to reasonable range
    const maxBonusWaves = level > 30 ? 5 : 8;
    const count = Math.min(maxBonusWaves, Math.max(1, bonusCount));

    const formations = ['none', 'vee', 'line', 'diamond', 'pincer', 'ring', 'stagger', 'cross', 'arrow'];
    const patterns = ['straight', 'sine', 'zigzag', 'dive', 'circle', 'spiral', 'strafe', 'swoop', 'pendulum',
        'quantum_tunnel', 'wave_function', 'orbital', 'superposition'];

    // ─── World 1 enemy pools ───
    const earlyTypes = ['scout', 'swarm', 'fighter'];
    const midTypes = ['fighter', 'heavy', 'phantom', 'swarm'];
    const lateTypes = ['fighter', 'heavy', 'phantom', 'sentinel'];
    const endTypes = ['heavy', 'phantom', 'sentinel'];

    // ─── World 2 enemy pools (includes W1 + W2 enemies) ───
    const w2JunglePool = ['stalker', 'jungle_vine', 'nest', 'fighter', 'scout'];
    const w2VolcanicPool = ['stalker', 'lava_golem', 'nest', 'heavy', 'fighter'];
    const w2FrostPool = ['stalker', 'frost_elemental', 'nest', 'sentinel', 'heavy'];
    const w2DesertPool = ['stalker', 'sand_wurm', 'nest', 'phantom', 'sentinel'];
    const w2MechPool = ['stalker', 'mech_drone', 'nest', 'sentinel', 'heavy', 'phantom'];
    const w2ToxicPool = ['stalker', 'toxic_blob', 'nest', 'sentinel', 'phantom', 'mech_drone'];

    // ─── World 3 enemy pools (simulation break) ───
    const w3BootPool = ['glitch_drone', 'data_cube', 'fragment_shard', 'warp_bug'];
    const w3NullPool = ['glitch_drone', 'fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost'];
    const w3BufferPool = ['data_cube', 'fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost'];
    const w3KernelPool = ['fragment_shard', 'warp_bug', 'error_node', 'mirror_ghost', 'data_cube'];
    const w3GhostPool = ['warp_bug', 'error_node', 'mirror_ghost', 'fragment_shard', 'data_cube', 'glitch_drone'];
    const w3FinalPool = ['error_node', 'mirror_ghost', 'warp_bug', 'data_cube', 'fragment_shard'];

    // ─── World 4 enemy pools (quantum realm) ───
    const w4QuarkPool = ['quark_triplet', 'neutrino_ghost', 'gluon_chain', 'boson_carrier'];
    const w4LeptonPool = ['neutrino_ghost', 'quark_triplet', 'boson_carrier', 'positron_mirror'];
    const w4BosonPool = ['boson_carrier', 'gluon_chain', 'higgs_field', 'neutrino_ghost', 'quark_triplet'];
    const w4HiggsPool = ['higgs_field', 'boson_carrier', 'positron_mirror', 'gluon_chain', 'quark_triplet'];
    const w4AntimatterPool = ['positron_mirror', 'neutrino_ghost', 'higgs_field', 'boson_carrier', 'gluon_chain'];
    const w4UnifiedPool = ['quark_triplet', 'neutrino_ghost', 'boson_carrier', 'higgs_field', 'positron_mirror', 'gluon_chain'];

    let pool;
    if (level <= 5) pool = earlyTypes;
    else if (level <= 12) pool = midTypes;
    else if (level <= 22) pool = lateTypes;
    else if (level <= 30) pool = endTypes;
    else if (level <= 35) pool = w2JunglePool;
    else if (level <= 40) pool = w2VolcanicPool;
    else if (level <= 45) pool = w2FrostPool;
    else if (level <= 50) pool = w2DesertPool;
    else if (level <= 55) pool = w2MechPool;
    else if (level <= 60) pool = w2ToxicPool;
    else if (level <= 65) pool = w3BootPool;
    else if (level <= 70) pool = w3NullPool;
    else if (level <= 75) pool = w3BufferPool;
    else if (level <= 80) pool = w3KernelPool;
    else if (level <= 85) pool = w3GhostPool;
    else if (level <= 90) pool = w3FinalPool;
    else if (level <= 95) pool = w4QuarkPool;
    else if (level <= 100) pool = w4LeptonPool;
    else if (level <= 105) pool = w4BosonPool;
    else if (level <= 110) pool = w4HiggsPool;
    else if (level <= 115) pool = w4AntimatterPool;
    else pool = w4UnifiedPool;

    const waves = [];
    for (let w = 0; w < count; w++) {
        // Enemy count scales with world-relative level: 3 at L1, up to 6 at endgame
        const enemyCount = Math.min(6, 3 + Math.floor(relLevel / 7) + Math.floor(w / 3));
        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const type = pool[Math.floor(Math.random() * pool.length)];
            const x = 0.1 + (i / (enemyCount - 1 || 1)) * 0.8; // spread 0.1-0.9
            const pat = relLevel > 8 ? patterns[Math.floor(Math.random() * patterns.length)] : patterns[Math.floor(Math.random() * 4)];
            enemies.push(e(type, parseFloat(x.toFixed(2)), pat));
        }
        const formation = formations[Math.floor(Math.random() * formations.length)];
        const delay = w === 0 ? 1.5 : (0.5 + Math.random() * 0.5);
        waves.push(makeWave(enemies, parseFloat(delay.toFixed(1)), formation));
    }
    return waves;
}

export function getTotalLevels() {
    return LEVEL_DATA.length;
}


