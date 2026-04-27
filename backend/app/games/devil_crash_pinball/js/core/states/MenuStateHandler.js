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
        } else if (g._menuInputPressed()) {
            g._startNewGame();
        }
    }
}
