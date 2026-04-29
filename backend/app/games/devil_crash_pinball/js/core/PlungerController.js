import { GameState }    from './GameState.js';
import { LaunchSpring } from '../entities/LaunchSpring.js';

/**
 * Player-controlled plunger logic. Owns charge state, release detection,
 * BALL_READY \u2192 PLAY transition, and the re-plunge check (ball rolling back
 * onto the launch pad during PLAY).
 *
 * Read by the HUD presenter via {@link charge}.
 */
export class PlungerController {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
        this._charging = false;
        this._charge   = 0;
    }

    get charge()   { return this._charge; }
    get charging() { return this._charging; }

    reset() {
        this._charge   = 0;
        this._charging = false;
    }

    /** Called by InputRouter when a launch event is received in BALL_READY. */
    startCharging() { this._charging = true; }

    /**
     * Update plunger while in BALL_READY. Returns true when the spring fires
     * and the FSM transitions to PLAY.
     * @param {number} dt
     */
    update(dt) {
        const g   = this._game;
        const ls  = g.board.launchSpring;
        const all = g.board.launchSprings;

        if (all.some(s => s.fired)) {
            g.audio.sfx('launch');
            this.reset();
            g.state = GameState.PLAY;
            return true;
        }

        if (this._charging && g.input.held.launch) {
            for (const s of all) s.retract(dt);
            this._charge = ls.pullRatio;
            return false;
        }

        if (all.some(s => s.state === LaunchSpring.STATE.RELEASING)) {
            this._charge = ls.pullRatio;
            return false;
        }

        if (this._charging && !g.input.held.launch) {
            for (const s of all) s.release(g.ball);
            this._charging = false;
        }
        return false;
    }

    /**
     * If the ball drifts back onto an idle launch pad during PLAY, re-arm the
     * plunger and return to BALL_READY so the player can fire again.
     */
    checkReplunge() {
        const g = this._game;
        if (g.state !== GameState.PLAY) return;

        const ls = g.board.launchSprings.find(
            s => s.state === LaunchSpring.STATE.IDLE
                && Math.hypot(g.ball.pos.x - s.tipX, g.ball.pos.y - s.tipY)
                   <= g.ball.radius + s.radius + 4,
        );
        if (!ls) return;

        this.reset();
        g.state = GameState.BALL_READY;
    }
}
