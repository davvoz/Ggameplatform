import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

const SUB = Object.freeze({ HOVER: 0, SMITE_CHARGE: 1, SMITE: 2, RECOVER: 3 });

const HOVER_TIME       = 1.4;     // base hover duration before next smite
const HOVER_TIME_P2    = 0.85;    // shorter at phase 2
const CHARGE_TIME      = 0.7;     // wind-up before smite
const SMITE_TIME       = 0.18;    // brief impact moment
const RECOVER_TIME     = 0.5;
const SHOCKWAVE_GROW   = 320;     // px/s expansion of impact ring
const SHOCKWAVE_LIFE   = 0.85;    // seconds visible
const WIND_LIFE        = 0.7;     // seconds the smite gust pushes the ball
const WIND_BASE_PUSH   = 520;     // px/s² peak radial acceleration on the ball
const WIND_FALLOFF_K   = 1.7;     // outer reach multiplier of arenaRadius

/**
 * Demon Boss — "Hell Lord Baal".
 *
 * 3-phase fight. Each phase increases wing spread, body intensity,
 * orbit speed, and unlocks faster smite cycles.
 *
 * Behaviour cycles HOVER → SMITE_CHARGE → SMITE → RECOVER, with
 * the SMITE producing an expanding shockwave ring (`shockwaveR`)
 * the renderer draws over the arena.
 *
 * Renderer reads: phase, wingSpread, armRaise, smiteCharge,
 * shockwaveR, shockwaveAlpha, corePulse, jawOpen, windStrength, _sub.
 *
 * Physics hook: applyWindToBall(ball, dt) is called each substep by
 * Section.resolve. While windStrength > 0 the ball receives a radial
 * push away from the smite impact point, decaying with time + distance.
 */
export class DemonBoss extends Boss {
    constructor(x, y, arenaRadius = 110) {
        super(x, y, DemonBoss._totalHp(), C.BOSS_HIT_SCORE);
        this.cx           = x;
        this.cy           = y;
        this.arenaRadius  = arenaRadius;
        this.radius       = 22;
        this.drawType     = 'demon';
        this.phase        = 0;

        this.wingSpread     = 0.35;
        this.armRaise       = 0;
        this.smiteCharge    = 0;
        this.shockwaveR     = 0;
        this.shockwaveAlpha = 0;
        this.windStrength   = 0;
        this.corePulse      = 0;
        this.jawOpen        = 0;
        this.mouthOpen      = 0;        // legacy alias

        this._sub        = SUB.HOVER;
        this._subTimer   = 0;
        this._orbitAngle = 0;
        this._smiteX     = x;
        this._smiteY     = y;
    }

    /** @private — sum of phase HPs gives single life pool. */
    static _totalHp() {
        return C.BOSS_PHASE_HP.reduce((acc, v) => acc + v, 0);
    }

    reset() {
        super.reset();
        this.phase          = 0;
        this.hp             = DemonBoss._totalHp();
        this.maxHp          = this.hp;
        this.x              = this.cx;
        this.y              = this.cy;
        this.wingSpread     = 0.35;
        this.armRaise       = 0;
        this.smiteCharge    = 0;
        this.shockwaveR     = 0;
        this.shockwaveAlpha = 0;
        this.windStrength   = 0;
        this.corePulse      = 0;
        this.jawOpen        = 0;
        this.mouthOpen      = 0;
        this._sub           = SUB.HOVER;
        this._subTimer      = 0;
        this._orbitAngle    = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        this._tickRig(dt);

        switch (this.state) {
            case S.SLEEP: break;
            case S.ENTER:
                if (this.timer > 0.6) { this.state = S.ATTACK; this._sub = SUB.HOVER; this._subTimer = 0; }
                break;
            case S.ATTACK: this._tickSubFSM(dt); break;
            case S.HURT:
                if (this.timer > 0.22) this.state = S.ATTACK;
                break;
            default: break;
        }

        // Mirror legacy field
        this.mouthOpen = this.jawOpen;
    }

    /** @private — slow rig animation: wings, core pulse, shockwave decay. */
    _tickRig(dt) {
        // Phase is purely cosmetic now: derived from remaining HP ratio.
        const hpRatio = this.maxHp ? this.hp / this.maxHp : 1;
        if (hpRatio > 2 / 3)      this.phase = 0;
        else if (hpRatio > 1 / 3) this.phase = 1;
        else                      this.phase = 2;

        // Wings open progressively per phase (0.35 → 0.6 → 0.85)
        const wingTarget = 0.35 + this.phase * 0.25;
        this.wingSpread += (wingTarget - this.wingSpread) * Math.min(1, dt * 3);

        // Core pulses with HP urgency (faster as HP drops)
        this.corePulse += dt * (2.4 + (1 - hpRatio) * 4);

        // Shockwave ring expansion + fade
        if (this.shockwaveAlpha > 0) {
            this.shockwaveR    += SHOCKWAVE_GROW * dt;
            this.shockwaveAlpha = Math.max(0, this.shockwaveAlpha - dt / SHOCKWAVE_LIFE);
        }

        // Wind gust decays independently of the visual shockwave so the
        // physics push lasts a slightly different window than the ring.
        if (this.windStrength > 0) {
            this.windStrength = Math.max(0, this.windStrength - dt / WIND_LIFE);
        }
    }

    /** @private */
    _tickSubFSM(dt) {
        switch (this._sub) {
            case SUB.HOVER:        this._tickHover(dt);   break;
            case SUB.SMITE_CHARGE: this._tickCharge(dt);  break;
            case SUB.SMITE:        this._tickSmite(dt);   break;
            case SUB.RECOVER:      this._tickRecover(dt); break;
            default: break;
        }
    }

    /** @private */
    _enterSub(sub) {
        this._sub      = sub;
        this._subTimer = 0;
        if (sub === SUB.SMITE) {
            this._smiteX        = this.x;
            this._smiteY        = this.y + this.radius * 0.5;
            this.shockwaveR     = 0;
            this.shockwaveAlpha = 1;
            this.windStrength   = 1;
        }
    }

    /**
     * Apply the smite gust to a ball. Called by Section every physics substep.
     * Pushes the ball radially away from the impact point with a force that
     * decays with windStrength and falls off with distance. Phase 2 is stronger.
     * @param {{pos:{x:number,y:number}, vel:{x:number,y:number}}} ball
     * @param {number} dt substep delta-time in seconds
     */
    applyWindToBall(ball, dt) {
        if (this.windStrength <= 0 || !ball || dt <= 0) return;
        const dx   = ball.pos.x - this._smiteX;
        const dy   = ball.pos.y - this._smiteY;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.001) return;
        const reach = this.arenaRadius * WIND_FALLOFF_K;
        if (dist >= reach) return;
        const falloff   = 1 - (dist / reach);                  // 1 at center, 0 at reach
        const phaseMul  = 1 + this.phase * 0.35;
        const accel     = WIND_BASE_PUSH * this.windStrength * falloff * phaseMul;
        const inv       = 1 / dist;
        ball.vel.x += dx * inv * accel * dt;
        ball.vel.y += dy * inv * accel * dt;
    }

    /** @private — elliptical orbit + jaw breathing; ends with a charge. */
    _tickHover(dt) {
        this._subTimer += dt;
        const phaseSpeed = 0.7 + this.phase * 0.4;
        this._orbitAngle += dt * phaseSpeed;
        const orbitR = 22 + this.phase * 18;
        if (this.phase < 2) {
            this.x = this.cx + Math.cos(this._orbitAngle) * orbitR;
            this.y = this.cy + Math.sin(this._orbitAngle * 0.7) * orbitR * 0.55;
        } else {
            this.x = this.cx + Math.sin(this._orbitAngle * 1.3) * orbitR;
            this.y = this.cy + Math.sin(this._orbitAngle * 0.8) * orbitR * 0.8;
        }
        this.jawOpen   = 0.3 + 0.25 * Math.sin(this._subTimer * (2 + this.phase));
        this.armRaise  = Math.max(0, this.armRaise - dt * 3);

        const limit = this.phase >= 2 ? HOVER_TIME_P2 : HOVER_TIME;
        if (this._subTimer >= limit) this._enterSub(SUB.SMITE_CHARGE);
    }

    /** @private — anchored, arms raised, smiteCharge ramps to 1. */
    _tickCharge(dt) {
        this._subTimer += dt;
        const k = Math.min(1, this._subTimer / CHARGE_TIME);
        this.smiteCharge = k;
        this.armRaise    = k;
        this.jawOpen     = 0.6 + 0.4 * k;
        if (this._subTimer >= CHARGE_TIME) this._enterSub(SUB.SMITE);
    }

    /** @private — instant impact: arms slam down, shockwave triggered. */
    _tickSmite(dt) {
        this._subTimer += dt;
        this.armRaise    = Math.max(0, 1 - this._subTimer / SMITE_TIME);
        this.jawOpen     = 1;
        this.smiteCharge = 0;
        if (this._subTimer >= SMITE_TIME) this._enterSub(SUB.RECOVER);
    }

    /** @private — short pause, jaw closes, before resuming hover. */
    _tickRecover(dt) {
        this._subTimer += dt;
        this.jawOpen = Math.max(0.3, this.jawOpen - dt * 3);
        this.armRaise = 0;
        if (this._subTimer >= RECOVER_TIME) this._enterSub(SUB.HOVER);
    }
}
