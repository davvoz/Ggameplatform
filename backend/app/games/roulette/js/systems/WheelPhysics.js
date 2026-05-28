/**
 * Simulates the spinning wheel + ball with simple deterministic physics.
 *
 * Phases:
 *   1. ACCEL  — ball + wheel reach target speeds (instant on start).
 *   2. SLOW   — exponential decay of both speeds.
 *   3. SETTLE — ball "bounces" through neighbouring pockets before locking.
 *
 * The target landing number is decided at start() (random or forced).
 * The settle phase computes the offset between current ball-relative-to-wheel
 * angle and the target sector angle, then eases it to zero.
 */
export class WheelPhysics {
    /**
     * @param {object} spinConfig  config.json#spin block
     * @param {number[]} wheelOrder data.getWheelOrder()
     */
    constructor(spinConfig, wheelOrder) {
        this._cfg = spinConfig;
        this._order = wheelOrder;
        this._sectorAngle = (2 * Math.PI) / wheelOrder.length;

        this._wheelAngle = 0;
        this._ballAngle  = 0;
        this._ballRadius = 1;     // 1 = at rim, 0 = center
        this._wheelSpeed = 0;
        this._ballSpeed  = 0;
        this._elapsed = 0;
        this._phase = 'idle';
        this._targetIndex = 0;
        this._onBounce = null;
        this._lastBouncePulse = 0;
    }

    /** Optional callback fired when the ball "clicks" into a pocket during settle. */
    setOnBounce(cb) { this._onBounce = cb; }

    start(targetNumber) {
        const idx = this._order.indexOf(targetNumber);
        if (idx < 0) throw new Error(`WheelPhysics: number ${targetNumber} not on wheel`);
        this._targetIndex = idx;
        this._wheelSpeed = this._cfg.wheelStartSpeed;
        this._ballSpeed  = this._cfg.ballStartSpeed;
        this._ballRadius = 1;
        this._elapsed = 0;
        this._phase = 'spin';
        this._lastBouncePulse = 0;
    }

    update(dt) {
        if (this._phase === 'idle' || this._phase === 'done') return;
        this._elapsed += dt;
        if (this._phase === 'spin') {
            this._updateSpin(dt);
            if (this._elapsed >= this._cfg.duration) this._beginSettle();
        } else if (this._phase === 'settle') {
            this._updateSettle(dt);
        }
    }

    _updateSpin(dt) {
        // Exponential decay toward zero.
        const wDecay = Math.exp(-this._cfg.wheelDecay * dt);
        const bDecay = Math.exp(-this._cfg.ballDecay  * dt);
        this._wheelSpeed *= wDecay;
        this._ballSpeed  *= bDecay;
        this._wheelAngle += this._wheelSpeed * dt;
        this._ballAngle  += this._ballSpeed  * dt;
        // Ball drifts inward as it slows (drop track → wheel).
        const t = Math.min(1, this._elapsed / this._cfg.duration);
        this._ballRadius = 1 - 0.18 * t;
    }

    _beginSettle() {
        this._phase = 'settle';
        this._settleStart = this._elapsed;
        // Snap target: compute the ball-to-wheel angle and rotate ball to align
        // with target sector center, plus a small spread we'll ease through.
        const rel = this._ballAngle - this._wheelAngle;
        const targetRel = this._targetIndex * this._sectorAngle;
        // Choose the nearest equivalent (preserve current rotation count).
        const k = Math.round((rel - targetRel) / (2 * Math.PI));
        this._settleFromRel = rel;
        this._settleToRel   = targetRel + k * (2 * Math.PI)
                            + this._cfg.bounceSpread * this._sectorAngle;
    }

    _updateSettle(dt) {
        const elapsed = this._elapsed - this._settleStart;
        const d = this._cfg.settleDuration;
        const t = Math.min(1, elapsed / d);
        const eased = 1 - Math.pow(1 - t, 3);   // cubic easeOut
        // Wheel continues at much-reduced speed.
        this._wheelSpeed *= Math.exp(-this._cfg.wheelDecay * 2 * dt);
        this._wheelAngle += this._wheelSpeed * dt;
        const rel = this._settleFromRel + (this._settleToRel - this._settleFromRel) * eased;
        this._ballAngle = this._wheelAngle + rel;
        // Settle bounces — emit pulse every time we cross a pocket boundary near the end.
        const phasePulse = Math.floor((eased * this._cfg.bounceCount) + 0.5);
        if (phasePulse !== this._lastBouncePulse) {
            this._lastBouncePulse = phasePulse;
            if (this._onBounce) this._onBounce();
        }
        // Ball drops fully to the wheel ring radius.
        this._ballRadius = 0.82 - 0.05 * eased;
        if (t >= 1) this._phase = 'done';
    }

    getBallAngle()  { return this._ballAngle; }
    getWheelAngle() { return this._wheelAngle; }
    getBallRadius() { return this._ballRadius; }
    isSettled()     { return this._phase === 'done'; }
    getPhase()      { return this._phase; }
    getProgress()   {
        if (this._phase === 'spin')   return this._elapsed / this._cfg.duration;
        if (this._phase === 'settle') return Math.min(1, (this._elapsed - this._settleStart) / this._cfg.settleDuration);
        return this._phase === 'done' ? 1 : 0;
    }
}
