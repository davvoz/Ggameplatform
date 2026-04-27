import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Golem boss — Stone Titan in the Void Abyss.
 * Drifts in a slow figure-8 scaled to arenaRadius; orbiting stone chunks.
 * Hitbox = circle r=34. Arena = arenaRadius (from JSON).
 */
export class GolemBoss extends Boss {
    constructor(x, y, arenaRadius = 100) {
        super(x, y, C.GOLEM_HP, C.BOSS_HIT_SCORE);
        this.cx          = x;
        this.cy          = y;
        this.arenaRadius = arenaRadius;
        this.radius      = 34;
        this.drawType    = 'golem';
        this._movT       = 0;
    }

    reset() {
        super.reset();
        this.x     = this.cx;
        this.y     = this.cy;
        this._movT = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        switch (this.state) {
            case S.SLEEP: break;
            case S.ENTER:
                if (this.timer > 0.8) this.state = S.ATTACK;
                break;
            case S.ATTACK: {
                this._movT += dt;
                const s  = this._movT * 0.45;
                const rx = this.arenaRadius * 0.52;
                const ry = this.arenaRadius * 0.22;
                this.x   = this.cx + Math.sin(s) * rx;
                this.y   = this.cy + Math.sin(s * 2) * ry;
                break;
            }
            case S.HURT:
                if (this.timer > 0.3) this.state = S.ATTACK;
                break;
            default: break;
        }
    }
}
