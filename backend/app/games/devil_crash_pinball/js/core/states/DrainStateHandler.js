import { GameStateHandler } from './GameStateHandler.js';

/**
 * Handles BALL_DRAIN: drives the animated implode → hold → spawn sequence.
 * Board entities keep animating; camera follows the ball during travel.
 */
export class DrainStateHandler extends GameStateHandler {
    update(dt) {
        const g = this._game;
        g._updateDrain(dt);
        g.board.update(dt);
        g.renderer.follow(g.ball, dt);
    }
}
