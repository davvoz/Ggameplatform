import { IState } from '../core/IState.js';
import { MainMenuState } from './MainMenuState.js';

/**
 * Entry state. Warms up the loader with the default car so the main menu can
 * show its preview instantly, then hands over. Holds no gameplay logic.
 */
export class BootState extends IState {
    enter() {
        this._boot();
    }

    async _boot() {
        const car = this.ctx.catalog.first();
        try {
            await this.ctx.models.load(car.modelUrl);
        } catch (err) {
            // Non-fatal: the menu will surface load errors per-car.
            console.warn('[cur8rancing] preload failed', err);
        }
        this.ctx.go(new MainMenuState(this.ctx));
    }
}
