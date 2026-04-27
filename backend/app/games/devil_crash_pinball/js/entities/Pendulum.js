import { Collisions } from '../physics/Collisions.js';

/**
 * Oscillating pendulum hazard — a rigid arm anchored at a fixed pivot that
 * swings sinusoidally left and right.
 *
 * Physics:
 *  - The arm segment resolves against the ball each frame (circleVsSegment).
 *  - On impact the ball additionally receives a fraction of the tip's
 *    instantaneous tangential velocity, so timing the swing matters.
 */
export class Pendulum {
    /**
     * @param {number} anchorX   world X of pivot
     * @param {number} anchorY   world Y of pivot
     * @param {number} length    arm length in pixels
     * @param {number} amplitude max swing angle from vertical (radians)
     * @param {number} frequency oscillations per second
     */
    constructor(anchorX, anchorY, length = 88, amplitude = 0.88, frequency = 0.52) {
        this.anchorX   = anchorX;
        this.anchorY   = anchorY;
        this.length    = length;
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.phase     = 0;
        this.angle     = 0;
        this.angleVel  = 0;       // angular velocity this frame (rad/s)
        this.flash     = 0;
        this.score     = 75;
        this.onHit     = null;
        /** Radius of the tip sphere — used by both physics and renderer. */
        this.tipRadius = 14;
        /** Horizontal slide of the anchor. 0 = disabled (default). */
        this.slideRange = 0;
        this.slideSpeed = 1.2;
        this._baseAnchorX = anchorX;
        this._slideT      = 0;
        // Tip world coordinates (updated each frame)
        this.tipX = anchorX;
        this.tipY = anchorY + length;
    }

    update(dt) {
        // Slide the anchor horizontally if enabled
        if (this.slideRange > 0) {
            this._slideT   += dt;
            this.anchorX    = this._baseAnchorX + Math.sin(this._slideT * this.slideSpeed) * this.slideRange;
        }
        const prev    = this.angle;
        this.phase   += this.frequency * Math.PI * 2 * dt;
        this.angle    = this.amplitude * Math.sin(this.phase);
        this.angleVel = dt > 0 ? (this.angle - prev) / dt : 0;
        this.tipX     = this.anchorX + this.length * Math.sin(this.angle);
        this.tipY     = this.anchorY + this.length * Math.cos(this.angle);
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    }

    resolve(ball) {
        // ── Tip sphere: primary hitbox (the big visible ball) ────────────
        const tipHit = Collisions.circleVsCircle(
            ball, this.tipX, this.tipY, this.tipRadius, 0.92
        );
        // ── Arm segment: secondary hitbox (the rod) ──────────────────────
        const armHit = !tipHit && Collisions.circleVsSegment(
            ball,
            this.anchorX, this.anchorY,
            this.tipX,    this.tipY,
            0.88
        );
        if (!tipHit && !armHit) return false;

        // Transfer a fraction of the arm tip's tangential velocity to ball.
        // v_tip = ω × L, directed perpendicular to the arm.
        const tipVelX =  this.angleVel * this.length * Math.cos(this.angle);
        const tipVelY = -this.angleVel * this.length * Math.sin(this.angle);
        ball.vel.x += tipVelX * 0.42;
        ball.vel.y += tipVelY * 0.42;

        this.flash = 0.14;
        if (this.onHit) this.onHit(this.score);
        return true;
    }
}
