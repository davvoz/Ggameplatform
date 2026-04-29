import { GameStateHandler } from './GameStateHandler.js';

/**
 * Handles ATTRACT and GAME_OVER: waits for the input guard to expire,
 * then starts a new game on any input.
 */
export class MenuStateHandler extends GameStateHandler {
    update(dt) {
        const g = this._game;
        if (g._menuInputGuard > 0) {
            g._menuInputGuard = Math.max(0, g._menuInputGuard - dt);
            // Drop any input edges that arrive during the guard so they
            // can't dismiss the banner the moment the timer expires.
            g.input.consumeLaunch();
            g.input.consumeTilt();
            g.input.consumeEsc();
            g.input.consumeCanvasTap();
            return;
        }
        // Arm: require all menu-dismiss inputs to be released at least once
        // after the guard before accepting a new press. This kills the
        // "held flipper / still-pressed launch" case that was restarting
        // the game without a real click.
        if (!g._menuInputArmed) {
            const anyHeld = g.input.left || g.input.right || g.input.launchHeld;
            if (anyHeld) {
                g.input.consumeLaunch();
                return;
            }
            g._menuInputArmed = true;
        }
        if (g._menuInputPressed()) {
            g._menuInputArmed = false;
            g._startNewGame();
        }
    }
}
