/**
 * ChallengeSession - Run-scoped upgrade progression for Challenge mode.
 *
 * Mirrors the upgrade-facing API that ShopState consumes through Game
 * (getUpgradeLevel / upgradeLevel / isAllUpgradesMaxed / getPlayerStats),
 * but is completely isolated from persistence AND prestige:
 *   - Upgrades live only for the duration of a single run.
 *   - No prestige bonuses are ever applied (fairness).
 *   - Coins are NOT owned here; the spendable wallet stays in Game.coins.
 *
 * reset() is called at the start of every Challenge run, so each run begins
 * with zero upgrades and the player must re-earn power through gameplay.
 */

import {
    computeUpgradeStats,
    computeUpgradeCost,
    areAllUpgradesMaxed,
} from '../systems/UpgradeStats.js';

export class ChallengeSession {
    /** @type {Object<string, number>} upgradeId -> level (run-scoped). */
    #upgrades = {};

    /** Clear all run-scoped upgrades (fresh, fair start). */
    reset() {
        this.#upgrades = {};
    }

    /**
     * Current level of an upgrade in this run.
     * @param {string} upgradeId
     * @returns {number}
     */
    getUpgradeLevel(upgradeId) {
        return this.#upgrades[upgradeId] ?? 0;
    }

    /**
     * Increase an upgrade level by one for this run only.
     * @param {string} upgradeId
     */
    upgradeLevel(upgradeId) {
        this.#upgrades[upgradeId] = this.getUpgradeLevel(upgradeId) + 1;
    }

    /**
     * Coin cost of the next level (Infinity when maxed).
     * @param {string} upgradeId
     * @returns {number}
     */
    getUpgradeCost(upgradeId) {
        return computeUpgradeCost((id) => this.getUpgradeLevel(id), upgradeId);
    }

    /** @returns {boolean} True when every upgrade is maxed in this run. */
    isAllUpgradesMaxed() {
        return areAllUpgradesMaxed((id) => this.getUpgradeLevel(id));
    }

    /**
     * Player stats from run-scoped upgrades only (no prestige).
     * @returns {Object}
     */
    getPlayerStats() {
        return computeUpgradeStats((id) => this.getUpgradeLevel(id));
    }
}
