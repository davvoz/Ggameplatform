/**
 * TimeBonusCalculator — Pure computation of time-based medal rewards.
 *
 * Single Responsibility: encapsulates all gold/silver/bronze threshold
 * logic for both level and infinite checkpoint modes.
 */

import { TIME_BONUS } from '../config/Constants.js';

const MEDALS = Object.freeze({
    GOLD:   'gold',
    SILVER: 'silver',
    BRONZE: 'bronze',
    NONE:   'none',
});

export class TimeBonusCalculator {
    /**
     * Compute the time bonus when a level is completed.
     *
     * @param {number} elapsed       — seconds taken to clear the level
     * @param {number} screenCount   — number of screens in the level
     * @returns {{ medal: string, score: number, coins: number }}
     */
    static computeLevel(elapsed, screenCount) {
        const gold   = TIME_BONUS.GOLD_PER_SCREEN   * screenCount;
        const silver = TIME_BONUS.SILVER_PER_SCREEN  * screenCount;
        const bronze = TIME_BONUS.BRONZE_PER_SCREEN  * screenCount;

        if (elapsed <= gold) {
            return {
                medal: MEDALS.GOLD,
                score: Math.round(TIME_BONUS.GOLD_SCORE_PER_SCREEN * screenCount),
                coins: TIME_BONUS.GOLD_COINS_PER_SCREEN * screenCount,
            };
        }
        if (elapsed <= silver) {
            return {
                medal: MEDALS.SILVER,
                score: Math.round(TIME_BONUS.SILVER_SCORE_PER_SCREEN * screenCount),
                coins: TIME_BONUS.SILVER_COINS_PER_SCREEN * screenCount,
            };
        }
        if (elapsed <= bronze) {
            return {
                medal: MEDALS.BRONZE,
                score: Math.round(TIME_BONUS.BRONZE_SCORE_PER_SCREEN * screenCount),
                coins: TIME_BONUS.BRONZE_COINS_PER_SCREEN * screenCount,
            };
        }
        return { medal: MEDALS.NONE, score: 0, coins: 0 };
    }

    /**
     * Compute the checkpoint bonus in infinite mode.
     *
     * @param {number} screenTime    — seconds to clear the checkpoint interval
     * @param {number} interval      — how many screens per checkpoint (e.g. 5)
     * @returns {{ medal: string, score: number, coins: number, color: string }}
     */
    static computeCheckpoint(screenTime, interval) {
        const G = TIME_BONUS.GOLD_PER_SCREEN   * interval;
        const S = TIME_BONUS.SILVER_PER_SCREEN  * interval;
        const B = TIME_BONUS.BRONZE_PER_SCREEN  * interval;

        if (screenTime <= G) {
            return {
                medal: MEDALS.GOLD,
                score: TIME_BONUS.GOLD_SCORE_PER_SCREEN * interval,
                coins: TIME_BONUS.GOLD_COINS_PER_SCREEN * interval,
                color: TIME_BONUS.GOLD_COLOR,
            };
        }
        if (screenTime <= S) {
            return {
                medal: MEDALS.SILVER,
                score: TIME_BONUS.SILVER_SCORE_PER_SCREEN * interval,
                coins: TIME_BONUS.SILVER_COINS_PER_SCREEN * interval,
                color: TIME_BONUS.SILVER_COLOR,
            };
        }
        if (screenTime <= B) {
            return {
                medal: MEDALS.BRONZE,
                score: TIME_BONUS.BRONZE_SCORE_PER_SCREEN * interval,
                coins: TIME_BONUS.BRONZE_COINS_PER_SCREEN * interval,
                color: TIME_BONUS.BRONZE_COLOR,
            };
        }
        return {
            medal: MEDALS.NONE,
            score: 0,
            coins: 0,
            color: TIME_BONUS.NONE_COLOR,
        };
    }

    /**
     * Determine the current medal colour for a running timer.
     *
     * @param {number} elapsed       — seconds elapsed so far
     * @param {number} screenCount   — number of screens for threshold calculation
     * @returns {{ color: string, medal: string }}
     */
    static currentMedalColor(elapsed, screenCount) {
        const gold   = TIME_BONUS.GOLD_PER_SCREEN   * screenCount;
        const silver = TIME_BONUS.SILVER_PER_SCREEN  * screenCount;
        const bronze = TIME_BONUS.BRONZE_PER_SCREEN  * screenCount;

        if (elapsed <= gold)   return { color: TIME_BONUS.GOLD_COLOR,   medal: MEDALS.GOLD };
        if (elapsed <= silver) return { color: TIME_BONUS.SILVER_COLOR, medal: MEDALS.SILVER };
        if (elapsed <= bronze) return { color: TIME_BONUS.BRONZE_COLOR, medal: MEDALS.BRONZE };
        return { color: TIME_BONUS.NONE_COLOR, medal: MEDALS.NONE };
    }

    /**
     * Format seconds into "M:SS" string.
     *
     * @param {number} seconds
     * @returns {string}
     */
    static formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

export { MEDALS };
