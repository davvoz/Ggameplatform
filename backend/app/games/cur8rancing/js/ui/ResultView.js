import { el, button } from './Dom.js';
import { Hud } from './Hud.js';

/**
 * Race-end overlay: shows finishing position, total time and best lap, then
 * offers restart or return-to-menu. Pure view; the owning state supplies the
 * result and handles the callbacks.
 */
export class ResultView {
    /**
     * @param {HTMLElement} root overlay container
     * @param {{onRestart:Function,onMenu:Function}} handlers
     */
    constructor(root, handlers) {
        this._root = root;
        this._panel = el('div', 'result');
        this._title = el('h1', 'result__title');
        this._panel.appendChild(this._title);

        this._pos = this._line('POSITION');
        this._time = this._line('TIME');
        this._best = this._line('BEST LAP');

        const actions = el('div', 'result__actions');
        actions.appendChild(button('btn btn--primary', 'RACE AGAIN', handlers.onRestart));
        actions.appendChild(button('btn', 'MENU', handlers.onMenu));
        this._panel.appendChild(actions);
        root.appendChild(this._panel);
    }

    _line(label) {
        const row = el('div', 'result__line');
        row.appendChild(el('span', 'result__label', label));
        const value = el('span', 'result__value', '-');
        row.appendChild(value);
        this._panel.appendChild(row);
        return value;
    }

    /**
     * @param {import('../race/RaceResult.js').RaceResult} result
     */
    render(result) {
        this._title.textContent = result.won ? 'YOU WIN!' : 'FINISHED';
        this._pos.textContent = `${result.position} / ${result.totalCars}`;
        this._time.textContent = Hud.formatTime(result.timeSeconds);
        this._best.textContent = Hud.formatTime(result.bestLapSeconds);
    }

    dispose() {
        this._panel.remove();
    }
}
