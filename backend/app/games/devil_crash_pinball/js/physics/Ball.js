import { Vec2 } from './Vec2.js';
import { GameConfig as C } from '../config/GameConfig.js';

/**
 * The pinball. Holds position/velocity, applies gravity, clamps top speed.
 *
 * State machine: IDLE → LIVE → LOST. WARPING is a transient visual state
 * driven by warp holes (no physics integration while warping).
 */
export class Ball {
    static STATE = Object.freeze({ IDLE: 0, LIVE: 1, LOST: 2, WARPING: 3 });

    constructor(x = 0, y = 0) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.radius = C.BALL_RADIUS;
        this.state = Ball.STATE.IDLE;
        this.warpScale = 1;            // visual scale during warp transit
        this.trailMax = 8;
        this.trail = new Array(this.trailMax);
        for (let i = 0; i < this.trailMax; i++) this.trail[i] = { x, y };
        this.trailIdx = 0;
    }

    reset(x, y) {
        this.pos.set(x, y);
        this.vel.set(0, 0);
        this.state = Ball.STATE.IDLE;
        for (let i = 0; i < this.trailMax; i++) {
            this.trail[i].x = x;
            this.trail[i].y = y;
        }
    }

    launch(vx, vy) {
        this.vel.set(vx, vy);
        this.state = Ball.STATE.LIVE;
    }

    /**
     * Integrate gravity and clamp top speed. Caller resolves collisions
     * after each integrate() call.
     * @param {number} dt seconds
     */
    integrate(dt) {
        if (this.state !== Ball.STATE.LIVE) return;
        this.vel.y += C.GRAVITY * dt;
        const sp = this.vel.length();
        if (sp > C.BALL_MAX_SPEED) {
            const k = C.BALL_MAX_SPEED / sp;
            this.vel.x *= k;
            this.vel.y *= k;
        }
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
    }

    pushTrail() {
        const t = this.trail[this.trailIdx];
        t.x = this.pos.x;
        t.y = this.pos.y;
        this.trailIdx = (this.trailIdx + 1) % this.trailMax;
    }
}
