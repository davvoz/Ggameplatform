import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

const SUB = Object.freeze({ STRIDE: 0, SLAM_CHARGE: 1, SLAM: 2, SHOCKWAVE: 3, RECOVER: 4 });

const STRIDE_TIME      = 1.6;
const SLAM_CHARGE_TIME = 0.65;
const SLAM_TIME        = 0.14;
const SHOCKWAVE_TIME   = 0.7;
const SHOCKWAVE_GROW   = 260;
const RECOVER_TIME     = 0.45;
const STRIDE_SPEED     = 1.1;     // walk-cycle phase rate
const STRIDE_AMP_X     = 0.55;    // fraction of arenaRadius
const STRIDE_AMP_Y     = 0.18;

/**
 * Golem Boss — "Ancient Stone Sentinel".
 *
 * Massive humanoid stone titan. Cycles STRIDE → SLAM_CHARGE → SLAM
 * → SHOCKWAVE → RECOVER. Alternates which arm slams (`slamArm` ±1).
 *
 * As HP drops, `damageStage` (0 → 2) progresses, signalling the
 * renderer to show progressive structural damage (cracks, missing
 * armour chunks, exposed glowing core).
 *
 * Renderer reads: walkPhase, slamArm, slamCharge, slamWaveR,
 * slamWaveAlpha, damageStage, eyeIntensity, _sub.
 */
export class GolemBoss extends Boss {
    constructor(x, y, arenaRadius = 100) {
        super(x, y, C.GOLEM_HP, C.BOSS_HIT_SCORE);
        this.cx          = x;
        this.cy          = y;
        this.arenaRadius = arenaRadius;
        this.radius      = 36;
        this.drawType    = 'golem';

        this.walkPhase     = 0;
        this.slamArm       = 1;       // +1 right, -1 left
        this.slamCharge    = 0;
        this.slamWaveR     = 0;
        this.slamWaveAlpha = 0;
        this.slamX         = x;
        this.slamY         = y;
        this.eyeIntensity  = 0.6;
        this.damageStage   = 0;

        this._sub        = SUB.STRIDE;
        this._subTimer   = 0;
        this._cycleCount = 0;
    }

    reset() {
        super.reset();
        this.x             = this.cx;
        this.y             = this.cy;
        this.walkPhase     = 0;
        this.slamArm       = 1;
        this.slamCharge    = 0;
        this.slamWaveR     = 0;
        this.slamWaveAlpha = 0;
        this.eyeIntensity  = 0.6;
        this.damageStage   = 0;
        this._sub          = SUB.STRIDE;
        this._subTimer     = 0;
        this._cycleCount   = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        if (this.state === S.SLEEP || this.state === S.DEFEATED) return;

        this._tickRig(dt);

        switch (this.state) {
            case S.ENTER:
                if (this.timer > 0.8) { this.state = S.ATTACK; this._sub = SUB.STRIDE; this._subTimer = 0; }
                break;
            case S.ATTACK: this._tickSubFSM(dt); break;
            case S.HURT:
                if (this.timer > 0.28) this.state = S.ATTACK;
                break;
            default: break;
        }
    }

    /** @private — HP-driven damage stage + eye flicker + shockwave decay. */
    _tickRig(dt) {
        const hpRatio = this.maxHp ? this.hp / this.maxHp : 1;
        // 0 above 66%, 1 in [33%,66%], 2 below 33%
        let stage = 0;
        if (hpRatio < 0.66) stage = 1;
        if (hpRatio < 0.33) stage = 2;
        this.damageStage = stage;

        // Eye intensity flickers harder when damaged
        const flickerAmp = 0.15 + stage * 0.18;
        this.eyeIntensity = 0.55 + flickerAmp * Math.sin(this._cycleCount * 5 + this._subTimer * 12);

        if (this.slamWaveAlpha > 0) {
            this.slamWaveR    += SHOCKWAVE_GROW * dt;
            this.slamWaveAlpha = Math.max(0, this.slamWaveAlpha - dt / SHOCKWAVE_TIME);
        }
    }

    /** @private */
    _tickSubFSM(dt) {
        this._subTimer += dt;
        switch (this._sub) {
            case SUB.STRIDE:      this._tickStride(dt);      break;
            case SUB.SLAM_CHARGE: this._tickSlamCharge(dt);  break;
            case SUB.SLAM:        this._tickSlam(dt);        break;
            case SUB.SHOCKWAVE:   this._tickShockwave(dt);   break;
            case SUB.RECOVER:     this._tickRecover(dt);     break;
            default: break;
        }
    }

    /** @private */
    _enterSub(sub) {
        this._sub      = sub;
        this._subTimer = 0;
        if (sub === SUB.SLAM_CHARGE) {
            this.slamArm = -this.slamArm; // alternate
        }
        if (sub === SUB.SHOCKWAVE) {
            this.slamX         = this.x + this.slamArm * this.radius * 0.7;
            this.slamY         = this.y + this.radius * 0.4;
            this.slamWaveR     = 0;
            this.slamWaveAlpha = 1;
        }
    }

    /** @private — heavy walk along an arc; walkPhase drives leg sway. */
    _tickStride(dt) {
        this.walkPhase += dt * STRIDE_SPEED;
        const rx = this.arenaRadius * STRIDE_AMP_X;
        const ry = this.arenaRadius * STRIDE_AMP_Y;
        this.x = this.cx + Math.sin(this.walkPhase) * rx;
        this.y = this.cy + Math.abs(Math.sin(this.walkPhase * 2)) * ry;
        this.slamCharge = Math.max(0, this.slamCharge - dt * 4);
        if (this._subTimer >= STRIDE_TIME) this._enterSub(SUB.SLAM_CHARGE);
    }

    /** @private — anchor, raise the active arm overhead, telegraph glow. */
    _tickSlamCharge(dt) {
        const k = Math.min(1, this._subTimer / SLAM_CHARGE_TIME);
        this.slamCharge = k;
        // tiny anticipation hop
        this.y -= dt * 14 * (1 - k);
        if (this._subTimer >= SLAM_CHARGE_TIME) this._enterSub(SUB.SLAM);
    }

    /** @private — bring fist down: slamCharge collapses to 0. */
    _tickSlam(_dt) {
        this.slamCharge = Math.max(0, 1 - this._subTimer / SLAM_TIME);
        if (this._subTimer >= SLAM_TIME) this._enterSub(SUB.SHOCKWAVE);
    }

    /** @private — emit ground shockwave, brief pause. */
    _tickShockwave(_dt) {
        this.slamCharge = 0;
        if (this._subTimer >= 0.18) this._enterSub(SUB.RECOVER);
    }

    /** @private */
    _tickRecover(_dt) {
        this.slamCharge = 0;
        if (this._subTimer >= RECOVER_TIME) {
            this._cycleCount++;
            this._enterSub(SUB.STRIDE);
        }
    }
}
