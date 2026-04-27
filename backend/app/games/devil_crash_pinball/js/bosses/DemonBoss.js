import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Demon boss — 3-phase Hell Lord.
 * Orbits elliptically around its center; orbit speed and radius grow per phase.
 * Phase 0: slow tight circle. Phase 1: medium. Phase 2: wide chaotic figure-8.
 *
 * Hitbox = circle at (x,y) radius 28. Arena = arenaRadius (from JSON).
 */
export class DemonBoss extends Boss {
    constructor(x, y, arenaRadius = 110) {
        super(x, y, C.BOSS_PHASE_HP[0], C.BOSS_HIT_SCORE);
        this.cx          = x;
        this.cy          = y;
        this.arenaRadius = arenaRadius;
        this.radius      = 28;
        this.drawType    = 'demon';
        this.phase       = 0;
        this.mouthOpen   = 0;
        this._orbitAngle = 0;
        this.onPhaseClear = null;
    }

    reset() {
        super.reset();
        this.phase        = 0;
        this.hp           = C.BOSS_PHASE_HP[0];
        this.maxHp        = C.BOSS_PHASE_HP[0];
        this.x            = this.cx;
        this.y            = this.cy;
        this._orbitAngle  = 0;
        this.mouthOpen    = 0;
    }

    advancePhase() {
        if (this.phase >= 2) return;
        this.phase++;
        this.hp    = C.BOSS_PHASE_HP[this.phase];
        this.maxHp = this.hp;
        this.state = Boss.STATE.ATTACK;
        if (this.onPhaseClear) this.onPhaseClear(this.phase);
    }

    hit(damage = 1) {
        const dealt = super.hit(damage);
        if (dealt && this.state === Boss.STATE.DEFEATED && this.phase < 2) {
            this.state = Boss.STATE.ATTACK;
            this.advancePhase();
        }
        return dealt;
    }

    stateUpdate(dt) {
        const S     = Boss.STATE;
        const speed = 0.55 + this.phase * 0.3;
        const orbitR = 25 + this.phase * 22;
        switch (this.state) {
            case S.ENTER:
                if (this.timer > 0.6) this.state = S.ATTACK;
                break;
            case S.ATTACK:
                this._orbitAngle += dt * speed;
                if (this.phase < 2) {
                    this.x = this.cx + Math.cos(this._orbitAngle) * orbitR;
                    this.y = this.cy + Math.sin(this._orbitAngle * 0.65) * orbitR * 0.55;
                } else {
                    this.x = this.cx + Math.sin(this._orbitAngle * 1.3) * orbitR;
                    this.y = this.cy + Math.sin(this._orbitAngle * 0.7) * orbitR * 0.8;
                }
                this.mouthOpen = 0.5 + 0.5 * Math.sin(this.timer * (2 + this.phase));
                break;
            case S.HURT:
                if (this.timer > 0.25) this.state = S.ATTACK;
                break;
            default: break;
        }
    }
}
