import { GameConfig as C } from '../config/GameConfig.js';
import { Ball } from '../physics/Ball.js';

/**
 * Warp hole — circular capture zone that runs a 3-phase transit animation:
 *   SUCK   (0 → SUCK_END)  : ball shrinks at entry, vortex pulls inward
 *   TRAVEL (SUCK → TRAV_END): ball invisible, camera scrolls to exit section
 *   ARRIVE (TRAV → DONE)   : ball materialises at exit with burst
 *
 * Visual state exposed for Renderer:
 *   phase          0|1|2|-1  (suck / travel / arrive / idle)
 *   phaseProgress  0..1 within current phase
 *   arrivalPending bool — true for ONE update when arrive phase starts
 */
export class WarpHole {
    static SUCK_END = 0.3;
    static TRAV_END = 0.62;
    static DONE     = 0.97;

    /**
     * @param {number} x      world X centre
     * @param {number} y      world Y centre
     * @param {number} radius capture radius (default 22)
     */
    constructor(x, y, radius = 22) {
        this.x = x;
        this.y = y;
        this.radius = radius;

        /** Unique name within the section — used by WarpWirer to match warpExit descriptors. */
        this.name = '';

        // Exit destination — written by WarpWirer after all sections are built.
        this.exitX    = x;
        this.exitY    = y;
        this.exitVelX = 0;
        this.exitVelY = -680;

        // Visual animation clock
        this.swirl    = 0;
        this.cooldown = 0;

        // Transit state
        this._ball           = null;
        this.transitActive   = false;
        this.transitTimer    = 0;
        this.entryX          = 0;
        this.entryY          = 0;
        this.arrivalPending  = false; // consumed by Renderer each frame

        this.score     = C.WARP_SCORE;
        this.onWarp    = null;
        this.onCapture = null;  // fires once at capture moment (SUCK phase start)
    }

    // ── Getters ──────────────────────────────────────────────────────────

    get isReady() { return this.cooldown <= 0 && !this.transitActive; }

    /** Current phase: 0=suck 1=travel 2=arrive -1=idle */
    get phase() {
        if (!this.transitActive) return -1;
        const t = this.transitTimer;
        if (t < WarpHole.SUCK_END)  return 0;
        if (t < WarpHole.TRAV_END)  return 1;
        return 2;
    }

    /** Progress 0..1 within the current phase */
    get phaseProgress() {
        if (!this.transitActive) return 0;
        const t = this.transitTimer;
        if (t < WarpHole.SUCK_END) {
            return t / WarpHole.SUCK_END;
        }
        if (t < WarpHole.TRAV_END) {
            return (t - WarpHole.SUCK_END) / (WarpHole.TRAV_END - WarpHole.SUCK_END);
        }
        return (t - WarpHole.TRAV_END) / (WarpHole.DONE - WarpHole.TRAV_END);
    }

    // ── Update ────────────────────────────────────────────────────────────

    update(dt) {
        this.swirl += dt * 3.2;
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
        if (!this.transitActive) return;

        const prevPhase = this.phase;
        this.transitTimer += dt;

        const ball = this._ball;
        const t    = this.transitTimer;

        if (t < WarpHole.SUCK_END) {
            // ── Phase SUCK: hold ball at entry, shrink it ───────────────
            ball.pos.x    = this.entryX;
            ball.pos.y    = this.entryY;
            ball.warpScale = Math.max(0, 1 - t / WarpHole.SUCK_END);

        } else if (t < WarpHole.TRAV_END) {
            // ── Phase TRAVEL: ball at exit, invisible ────────────────────
            ball.pos.x    = this.exitX;
            ball.pos.y    = this.exitY;
            ball.warpScale = 0;
            for (const tr of ball.trail) { tr.x = this.exitX; tr.y = this.exitY; }

        } else if (t < WarpHole.DONE) {
            // ── Phase ARRIVE: materialise at exit ────────────────────────
            const p = (t - WarpHole.TRAV_END) / (WarpHole.DONE - WarpHole.TRAV_END);
            ball.warpScale = p;
            ball.pos.x    = this.exitX;
            ball.pos.y    = this.exitY;
            // Fire arrival burst exactly once
            if (prevPhase < 2) this.arrivalPending = true;

        } else {
            // ── Transit complete ──────────────────────────────────────────
            this.transitActive = false;
            ball.warpScale     = 1;
            ball.vel.x         = this.exitVelX;
            ball.vel.y         = this.exitVelY;
            ball.state         = Ball.STATE.LIVE;
            this._ball         = null;
            this.cooldown      = 5;
            if (this.onWarp) this.onWarp(this.score);
        }
    }

    // ── Collision ─────────────────────────────────────────────────────────

    /**
     * Test ball against capture zone. Returns true if transit started.
     * @param {import('../physics/Ball.js').Ball} ball
     */
    resolve(ball) {
        if (!this.isReady) return false;
        const dx   = ball.pos.x - this.x;
        const dy   = ball.pos.y - this.y;
        const sumR = this.radius + ball.radius;
        if (dx * dx + dy * dy > sumR * sumR) return false;

        // Start transit
        this.entryX        = ball.pos.x;
        this.entryY        = ball.pos.y;
        this.transitActive = true;
        this.transitTimer  = 0;
        this.arrivalPending = false;
        this._ball         = ball;

        ball.state    = Ball.STATE.WARPING;
        ball.vel.x    = 0;
        ball.vel.y    = 0;
        ball.warpScale = 1;
        if (this.onCapture) this.onCapture();
        return true;
    }
}

