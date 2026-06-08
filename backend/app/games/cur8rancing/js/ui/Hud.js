import { el, holdable } from './Dom.js';

/**
 * Heads-up display: speed, lap, position and timer, plus on-screen touch
 * controls. Text is updated by diffing to avoid layout thrash; the owning
 * state throttles calls to {@link Hud#update}.
 */
export class Hud {
    /**
     * @param {HTMLElement} root overlay container
     * @param {import('../input/InputManager.js').InputManager} input
     */
    constructor(root, input) {
        this._root = root;
        this._wrap = el('div', 'hud');

        this._speed = this._stat('SPEED', 'km/h');
        this._lap = this._stat('LAP', '');
        this._pos = this._stat('POS', '');
        this._time = this._stat('TIME', '');

        this._cache = { speed: '', lap: '', pos: '', time: '' };
        this._buildTouch(input);
        root.appendChild(this._wrap);
    }

    _stat(label, unit) {
        const box = el('div', 'hud__stat');
        box.appendChild(el('span', 'hud__label', label));
        const value = el('span', 'hud__value', '0');
        box.appendChild(value);
        if (unit) box.appendChild(el('span', 'hud__unit', unit));
        this._wrap.appendChild(box);
        return value;
    }

    _buildTouch(input) {
        const pad = el('div', 'touch');
        pad.appendChild(this._pedal('‹', 'left', input));
        pad.appendChild(this._pedal('›', 'right', input));
        pad.appendChild(this._pedal('GAS', 'up', input));
        pad.appendChild(this._pedal('BRK', 'down', input));
        this._root.appendChild(pad);
        this._pad = pad;
    }

    _pedal(text, dir, input) {
        const b = el('button', 'touch__btn', text);
        b.type = 'button';
        holdable(b, (active) => input.setTouch(dir, active));
        return b;
    }

    /**
     * @param {{speed:number,lap:number,laps:number,position:number,total:number,time:number}} d
     */
    update(d) {
        this._set('speed', this._speed, Math.round(d.speed));
        this._set('lap', this._lap, `${d.lap}/${d.laps}`);
        this._set('pos', this._pos, `${d.position}/${d.total}`);
        this._set('time', this._time, Hud.formatTime(d.time));
    }

    _set(key, node, value) {
        const str = String(value);
        if (this._cache[key] !== str) {
            this._cache[key] = str;
            node.textContent = str;
        }
    }

    /** @param {number} seconds @returns {string} mm:ss.cs */
    static formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.floor((seconds * 100) % 100);
        return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }

    dispose() {
        this._wrap.remove();
        this._pad.remove();
    }
}
