import { GameConfig as C } from '../config/GameConfig.js';
import { Collisions } from '../physics/Collisions.js';

/**
 * Rotating capsule pivoted at one end. Player input toggles target angle;
 * angular velocity is exposed to collisions so the ball gains tangential impulse.
 */
export class Flipper {
    static SIDE = Object.freeze({ LEFT: 1, RIGHT: -1 });

    /**
     * @param {number} pivotX  pivot world X
     * @param {number} pivotY  pivot world Y
     * @param {number} side    +1 left, -1 right (mirror)
     */
    constructor(pivotX, pivotY, side) {
        this.pivot = { x: pivotX, y: pivotY };
        this.side = side;
        this.length = C.FLIPPER_LENGTH;
        this.thickness = C.FLIPPER_THICKNESS;
        // IMPORTANT: rest/active angles are NOT multiplied by side.
        // Endpoint X already mirrors via `side`; angle controls down/up only.
        // Positive angle => tip below pivot (rest). Negative => tip above (active).
        this.restAngle = C.FLIPPER_REST_ANGLE;
        this.activeAngle = C.FLIPPER_ACTIVE_ANGLE;
        this.angle = this.restAngle;
        this.targetAngle = this.restAngle;
        this.omega = 0;
        this.active = false;
    }

    /**
     * Physics capsule diameter — scales automatically with flipper length.
     * Longer flippers get proportionally wider hit zones with no manual config.
     */
    get hitThickness() { return this.thickness * (this.length / C.FLIPPER_LENGTH); }

    setActive(on) {
        this.active = on;
        this.targetAngle = on ? this.activeAngle : this.restAngle;
    }

    update(dt) {
        const diff = this.targetAngle - this.angle;
        const maxStep = C.FLIPPER_SPEED * dt;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
        this.angle += step;
        this.omega = dt > 0 ? step / dt : 0;
    }

    /**
     * Endpoint in world coords (B). Pivot is A.
     */
    endpoint(out) {
        // For LEFT side: angle 0 means horizontal pointing right (positive X)
        // For RIGHT side mirror with -side
        const dir = this.side; // left: +1 -> +x, right: -1 -> -x
        out.x = this.pivot.x + Math.cos(this.angle) * this.length * dir;
        out.y = this.pivot.y + Math.sin(this.angle) * this.length;
        return out;
    }

    resolve(ball) {
        const ex = this.pivot.x + Math.cos(this.angle) * this.length * this.side;
        const ey = this.pivot.y + Math.sin(this.angle) * this.length;
        const cap = {
            ax: this.pivot.x, ay: this.pivot.y,
            bx: ex, by: ey,
            r: this.hitThickness * 0.5,
            omega: this.omega * this.side,
        };
        const hit = Collisions.circleVsCapsule(ball, cap, 0.55);
        if (hit && this.active) {
            // Extra impulse upward when actively flipping
            ball.vel.y -= C.FLIPPER_IMPULSE * 0.0035 * Math.abs(this.omega);
        }
        return hit;
    }
}
