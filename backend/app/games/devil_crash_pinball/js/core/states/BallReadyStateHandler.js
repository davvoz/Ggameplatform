import { LiveStateHandler } from './LiveStateHandler.js';

/**
 * Handles BALL_READY: extends live play with plunger charge/release input.
 */
export class BallReadyStateHandler extends LiveStateHandler {
    _updateInput(dt) {
        this._game.plunger.update(dt);
    }
}
