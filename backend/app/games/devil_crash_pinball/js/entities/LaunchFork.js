import { Ball } from '../physics/Ball.js';

/**
 * Fork diverter at the top of the plunger tube.
 * randomize() is called each ball load — picks DEFLECT or PASS with equal probability.
 *
 * DEFLECT : nothing happens — the arc walls redirect the ball into MainTable as normal.
 * PASS    : when the ball enters the trigger zone moving upward, it is instantly
 *           ejected into UpperTable (coords just above the section boundary).
 *
 * Exposed for Renderer: mode, pulse, x, y
 */
export class LaunchFork {
    static MODE = Object.freeze({ DEFLECT: 0, PASS: 1 });

    /**
     * @param {number} tubeRight   world X of outer tube wall (W - 20)
     * @param {number} tubeInner   world X of inner tube wall (W - 50)
     * @param {number} sectionTop  world Y of section top (MainTable.top)
     * @param {number} arcR        deflector curve radius
     */
    constructor(tubeRight, tubeInner, sectionTop, arcR) {
        this.x = (tubeRight + tubeInner) / 2;  // visual centre ≈ 445
        this.y = sectionTop + arcR * 0.6;       // mid-arc world Y

        // Trigger zone encompassing the full arc region
        this._x1 = tubeInner - 5;
        this._x2 = tubeRight + 5;
        this._y1 = sectionTop;
        this._y2 = sectionTop + arcR * 1.4;

        // Exit point: just inside UpperTable from the bottom-right corner
        this._exitX  = tubeInner - 10;  // ≈ 420 — inside playfield, away from walls
        this._exitY  = sectionTop - 20; // 20 px into UpperTable
        this._exitVX = -300;
        this._exitVY = -500;

        this.mode     = LaunchFork.MODE.DEFLECT;
        this.pulse    = 0;
        this.cooldown = 0;
    }

    /** Randomly assign DEFLECT or PASS for the upcoming launch. */
    randomize() {
        this.mode     = Math.random() < 0.5 ? LaunchFork.MODE.PASS : LaunchFork.MODE.DEFLECT;
        this.cooldown = 0;
    }

    update(dt) {
        this.pulse = (this.pulse + dt * 2.5) % (Math.PI * 2);
        if (this.cooldown > 0) this.cooldown -= dt;
    }

    /**
     * In PASS mode, intercept a ball moving upward through the trigger zone
     * and eject it into UpperTable. Always returns false so physics continues.
     * @param {import('../physics/Ball.js').Ball} ball
     * @returns {boolean}
     */
    resolve(ball) {
        if (this.mode !== LaunchFork.MODE.PASS) return false;
        if (this.cooldown > 0)                  return false;
        if (ball.state !== Ball.STATE.LIVE)      return false;
        if (ball.vel.y >= 0)                     return false;  // must be moving up

        const { x, y } = ball.pos;
        if (x < this._x1 || x > this._x2) return false;
        if (y < this._y1 || y > this._y2) return false;

        // Eject into UpperTable — physics engine will handle collisions naturally
        ball.pos.x = this._exitX;
        ball.pos.y = this._exitY;
        ball.vel.x = this._exitVX;
        ball.vel.y = this._exitVY;
        this.cooldown = 4;
        return true;
    }
}
