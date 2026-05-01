import { GameState }   from './GameState.js';
import { InputAction } from '../input/InputManager.js';
import { PerformanceMode } from '../config/PerformanceMode.js';

const HUD_ACTIONS = Object.freeze({
    rescue: (g) => g.rescueBall(),
    tilt:   (g) => g.input.requestTilt(),
    bgm:    (g) => g.audio.toggleBgm(),
    sfx:    (g) => g.audio.toggleMute(),
    pause:  (g) => g.togglePause(),
    perf:   (_g) => PerformanceMode.toggle(),
    replay: (g) => g.replayGame(),
    home:   (g) => g.exitToShell(),
});

/**
 * Drains the InputManager event queue once per frame and routes each event
 * to the appropriate subsystem.
 *
 * SRP: knows the semantics of every input event in one place. State handlers
 * never read input directly \u2014 they observe the side-effects (charging flag,
 * pause toggled, menu-press latched).
 */
export class InputRouter {
    /** @param {import('./Game.js').Game} game */
    constructor(game) {
        this._game = game;
        /** Latched true for one frame when a menu-dismiss event occurs. */
        this.menuPressLatched = false;
    }

    /** Drain queue and route every event. Called once per frame from Game. */
    processEvents() {
        this.menuPressLatched = false;
        for (const ev of this._game.input.poll()) this._route(ev);
    }

    /** @private */
    _route(ev) {
        if (ev.action === InputAction.TAP && ev.hudButton) {
            this._dispatchHud(ev.hudButton);
            return;
        }
        if (ev.action === InputAction.ESC) {
            this._game.togglePause();
            return;
        }
        if (ev.action === InputAction.TILT) {
            this._game.tilt.handle();
            return;
        }
        if (this._isPlungerCharge(ev) && this._game.state === GameState.BALL_READY) {
            this._game.plunger.startCharging();
            return;
        }
        if (this._isMenuDismiss(ev) && this._isMenuState()) {
            this.menuPressLatched = true;
        }
    }

    /** @private */
    _dispatchHud(buttonId) {
        const action = HUD_ACTIONS[buttonId];
        if (!action) throw new Error(`[InputRouter] Unknown HUD button "${buttonId}"`);
        action(this._game);
    }

    /** @private */
    _isPlungerCharge(ev) {
        return ev.action === InputAction.LAUNCH_KEY
            || (ev.action === InputAction.TAP && ev.zone === 'launch');
    }

    /** @private */
    _isMenuDismiss(ev) {
        return ev.action === InputAction.LAUNCH_KEY
            || (ev.action === InputAction.TAP && ev.zone !== 'hud');
    }

    /** @private */
    _isMenuState() {
        return this._game.state === GameState.ATTRACT
            || this._game.state === GameState.GAME_OVER;
    }
}
