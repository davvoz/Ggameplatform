import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Score, multiplier and combo manager. Stateless toward sections — just
 * receives addScore() events and tracks decay timers.
 */
export class ScoreManager {
    score = 0;
    highScore = 0;
    multiplier = 1;
    combo = 0;
    comboTimer = 0;
    idleTimer = 0;
    extraBallsAwarded = 0;
    /** @type {(() => void) | null} */
    onExtraBall = null;

    reset() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.idleTimer = 0;
        this.extraBallsAwarded = 0;
    }

    /**
     * Award `base` points scaled by current multiplier, combo bonus and zone multiplier.
     * @param {number} base   - raw point value from the entity that triggered the score
     * @param {number} [zoneMult=1] - height-based zone multiplier (from ZoneMultiplierProvider)
     * @returns {number} actual points added
     */
    add(base, zoneMult = 1) {
        this.combo = Math.min(this.combo + 1, C.COMBO_MAX);
        this.comboTimer = C.COMBO_WINDOW;
        this.idleTimer = 0;
        const comboBonus = 1 + this.combo * 0.1;
        const gained = Math.floor(base * this.multiplier * comboBonus * zoneMult);
        this.score += gained;
        // Extra ball threshold
        const tier = Math.floor(this.score / C.EXTRA_BALL_SCORE_THRESHOLD);
        if (tier > this.extraBallsAwarded) {
            this.extraBallsAwarded = tier;
            if (this.onExtraBall) this.onExtraBall();
        }
        return gained;
    }

    /**
     * Direct multiplier increment (mission/bank reward).
     */
    bumpMultiplier(step = 1) {
        this.multiplier = Math.min(C.MULT_MAX, this.multiplier + step);
        this.idleTimer = 0;
    }

    update(dt) {
        if (this.comboTimer > 0) {
            this.comboTimer = Math.max(0, this.comboTimer - dt);
            if (this.comboTimer === 0) this.combo = 0;
        }
        this.idleTimer += dt;
        if (this.idleTimer >= C.MULT_DECAY_AFTER && this.multiplier > 1) {
            this.multiplier = Math.max(1, this.multiplier - 1);
            this.idleTimer = 0;
        }
        if (this.score > this.highScore) this.highScore = this.score;
    }

    formatted() {
        const s = String(this.score);
        return s.padStart(C.SCORE_DIGITS, '0');
    }
}
