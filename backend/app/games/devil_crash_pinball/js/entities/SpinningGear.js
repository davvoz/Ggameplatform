import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Infernal spinning gear — the centrepiece of the INFERNO section.
 *
 * Tiny hub, very long teeth. On tooth contact the ball receives ONLY a
 * tangential kick in the direction the teeth are moving — no radial
 * bounce-out. The gear acts as a spin redirector, not a bumper.
 */
export class SpinningGear {
    /**
     * @param {number} x            world X of gear centre
     * @param {number} y            world Y of gear centre
     * @param {number} radius       hub radius (tooth-base circle)
     * @param {number} teethCount   number of teeth
     * @param {number} angularSpeed rad/s; positive = clockwise
     * @param {number} toothHeight  length of teeth protruding from the hub
     */
    constructor(x, y, radius = 12, teethCount = 5, angularSpeed = 2.8, toothHeight = 42) {
        this.x             = x;
        this.y             = y;
        this.radius        = radius;
        this.toothHeight   = toothHeight;
        this.teethCount    = teethCount;
        this.angularSpeed  = angularSpeed;
        this.angle         = 0;
        this.flash         = 0;
        this._hitCooldown  = 0;
        this.restitution   = C.BALL_RESTITUTION_WALL;
        this.score         = C.BUMPER_SCORE * 2;
        this.onHit         = null;
    }

    /** Collision radius = body + protruding teeth. */
    get outerRadius() {
        return this.radius + this.toothHeight;
    }

    update(dt) {
        this.angle = (this.angle + this.angularSpeed * dt) % (Math.PI * 2);
        if (this.flash > 0)        this.flash        = Math.max(0, this.flash        - dt);
        if (this._hitCooldown > 0) this._hitCooldown = Math.max(0, this._hitCooldown - dt);
    }

    resolve(ball) {
        const dx   = ball.pos.x - this.x;
        const dy   = ball.pos.y - this.y;
        const dist = Math.hypot(dx, dy) || 1e-6;

        // Broad phase
        if (dist > this.outerRadius + ball.radius) return false;

        const nx = dx / dist;
        const ny = dy / dist;

        // Reflect helper — uses per-instance restitution.
        const reflect = (surfaceR) => {
            ball.pos.x += nx * (surfaceR - dist);
            ball.pos.y += ny * (surfaceR - dist);
            const vn = ball.vel.x * nx + ball.vel.y * ny;
            if (vn < 0) {
                const k = (1 + this.restitution) * vn;
                ball.vel.x -= k * nx;
                ball.vel.y -= k * ny;
            }
        };

        // ── Hub collision: solid core ───────────────────────────────────────
        const hubR = this.radius + ball.radius;
        if (dist < hubR) {
            reflect(hubR);
            return true;
        }

        // ── Tooth zone: detect angular alignment with a tooth tip ───────────
        const step   = (Math.PI * 2) / this.teethCount;
        // Half-width of a tooth base in radians (matches renderer)
        const halfTW = (Math.PI / this.teethCount) * 0.42;

        // Ball angle relative to gear, un-rotated
        let relAngle = Math.atan2(dy, dx) - this.angle;
        relAngle = ((relAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        // Angular distance to nearest tooth centre
        const nearestTooth = Math.round(relAngle / step) * step;
        const angDiff = Math.abs(relAngle - nearestTooth);
        const angDiffWrapped = Math.min(angDiff, Math.PI * 2 - angDiff);

        if (angDiffWrapped > halfTW) return false; // ball is in a gap — no contact

        // ── Solid tooth contact: wall-style reflect at the tooth tip ────────
        reflect(this.outerRadius + ball.radius);

        // Throttle scoring/SFX to avoid multi-frame accumulation,
        // but the collision itself (above) is always resolved.
        if (this._hitCooldown > 0) return true;

        this.flash        = 0.22;
        this._hitCooldown = 0.28;
        if (this.onHit) this.onHit(this.score);
        return true;
    }
}
