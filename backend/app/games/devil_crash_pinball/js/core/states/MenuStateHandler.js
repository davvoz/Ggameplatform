import { GameStateHandler } from './GameStateHandler.js';

/**
 * ATTRACT and GAME_OVER. Waits out the menu input guard, then watches for
 * a menu-press latched this frame by {@link InputRouter}.
 *
 * The latched flag (instead of a queue read) lets a single canvas-tap drive
 * both "menu dismiss" here and "plunger charge start" in BALL_READY on the
 * following frame, without re-entering the queue twice.
 */
export class MenuStateHandler extends GameStateHandler {
    update(dt) {
        const g = this._game;
        if (g.session.menuGuard > 0) {
            g.session.menuGuard = Math.max(0, g.session.menuGuard - dt);
            g.inputRouter.menuPressLatched = false;
            return;
        }
        if (g.inputRouter.menuPressLatched) {
            g.inputRouter.menuPressLatched = false;
            g.startNewGame();
        }
    }
}
