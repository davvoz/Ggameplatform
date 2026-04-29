import { GameConfig as C } from '../config/GameConfig.js';
import { GameState }       from './GameState.js';
import { Ball }            from '../physics/Ball.js';

/**
 * Anti-stuck rescue: two independent detectors and a separate display flag
 * that lights up the HUD RESET button.
 *
 *   - Velocity-based: ball nearly still for STUCK_TIME seconds.
 *   - Position-based: ball hasn't moved STUCK_POS_THRESHOLD px in
 *     STUCK_POS_WINDOW seconds (catches vibrating-trapped balls).
 *
 * The display flag uses a more sensitive window (STUCK_DISPLAY_*) and latches
 * until the ball has actually travelled STUCK_DISPLAY_THRESHOLD px.
 */
export class StuckRescuer {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;

        this._velTimer  = 0;
        this._posTimer  = 0;
        this._posRef    = { x: 0, y: 0 };

        this._displayLatched = false;
        this._displayTimer   = 0;
        this._displayRef     = { x: 0, y: 0 };
    }

    get isDisplayStuck() { return this._displayLatched; }

    resetTimers() {
        this._velTimer = 0;
        this._posTimer = 0;
        this._posRef.x = 0;
        this._posRef.y = 0;

        this._displayLatched = false;
        this._displayTimer   = 0;
        this._displayRef.x   = 0;
        this._displayRef.y   = 0;
    }

    /**
     * Detect velocity- and position-based stuck conditions and nudge the ball.
     * Called every frame from the LIVE state handler.
     * @param {number} dt
     */
    checkStuck(dt) {
        const g = this._game;
        if (g.ball.state !== Ball.STATE.LIVE) {
            this._velTimer = 0;
            this._posTimer = 0;
            return;
        }
        this._tickVelocity(dt, g);
        this._tickPosition(dt, g);
    }

    /**
     * Update the HUD RESET display flag (more sensitive than the auto-nudge).
     * @param {number} dt
     */
    updateDisplay(dt) {
        const g = this._game;
        if (g.ball.state !== Ball.STATE.LIVE || g.state !== GameState.PLAY) {
            this._displayLatched = false;
            this._displayTimer   = 0;
            this._displayRef.x   = g.ball.pos.x;
            this._displayRef.y   = g.ball.pos.y;
            return;
        }

        const dx = g.ball.pos.x - this._displayRef.x;
        const dy = g.ball.pos.y - this._displayRef.y;
        if (Math.hypot(dx, dy) > C.STUCK_DISPLAY_THRESHOLD) {
            this._displayLatched = false;
            this._displayTimer   = 0;
            this._displayRef.x   = g.ball.pos.x;
            this._displayRef.y   = g.ball.pos.y;
            return;
        }

        this._displayTimer += dt;
        if (this._displayTimer >= C.STUCK_DISPLAY_WINDOW) {
            this._displayLatched = true;
        }
    }

    /** @private */
    _tickVelocity(dt, g) {
        const sp = Math.hypot(g.ball.vel.x, g.ball.vel.y);
        if (sp < C.STUCK_VEL_THRESHOLD) {
            this._velTimer += dt;
            if (this._velTimer >= C.STUCK_TIME) {
                this._velTimer = 0;
                this._nudgeBall();
            }
        } else {
            this._velTimer = 0;
        }
    }

    /** @private */
    _tickPosition(dt, g) {
        this._posTimer += dt;
        if (this._posTimer >= C.STUCK_POS_WINDOW) {
            const dx = g.ball.pos.x - this._posRef.x;
            const dy = g.ball.pos.y - this._posRef.y;
            if (Math.hypot(dx, dy) < C.STUCK_POS_THRESHOLD) this._nudgeBall();
            this._posRef.x = g.ball.pos.x;
            this._posRef.y = g.ball.pos.y;
            this._posTimer = 0;
        }
    }

    /** @private */
    _nudgeBall() {
        const g   = this._game;
        const dir = Math.random() < 0.5 ? -1 : 1;
        g.ball.vel.x = dir * C.STUCK_NUDGE_X * (C.NUDGE_X_RANDOM_BASE + Math.random() * C.NUDGE_X_RANDOM_RANGE);
        g.ball.vel.y =      -C.STUCK_NUDGE_Y * (C.NUDGE_Y_RANDOM_BASE + Math.random() * C.NUDGE_Y_RANDOM_RANGE);
        g.renderer.addShake(C.NUDGE_SHAKE);
        g.renderer.spawnHit(g.ball.pos.x, g.ball.pos.y, C.COLOR_PURPLE, 10, 200, 0.4);
    }
}
