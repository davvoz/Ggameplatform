import { GameConfig as C } from '../config/GameConfig.js';
import { Collisions } from '../physics/Collisions.js';

/**
 * Active circular bumper. On hit: kicks ball outward (extra restitution),
 * scores, lights up briefly, fires onHit(score).
 */
export class Bumper {
    constructor(x, y, score = C.BUMPER_SCORE, radius = C.BUMPER_RADIUS) {
        this.x = x;
        this.y = y;
        this.r = radius;
        this.score = score;
        this.flash = 0;          // seconds remaining of flash effect
        this._hitCooldown = 0;   // prevents multi-kick when ball lingers in radius
        this.onHit = null;       // (score) => void
    }

    update(dt) {
        if (this.flash > 0)        this.flash        = Math.max(0, this.flash        - dt);
        if (this._hitCooldown > 0) this._hitCooldown = Math.max(0, this._hitCooldown - dt);
    }

    resolve(ball) {
        const hit = Collisions.circleVsCircle(ball, this.x, this.y, this.r, C.BALL_RESTITUTION_BUMPER);
        if (!hit) return false;
        // Extra outward kick — one-shot per contact (cooldown prevents multi-fire
        // when the ball centre lingers within the bumper detection radius across substeps).
        if (this._hitCooldown > 0) return true;
        this._hitCooldown = 0.15;
        const dx = ball.pos.x - this.x;
        const dy = ball.pos.y - this.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const nx = dx / d;
        const ny = dy / d;
        ball.vel.x += nx * C.BUMPER_KICK;
        ball.vel.y += ny * C.BUMPER_KICK;
        this.flash = 0.18;
        if (this.onHit) this.onHit(this.score);
        return true;
    }
}
