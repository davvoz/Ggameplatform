import { GameStateHandler } from './GameStateHandler.js';

/**
 * Shared base for BALL_READY and PLAY.
 * Runs HUD, tilt, flippers, physics, board, score, drain guard,
 * stuck display and camera follow — the full "ball is live" pipeline.
 *
 * Subclasses override _updateInput(dt) for state-specific input handling.
 */
export class LiveStateHandler extends GameStateHandler {
    update(dt) {
        const g = this._game;
        g._handleTilt();
        g._updateFlippers();
        this._updateInput(dt);
        g.board.update(dt);           // entities move BEFORE physics so collisions
        g._stepPhysicsAndSection(dt); // resolve against current-frame positions
        g.score.update(dt);
        if (g.ballSaveTimer > 0) g.ballSaveTimer = Math.max(0, g.ballSaveTimer - dt);
        g._checkReplunge();
        g._checkDrain();
        g._updateStuckDisplay(dt);
        g.renderer.follow(g.ball, dt);
    }

    /**
     * Override in subclasses for state-specific input handling (e.g. plunger).
     * Default: no-op.
     * @param {number} dt
     */
    // eslint-disable-next-line no-unused-vars
    _updateInput(dt) { /* no-op — override in subclasses */ }
}
