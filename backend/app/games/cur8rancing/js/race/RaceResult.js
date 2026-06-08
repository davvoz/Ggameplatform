import { GameConfig } from '../config/GameConfig.js';

/**
 * Immutable outcome of a race from the player's point of view. Knows how to
 * derive the platform score from the finishing position and time.
 */
export class RaceResult {
    /**
     * @param {object} data
     * @param {number} data.position   1-based finishing position
     * @param {number} data.totalCars
     * @param {number} data.timeSeconds total race time
     * @param {number} data.bestLapSeconds best lap time
     * @param {number} data.laps        laps completed
     */
    constructor(data) {
        this.position = data.position;
        this.totalCars = data.totalCars;
        this.timeSeconds = data.timeSeconds;
        this.bestLapSeconds = data.bestLapSeconds;
        this.laps = data.laps;
        this.won = data.position === 1;
        Object.freeze(this);
    }

    /**
     * Platform score: position points plus a time bonus.
     * @returns {number}
     */
    computeScore() {
        const points = GameConfig.SCORE.POSITION_POINTS;
        const base = points.at(this.position - 1) ?? points.at(-1);
        const bonus = Math.max(0, GameConfig.SCORE.TIME_BONUS_CAP - this.timeSeconds);
        return Math.round(base + bonus);
    }

    /**
     * Achievement keys to forward to the platform.
     * @returns {string[]}
     */
    achievements() {
        return this.won ? ['first_place'] : [];
    }
}
