import { GameStateHandler } from './GameStateHandler.js';

/**
 * Shared base for BALL_READY and PLAY.
 * Runs the full "ball is live" pipeline via {@link Game#tickLive}, then lets
 * subclasses inject state-specific input handling (e.g. plunger).
 */
export class LiveStateHandler extends GameStateHandler {
    update(dt) {
        this._updateInput(dt);
        this._game.tickLive(dt);
    }

    /**
     * Override in subclasses for state-specific input handling.
     * Default: no-op.
     * @param {number} dt
     */
    // eslint-disable-next-line no-unused-vars
    _updateInput(dt) { /* no-op \u2014 override in subclasses */ }
}
