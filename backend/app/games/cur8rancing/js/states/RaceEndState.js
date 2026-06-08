import { IState } from '../core/IState.js';
import { ResultView } from '../ui/ResultView.js';
import { LoadingRaceState } from './LoadingRaceState.js';
import { MainMenuState } from './MainMenuState.js';

/**
 * Race finished. Shows the result, reports the final score to the platform
 * exactly once, and offers restart or menu. Cars remain visible underneath the
 * overlay (no per-frame work here).
 */
export class RaceEndState extends IState {
    enter() {
        const result = this.ctx.session.result;
        this._view = new ResultView(this.ctx.ui, {
            onRestart: () => this.ctx.go(new LoadingRaceState(this.ctx)),
            onMenu: () => this._toMenu(),
        });
        this._view.render(result);
        this._report(result);
    }

    exit() {
        this._view.dispose();
    }

    _report(result) {
        this.ctx.bridge.gameOver(result.computeScore(), {
            position: result.position,
            timeSeconds: Math.round(result.timeSeconds * 100) / 100,
            bestLapSeconds: Math.round(result.bestLapSeconds * 100) / 100,
            achievements: result.achievements(),
        });
    }

    _toMenu() {
        const race = this.ctx.session.race;
        if (race) race.dispose();
        this.ctx.session.race = null;
        this.ctx.go(new MainMenuState(this.ctx));
    }
}
