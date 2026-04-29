import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

const SUB = Object.freeze({ FLOAT: 0, CAST_CHARGE: 1, CAST_BURST: 2, BLINK_OUT: 3, BLINK_IN: 4 });

const FLOAT_TIME       = 1.6;
const CAST_CHARGE_TIME = 0.8;
const CAST_BURST_TIME  = 0.45;
const BLINK_OUT_TIME   = 0.22;
const BLINK_IN_TIME    = 0.28;
const ORBIT_SPEED      = 1.2;
const CAST_EVERY       = 2;     // cast spell every N float cycles, otherwise blink

/**
 * Witch Boss — "Shadow Hexenmeister".
 *
 * Floating sorceress with flowing robes, pointed hat, and four orbital
 * elemental orbs. Cycles FLOAT → (CAST_CHARGE → CAST_BURST | BLINK).
 *
 * Cast: raises hand, runeRing grows, then orbs explode outward (visual).
 * Blink: instant teleport with fade-out / fade-in.
 *
 * Renderer reads: castCharge (0..1), runeRing (0..1), handRaise (0..1),
 * cloakPhase, grimoireGlow, orbBurst (0..1), fade (0..1), _sub.
 */
export class WitchBoss extends Boss {
    constructor(x, y, arenaRadius = 100) {
        super(x, y, C.WITCH_HP, C.BOSS_HIT_SCORE);
        this.cx           = x;
        this.cy           = y;
        this.arenaRadius  = arenaRadius;
        this.radius       = 22;
        this.drawType     = 'witch';

        this.castCharge   = 0;
        this.runeRing     = 0;
        this.handRaise    = 0;
        this.cloakPhase   = 0;
        this.grimoireGlow = 0.4;
        this.orbBurst     = 0;
        this.fade         = 0;

        this._sub        = SUB.FLOAT;
        this._subTimer   = 0;
        this._orbitAngle = 0;
        this._cycleCount = 0;
    }

    reset() {
        super.reset();
        this.x            = this.cx;
        this.y            = this.cy;
        this.castCharge   = 0;
        this.runeRing     = 0;
        this.handRaise    = 0;
        this.cloakPhase   = 0;
        this.grimoireGlow = 0.4;
        this.orbBurst     = 0;
        this.fade         = 0;
        this._sub         = SUB.FLOAT;
        this._subTimer    = 0;
        this._orbitAngle  = 0;
        this._cycleCount  = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        if (this.state === S.SLEEP || this.state === S.DEFEATED) return;

        this.cloakPhase   += dt * 1.6;
        this.grimoireGlow  = 0.4 + 0.3 * Math.sin(this._subTimer * 4 + this._cycleCount);

        switch (this.state) {
            case S.ENTER:
                this.fade = Math.min(1, this.fade + dt * 3);
                if (this.timer > 0.6) { this.state = S.ATTACK; this._sub = SUB.FLOAT; this._subTimer = 0; }
                break;
            case S.ATTACK: this._tickSubFSM(dt); break;
            case S.HURT:
                this.fade = Math.max(0.55, this.fade);
                if (this.timer > 0.18) { this._enterSub(SUB.BLINK_OUT); this.state = S.ATTACK; }
                break;
            default: break;
        }
    }

    /** @private */
    _tickSubFSM(dt) {
        this._subTimer += dt;
        switch (this._sub) {
            case SUB.FLOAT:       this._tickFloat(dt);      break;
            case SUB.CAST_CHARGE: this._tickCastCharge(dt); break;
            case SUB.CAST_BURST:  this._tickCastBurst(dt);  break;
            case SUB.BLINK_OUT:   this._tickBlinkOut(dt);   break;
            case SUB.BLINK_IN:    this._tickBlinkIn(dt);    break;
            default: break;
        }
    }

    /** @private */
    _enterSub(sub) {
        this._sub      = sub;
        this._subTimer = 0;
        if (sub === SUB.BLINK_IN) {
            // Teleport to a new orbit position on the opposite side
            this._orbitAngle += Math.PI * (1 + Math.random() * 0.5);
            this._updateOrbitPos();
        }
    }

    /** @private — gentle elliptical orbit, fade fully visible. */
    _tickFloat(dt) {
        this.fade = Math.min(1, this.fade + dt * 4);
        this._orbitAngle += dt * ORBIT_SPEED;
        this._updateOrbitPos();
        this.castCharge = Math.max(0, this.castCharge - dt * 3);
        this.handRaise  = Math.max(0, this.handRaise  - dt * 3);
        this.runeRing   = Math.max(0, this.runeRing   - dt * 3);
        this.orbBurst   = Math.max(0, this.orbBurst   - dt * 2);

        if (this._subTimer >= FLOAT_TIME) {
            this._cycleCount++;
            this._enterSub(this._cycleCount % CAST_EVERY === 0 ? SUB.BLINK_OUT : SUB.CAST_CHARGE);
        }
    }

    /** @private — anchor, raise hand, build rune ring under feet. */
    _tickCastCharge(dt) {
        const k = Math.min(1, this._subTimer / CAST_CHARGE_TIME);
        this.castCharge = k;
        this.handRaise  = k;
        this.runeRing   = k;
        // very small lift while charging
        this.y -= dt * 6 * (1 - k);
        if (this._subTimer >= CAST_CHARGE_TIME) this._enterSub(SUB.CAST_BURST);
    }

    /** @private — orbs explode outward, runeRing flashes, recoil. */
    _tickCastBurst(dt) {
        this.orbBurst   = Math.min(1, this.orbBurst + dt / CAST_BURST_TIME);
        this.castCharge = Math.max(0, 1 - this._subTimer / CAST_BURST_TIME);
        this.handRaise  = Math.max(0, this.handRaise - dt * 2);
        if (this._subTimer >= CAST_BURST_TIME) this._enterSub(SUB.FLOAT);
    }

    /** @private */
    _tickBlinkOut(dt) {
        this.fade = Math.max(0, this.fade - dt / BLINK_OUT_TIME);
        if (this._subTimer >= BLINK_OUT_TIME) this._enterSub(SUB.BLINK_IN);
    }

    /** @private */
    _tickBlinkIn(dt) {
        this.fade = Math.min(1, this.fade + dt / BLINK_IN_TIME);
        if (this._subTimer >= BLINK_IN_TIME) this._enterSub(SUB.FLOAT);
    }

    /** @private */
    _updateOrbitPos() {
        const rx = this.arenaRadius * 0.5;
        const ry = this.arenaRadius * 0.3;
        this.x = this.cx + Math.cos(this._orbitAngle) * rx;
        this.y = this.cy + Math.sin(this._orbitAngle) * ry;
    }
}
