import { GameStateHandler } from './GameStateHandler.js';
import { GameState }        from '../GameState.js';

/**
 * ATTRACT and GAME_OVER. Waits out the menu input guard, then watches for
 * a menu-press latched this frame by {@link InputRouter}.
 *
 * On ATTRACT a tap anywhere starts the game (intro screen UX). On GAME_OVER
 * the user must explicitly choose REPLAY or MAIN MENU via the on-screen
 * buttons \u2014 tapping outside the buttons does nothing, to avoid accidental
 * restarts after a long session.
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
            // Only ATTRACT auto-starts on tap-anywhere. GAME_OVER waits for an
            // explicit button choice (REPLAY / MAIN MENU), routed via HUD.
            if (g.state === GameState.ATTRACT) g.startNewGame();
        }
    }
}
