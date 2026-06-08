import { IState } from '../core/IState.js';
import { CountdownView } from '../ui/CountdownView.js';
import { RaceState } from './RaceState.js';

/**
 * Pre-race countdown. Freezes the cars (no input sampled, no physics) while the
 * chase camera sits behind the player. Drives 3-2-1-GO from config timings,
 * then starts the race.
 */
export class CountdownState extends IState {
    enter() {
        this._view = new CountdownView(this.ctx.ui);
        this._elapsed = 0;
        const c = this.ctx.config.COUNTDOWN;
        this._stepTotal = c.STEPS.length * c.STEP_TIME;
        this._end = this._stepTotal + c.GO_TIME;

        const race = this.ctx.session.race;
        race.chaseCamera.snap(this.ctx.renderer.camera, race.player);
    }

    update(dt) {
        this._elapsed += dt;
        this._view.show(this._label());
        if (this._elapsed >= this._end) this.ctx.go(new RaceState(this.ctx));
    }

    exit() {
        this._view.dispose();
    }

    _label() {
        const c = this.ctx.config.COUNTDOWN;
        if (this._elapsed >= this._stepTotal) return 'GO!';
        return String(c.STEPS[Math.floor(this._elapsed / c.STEP_TIME)]);
    }
}
