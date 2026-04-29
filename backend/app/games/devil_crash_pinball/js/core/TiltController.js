import { GameConfig as C } from '../config/GameConfig.js';
import { GameState }       from './GameState.js';
import { Ball }            from '../physics/Ball.js';

/**
 * Tilt logic. Each tilt event escalates the physical kick (table slam) and
 * counts toward the tilt-shake limit; once reached the player loses flipper
 * control until the ball drains.
 */
export class TiltController {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
    }

    /** Process a single TILT event. No-op outside PLAY or after tilt latches. */
    handle() {
        const g = this._game;
        if (g.state !== GameState.PLAY) return;
        if (g.session.tilted) return;

        g.session.tiltCount += 1;
        g.audio.sfx('tilt');
        g.renderer.addShake(C.TILT_SHAKE);

        if (g.ball.state === Ball.STATE.LIVE) this._kickBall();

        if (g.session.tiltCount >= C.TILT_SHAKE_LIMIT) g.session.tilted = true;
    }

    /** @private */
    _kickBall() {
        const g         = this._game;
        const intensity = C.TILT_INTENSITY_BASE + g.session.tiltCount * C.TILT_INTENSITY_STEP;
        const dir       = Math.random() < 0.5 ? -1 : 1;
        const xJitter   = C.TILT_KICK_X_RAND_BASE + Math.random() * C.TILT_KICK_X_RAND_RANGE;
        const yJitter   = C.TILT_KICK_Y_RAND_BASE + Math.random() * C.TILT_KICK_Y_RAND_RANGE;

        g.ball.vel.x += dir * C.TILT_KICK_X * intensity * xJitter;
        g.ball.vel.y +=      -C.TILT_KICK_Y * intensity * yJitter;
        g.renderer.spawnHit(
            g.ball.pos.x, g.ball.pos.y,
            C.TILT_FX_COLOR, C.TILT_FX_RADIUS, C.TILT_FX_SPEED, C.TILT_FX_LIFE,
        );
    }
}
