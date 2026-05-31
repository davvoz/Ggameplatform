/**
 * UpgradeStats - Pure, prestige-agnostic upgrade math.
 *
 * Single source of truth for translating upgrade levels into player stats,
 * costs and the "all maxed" check. Shared by SaveManager (persistent, then
 * patched with prestige) and ChallengeSession (run-scoped, no prestige).
 *
 * All functions are pure: they receive a `getLevel(id) -> number` accessor
 * and never touch persistence, so they work for any progression backend.
 */

import { UPGRADE_CATALOG } from '../config/Constants.js';

/**
 * Total effect value of an upgrade for the given level accessor.
 * @param {(id: string) => number} getLevel - Current level accessor.
 * @param {string} upgradeId
 * @returns {number}
 */
export function upgradeEffect(getLevel, upgradeId) {
    const upgrade = UPGRADE_CATALOG[upgradeId];
    if (!upgrade) return 0;
    return upgrade.effectPerLevel * getLevel(upgradeId);
}

/**
 * Base (prestige-free) player stats derived purely from upgrade levels.
 * Callers that need prestige bonuses patch the returned object afterwards.
 * @param {(id: string) => number} getLevel - Current level accessor.
 * @returns {Object} Mutable stats object.
 */
export function computeUpgradeStats(getLevel) {
    const eff = (id) => upgradeEffect(getLevel, id);
    const has = (id) => getLevel(id) > 0;
    return {
        jumpMultiplier:  1 + eff('jump_power'),
        ghostRepelLevel: getLevel('ghost_repel'),
        hasDoubleJump:   has('double_jump'),
        hasGlide:        has('glide'),
        dashCount:       getLevel('dash'),
        stompMultiplier: 1 + eff('stomp_power'),
        hasShockwave:    has('shockwave'),
        knockbackResist: eff('thick_skin'),
        extraLives:      getLevel('extra_life'),
        magnetRange:     eff('coin_magnet_range'),
        coinMultiplier:  1 + eff('coin_value'),
        powerupDuration: 1 + eff('powerup_duration'),
        luckySpawn:      eff('lucky_spawn'),
        scoreMultiplier: 1 + eff('score_multiplier'),
        comboKeeper:     1 + eff('combo_keeper'),
        spikeCount:      getLevel('spike_head'),
    };
}

/**
 * Coin cost of the NEXT level of an upgrade. Returns Infinity when maxed.
 * @param {(id: string) => number} getLevel - Current level accessor.
 * @param {string} upgradeId
 * @returns {number}
 */
export function computeUpgradeCost(getLevel, upgradeId) {
    const upgrade = UPGRADE_CATALOG[upgradeId];
    if (!upgrade) return Infinity;
    const level = getLevel(upgradeId);
    if (level >= upgrade.maxLevel) return Infinity;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
}

/**
 * True when every upgrade in the catalog is at its max level.
 * @param {(id: string) => number} getLevel - Current level accessor.
 * @returns {boolean}
 */
export function areAllUpgradesMaxed(getLevel) {
    return Object.values(UPGRADE_CATALOG).every(u => getLevel(u.id) >= u.maxLevel);
}
