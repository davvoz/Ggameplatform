import { Boss } from './Boss.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Dragon mini-boss in Upper Table.
 * Slithers horizontally with a serpentine body; head is the hitbox.
 */
export class DragonBoss extends Boss {
    constructor(centerX, centerY, range = 100) {
        super(centerX, centerY, C.DRAGON_HP, C.BOSS_HIT_SCORE);
        this.cx     = centerX;
        this.cy     = centerY;
        this.range  = range;
        this.radius = 22;
        /** Renderer uses this to select the dragon-specific draw path. */
        this.drawType = 'dragon';
        /**
         * Continuous movement accumulator.
         * Never reset on hit so the dragon never teleports when hurt.
         */
        this._movT = 0;
    }

    reset() {
        super.reset();
        this.x = this.cx;
        this.y = this.cy;
        this._movT = 0;
    }

    stateUpdate(dt) {
        const S = Boss.STATE;
        // Advance movement clock every active frame (independent of hit/hurt)
        if (this.state !== S.SLEEP && this.state !== S.DEFEATED) {
            this._movT += dt;
        }
        switch (this.state) {
            case S.SLEEP: break;
            case S.ENTER:
                if (this.timer > 0.4) this.state = S.ATTACK;
                break;
            case S.ATTACK:
            case S.HURT:
                // Use _movT so position is continuous across hit resets
                this.x = this.cx + Math.sin(this._movT * 1.6) * this.range;
                this.y = this.cy + Math.cos(this._movT * 0.9) * 18;
                if (this.state === S.HURT && this.timer > 0.2) this.state = S.ATTACK;
                break;
            default: break;
        }
    }
}
