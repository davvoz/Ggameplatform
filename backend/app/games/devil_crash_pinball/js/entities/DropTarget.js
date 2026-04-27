import { GameConfig as C } from '../config/GameConfig.js';
import { Collisions } from '../physics/Collisions.js';

/** Duration of the pop-up respawn animation in seconds. */
const RESPAWN_ANIM_DUR = 0.35;

/**
 * Drop target. Standing -> blocks ball. Hit -> drops, awards score.
 * Respawns with an animated pop-up when beginRespawn() is called.
 */
export class DropTarget {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = C.TARGET_WIDTH;
        this.h = C.TARGET_HEIGHT;
        this.standing    = true;
        this.flash       = 0;
        this.onHit       = null;
        /** True while the respawn animation is in progress. */
        this.respawning        = false;
        this._respawnDelayLeft = 0;
        this._respawnAnimT     = 0;   // 0..1 progress of pop-up
    }

    /** 0..1 progress of the pop-up animation (0 = flat, 1 = fully risen). */
    get respawnProgress() { return this._respawnAnimT; }

    /**
     * Trigger an animated respawn after an optional delay.
     * @param {number} delay  seconds to wait before animation starts
     */
    beginRespawn(delay = 0) {
        this.standing          = false;
        this.respawning        = true;
        this._respawnDelayLeft = delay;
        this._respawnAnimT     = 0;
    }

    reset() { this.standing = true; this.respawning = false; }

    update(dt) {
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
        if (!this.respawning) return;
        if (this._respawnDelayLeft > 0) {
            this._respawnDelayLeft = Math.max(0, this._respawnDelayLeft - dt);
            return;
        }
        this._respawnAnimT = Math.min(1, this._respawnAnimT + dt / RESPAWN_ANIM_DUR);
        if (this._respawnAnimT >= 1) {
            this.standing   = true;
            this.respawning = false;
            this.flash      = 0.35;
        }
    }

    resolve(ball) {
        if (!this.standing) return false;
        const hit = Collisions.circleVsRect(ball, this.x, this.y, this.w, this.h, C.BALL_RESTITUTION_TARGET);
        if (!hit) return false;
        this.standing = false;
        this.flash = 0.2;
        if (this.onHit) this.onHit(C.TARGET_SCORE);
        return true;
    }
}
