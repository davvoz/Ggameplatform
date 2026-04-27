/**
 * One-way ramp/gate. Allows the ball to pass through in `direction` (1 = down to up,
 * -1 = up to down). Triggers onPass event for inter-section transitions and
 * physically BLOCKS the ball when it attempts to cross in the wrong direction.
 *
 * Geometry: horizontal segment from (x1,y) to (x2,y).
 */
export class Gate {
    constructor(x1, x2, y, direction = 1, physical = false) {
        this.x1 = x1;
        this.x2 = x2;
        this.y = y;
        this.direction = direction; // +1 = blocks downward, allows up; -1 inverse
        this.physical = physical;   // true -> hard-block wrong-direction crossings
        this.flash = 0;
        this.onPass = null;
        this.restitution = 0.45;
    }

    update(dt) { if (this.flash > 0) this.flash = Math.max(0, this.flash - dt); }

    /** True if ball.vel.y direction is allowed by this gate. */
    _allowed(ball) {
        const goingUp = ball.vel.y < 0;
        return (this.direction > 0 && goingUp) || (this.direction < 0 && !goingUp);
    }

    /**
     * Physical block: if the ball is on the WRONG side trying to cross, push it
     * back and reflect its vertical velocity. Acts as a horizontal wall but
     * only against motion in the disallowed direction.
     */
    block(ball) {
        if (!this.physical) return;
        if (ball.pos.x < this.x1 || ball.pos.x > this.x2) return;
        const r = ball.radius;
        // Going DOWN through a gate that allows UP only -> ball must stay ABOVE y
        if (this.direction > 0 && ball.vel.y > 0) {
            if (ball.pos.y + r > this.y && ball.pos.y - r < this.y) {
                ball.pos.y = this.y - r;
                ball.vel.y = -Math.abs(ball.vel.y) * this.restitution;
            }
            return;
        }
        // Going UP through a gate that allows DOWN only -> ball must stay BELOW y
        if (this.direction < 0 && ball.vel.y < 0) {
            if (ball.pos.y - r < this.y && ball.pos.y + r > this.y) {
                ball.pos.y = this.y + r;
                ball.vel.y = Math.abs(ball.vel.y) * this.restitution;
            }
        }
    }

    /**
     * Call after physics integration. If ball crossed the gate in the allowed
     * direction, fire onPass.
     */
    checkCrossing(ball, prevY) {
        if (ball.pos.x < this.x1 || ball.pos.x > this.x2) return false;
        if (!this._allowed(ball)) return false;
        const crossed = (prevY <= this.y && ball.pos.y > this.y) ||
                        (prevY >= this.y && ball.pos.y < this.y);
        if (!crossed) return false;
        this.flash = 0.25;
        if (this.onPass) this.onPass();
        return true;
    }
}
