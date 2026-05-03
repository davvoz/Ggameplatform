import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Rectangular kicker zone. When the ball overlaps and is moving slowly enough,
 * it gets launched in the configured direction and the ball is moved out.
 */
export class Kicker {
    /**
     * @param {object} options
     * @param {number} options.x rect left
     * @param {number} options.y rect top
     * @param {number} options.w
     * @param {number} options.h
     * @param {number} options.dirX      unit launch direction X
     * @param {number} options.dirY      unit launch direction Y
     * @param {number} options.cooldown  seconds between activations
     * @param {number} options.angleDeg  housing rotation in degrees (0 = horizontal)
     * @param {number} options.power     launch impulse in px/s (default = C.KICKER_IMPULSE)
     */
    constructor(options) {
        const { x, y, w, h, dirX, dirY, cooldown = 0.6, angleDeg = 0, power = C.KICKER_IMPULSE } = options;
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.dirX = dirX; this.dirY = dirY;
        this.cooldown = cooldown;
        this.angleDeg = angleDeg;
        /** Launch impulse in px/s. */
        this.power = power;
        const rad  = angleDeg * Math.PI / 180;
        this._cos  = Math.cos(rad);
        this._sin  = Math.sin(rad);
        this.timer = 0;
        this.flash = 0;
        this.onHit = null;
        /** Horizontal slide: half-range in px. 0 = disabled. */
        this.slideRange = 0;
        /** Slide oscillation speed in rad/s. */
        this.slideSpeed = 1.5;
        this._baseX    = x;
        this._baseY    = y;
        this._slideT   = 0;
        /** Circular orbit radius in px. When > 0, overrides slideRange. */
        this.circleRadius = 0;
        /** Orbit speed in rad/s. */
        this.circleSpeed  = 1.2;
    }

    update(dt) {
        if (this.timer > 0) this.timer = Math.max(0, this.timer - dt);
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
        if (this.circleRadius > 0) {
            this._slideT += dt;
            this.x = this._baseX + Math.cos(this._slideT * this.circleSpeed) * this.circleRadius;
            this.y = this._baseY + Math.sin(this._slideT * this.circleSpeed) * this.circleRadius;
        } else if (this.slideRange > 0) {
            this._slideT += dt;
            this.x = this._baseX + Math.sin(this._slideT * this.slideSpeed) * this.slideRange;
        }
    }

    resolve(ball) {
        if (this.timer > 0) return false;

        // Rotated AABB hit-test — transform ball into kicker-local space.
        // For angleDeg=0: _cos=1, _sin=0, so lx=dx, ly=dy — identical to original AABB.
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const dx = ball.pos.x - cx;
        const dy = ball.pos.y - cy;
        const lx =  dx * this._cos + dy * this._sin;
        const ly = -dx * this._sin + dy * this._cos;
        if (lx < -this.w / 2 || lx > this.w / 2) return false;
        if (ly < -this.h / 2 || ly > this.h / 2) return false;

        // Vary launch angle ±18° and power ±12% so each kick feels different
        const spread    = (Math.random() - 0.5) * 0.628; // ±~18 deg in radians
        const powerMult = 0.88 + Math.random() * 0.24;   // 0.88–1.12
        const baseAngle = Math.atan2(this.dirY, this.dirX);
        const angle     = baseAngle + spread;
        const k         = this.power * powerMult;
        ball.vel.x = Math.cos(angle) * k;
        ball.vel.y = Math.sin(angle) * k;
        this.timer = this.cooldown;
        this.flash = 0.25;
        if (this.onHit) this.onHit(C.KICKER_SCORE);
        return true;
    }
}
