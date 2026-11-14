import { COMBO } from '../config/Tuning.js';

/**
 * Score and combo. Every hit keeps the combo alive, every few hits raise the
 * multiplier; a missed tap, a wound or a pause too long breaks it.
 */
export class ScoreKeeper {
    score = 0;
    combo = 0;
    bestCombo = 0;
    comboTimer = 0;
    kills = 0;
    shotsDown = 0;
    misses = 0;
    invadersSlain = 0;
    criticals = 0;

    get multiplier() {
        return Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.combo / COMBO.hitsPerStep));
    }

    /** A bolt found its mark. @returns {boolean} true when the multiplier went up */
    hit() {
        const before = this.multiplier;
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.comboTimer = COMBO.window;
        return this.multiplier > before;
    }

    /** @returns {boolean} true when a combo was lost */
    breakCombo() {
        const had = this.combo > 0;
        this.combo = 0;
        this.comboTimer = 0;
        return had;
    }

    miss() {
        this.misses += 1;
        return this.breakCombo();
    }

    /** Points that grow with the multiplier. @returns {number} the points given */
    award(points) {
        const given = points * this.multiplier;
        this.score += given;
        return given;
    }

    /** Points that don't. */
    bonus(points) {
        this.score += points;
        return points;
    }

    /** @returns {boolean} true when the combo just cooled down */
    update(dt) {
        if (this.combo === 0) return false;
        this.comboTimer -= dt;
        return this.comboTimer <= 0 && this.breakCombo();
    }
}
