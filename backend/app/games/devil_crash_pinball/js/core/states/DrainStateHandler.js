import { GameStateHandler } from './GameStateHandler.js';

/**
 * Handles BALL_DRAIN: drives the animated implode \u2192 hold \u2192 spawn sequence.
 * Delegates to {@link Game#tickDrain}.
 */
export class DrainStateHandler extends GameStateHandler {
    update(dt) {
        this._game.tickDrain(dt);
    }
}
