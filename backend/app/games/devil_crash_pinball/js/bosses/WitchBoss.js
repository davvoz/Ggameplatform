import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Witch boss — Shadow Witch in Bonus Dungeon.
 * Floats in an elliptical orbit around its center; periodically "blinks"
 * (instant phase-shift to the opposite side of the orbit).
 *
 * Hitbox = circle r=20. Arena = arenaRadius (from JSON).
 * fade (0..1): used by renderer for blink fade-in/out effect.
 */
export class WitchBoss extends Boss {
    constructor(x, y, arenaRadius = 100) {
        super(x, y, C.WITCH_HP, C.BOSS_HIT_SCORE);
        this.cx           = x;
        this.cy           = y;
        this.arenaRadius  = arenaRadius;
        this.radius       = 20;
        this.drawType     = 'witch';
        this._orbitAngle  = 0;
        this._blinkTimer  = 0;
        this._blinkDelay  = 2.4;
        this.fade         = 0;   // starts invisible, fades in during ENTER
    }

    reset() {
        super.reset();
        this.x            = this.cx;
        this.y            = this.cy;
        this._orbitAngle  = 0;
        this._blinkTimer  = 0;
        this.fade         = 0;
    }

    /** Instantly jump to opposite side of orbit ellipse, then fade in. */
    _blink() {
        this._orbitAngle += Math.PI * (1 + Math.random() * 0.5);
        this._blinkTimer  = 0;
        this.fade         = 0;
    }

    _updatePosition() {
        const rx = this.arenaRadius * 0.5;
        const ry = this.arenaRadius * 0.3;
        this.x   = this.cx + Math.cos(this._orbitAngle) * rx;
        this.y   = this.cy + Math.sin(this._orbitAngle) * ry;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        switch (this.state) {
            case S.ENTER:
                this.fade = Math.min(1, this.fade + dt * 3);
                if (this.timer > 0.6) this.state = S.ATTACK;
                break;
            case S.ATTACK:
                this.fade          = Math.min(1, this.fade + dt * 5);
                this._orbitAngle  += dt * 1.15;
                this._blinkTimer  += dt;
                this._updatePosition();
                if (this._blinkTimer >= this._blinkDelay) this._blink();
                break;
            case S.HURT:
                if (this.timer > 0.2) {
                    this._blink();
                    this.state = S.ATTACK;
                }
                break;
            default: break;
        }
    }
}
