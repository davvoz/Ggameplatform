import { GameConfig as C } from '../config/GameConfig.js';
import { Collisions } from '../physics/Collisions.js';

/**
 * Static triangular slingshot. Modeled as a single segment with strong outward
 * restitution; on hit fires impulse along its outward normal.
 */
export class Slingshot {
    /**
     * @param {number} ax start x
     * @param {number} ay start y
     * @param {number} bx end x
     * @param {number} by end y
     * @param {number} nx outward normal x (unit)
     * @param {number} ny outward normal y (unit)
     */
    constructor(ax, ay, bx, by, nx, ny) {
        this.ax = ax; this.ay = ay; this.bx = bx; this.by = by;
        this.nx = nx; this.ny = ny;
        this.flash = 0;
        this.score = C.SLING_SCORE;
        this.onHit = null;
    }

    update(dt) { if (this.flash > 0) this.flash = Math.max(0, this.flash - dt); }

    resolve(ball) {
        const hit = Collisions.circleVsSegment(ball, this.ax, this.ay, this.bx, this.by, C.BALL_RESTITUTION_SLING);
        if (!hit) return false;
        // Real slingshot impulse along the outward normal
        ball.vel.x += this.nx * C.SLING_KICK;
        ball.vel.y += this.ny * C.SLING_KICK;
        this.flash = 0.15;
        if (this.onHit) this.onHit(this.score);
        return true;
    }
}
