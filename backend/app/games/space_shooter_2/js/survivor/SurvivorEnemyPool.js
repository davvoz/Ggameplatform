/**
 * SurvivorEnemyPool — Resolves an enemy-type pool by phase index (0..3).
 *
 * Pure data + lookup module — no game-object imports.
 */

const PHASE_POOLS = [
    // Phase 0 — W1 staples
    [
        'scout', 'swarm', 'fighter', 'heavy', 'phantom'
    ],
    // Phase 1 — W2 mix with leftover W1
    [
        'stalker', 'jungle_vine', 'lava_golem', 'sand_wurm', 'mech_drone',
        'fighter', 'heavy', 'phantom'
    ],
    // Phase 2 — W3 mix with leftover W2
    [
        'glitch_drone', 'data_cube', 'fragment_shard', 'warp_bug', 'mirror_ghost',
        'stalker', 'frost_elemental', 'sentinel'
    ],
    // Phase 3 — W4 apex with hybrids
    [
        'quark_triplet', 'neutrino_ghost', 'boson_carrier',
        'higgs_field', 'positron_mirror', 'gluon_chain',
        'mirror_ghost', 'sentinel'
    ]
];

/**
 * Return the active enemy-name pool for a phase index.
 * @param {number} phaseIndex 0..3 (clamped)
 */
export function getSurvivorPool(phaseIndex) {
    const idx = Math.max(0, Math.min(PHASE_POOLS.length - 1, phaseIndex));
    return PHASE_POOLS[idx];
}

/**
 * Pick one random enemy type from the active phase pool.
 * @param {number} phaseIndex
 */
export function pickSurvivorEnemy(phaseIndex) {
    const pool = getSurvivorPool(phaseIndex);
    return pool[Math.floor(Math.random() * pool.length)];
}
