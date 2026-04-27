import { Collisions } from '../physics/Collisions.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * A circular spring pad that launches the ball in a configured direction
 * when touched. Visually it looks like a coiled spring plate on a wall.
 *
 * Coordinates: world-space (top already added by _buildSprings).
 */
export class Spring {
    /** @type {number} */ x;
    /** @type {number} */ y;
    /** @type {number} */ radius;
    /** @type {number} */ dirX;   // unit launch direction X (pre-computed from angleDeg)
    /** @type {number} */ dirY;   // unit launch direction Y
    /** @type {number} */ power;
    /** @type {number} */ cooldown;
    /** @type {number} */ timer;
    /** @type {number} */ flash;
    /** @type {Function|null} */ onHit;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius     collision radius of the spring plate
     * @param {number} angleDeg   launch direction in degrees (0=right, 90=down, 270=up…)
     * @param {number} power      impulse magnitude applied to ball on activation
     * @param {number} cooldown   seconds between activations
     */
    constructor(x, y, radius, angleDeg, power, cooldown = 0.4) {
        this.x        = x;
        this.y        = y;
        this.radius   = radius;
        const rad     = angleDeg * (Math.PI / 180);
        this.dirX     = Math.cos(rad);
        this.dirY     = Math.sin(rad);
        this.power    = power;
        this.cooldown = cooldown;
        this.timer    = 0;
        this.flash    = 0;   // 1.0 when just fired, fades to 0 → drives compression animation
        this.onHit    = null;
    }

    /**
     * @param {number} dt seconds
     */
    update(dt) {
        if (this.timer > 0) this.timer = Math.max(0, this.timer - dt);
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.5);
    }

    /**
     * @param {import('../physics/Ball.js').Ball} ball
     * @returns {boolean} true if spring fired
     */
    resolve(ball) {
        // Passive circle bounce when on cooldown
        Collisions.circleVsCircle(ball, this.x, this.y, this.radius, 0.6);

        if (this.timer > 0) return false;

        const dist = Math.hypot(ball.pos.x - this.x, ball.pos.y - this.y);
        if (dist > this.radius + ball.radius) return false;

        ball.vel.x = this.dirX * this.power;
        ball.vel.y = this.dirY * this.power;
        this.timer = this.cooldown;
        this.flash = 1;
        if (this.onHit) this.onHit(C.SPRING_SCORE);
        return true;
    }
}
