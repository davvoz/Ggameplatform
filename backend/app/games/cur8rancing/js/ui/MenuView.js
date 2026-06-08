import { el, button } from './Dom.js';

/**
 * Car selection overlay. Pure view: renders the current car's stats and emits
 * navigation/start intents through callbacks. The owning state keeps the index.
 */
export class MenuView {
    /**
     * @param {HTMLElement} root overlay container
     * @param {{onPrev:Function,onNext:Function,onStart:Function}} handlers
     */
    constructor(root, handlers) {
        this._root = root;
        this._panel = el('div', 'menu');
        this._panel.appendChild(el('h1', 'menu__title', 'CUR8 RACING'));

        this._name = el('div', 'menu__car');
        this._panel.appendChild(this._name);

        this._bars = {
            speed: this._addBar('SPEED'),
            accel: this._addBar('ACCEL'),
            grip: this._addBar('GRIP'),
        };

        const nav = el('div', 'menu__nav');
        nav.appendChild(button('btn', '‹', handlers.onPrev));
        nav.appendChild(button('btn', '›', handlers.onNext));
        this._panel.appendChild(nav);

        this._panel.appendChild(button('btn btn--primary', 'RACE', handlers.onStart));
        root.appendChild(this._panel);
    }

    _addBar(label) {
        const row = el('div', 'bar');
        row.appendChild(el('span', 'bar__label', label));
        const track = el('div', 'bar__track');
        const fill = el('div', 'bar__fill');
        track.appendChild(fill);
        row.appendChild(track);
        this._panel.appendChild(row);
        return fill;
    }

    /**
     * @param {import('../domain/CarModel.js').CarModel} model
     */
    render(model) {
        this._name.textContent = model.name;
        this._bars.speed.style.width = `${model.statRatio('speed') * 100}%`;
        this._bars.accel.style.width = `${model.statRatio('accel') * 100}%`;
        this._bars.grip.style.width = `${model.statRatio('grip') * 100}%`;
    }

    dispose() {
        this._panel.remove();
    }
}
