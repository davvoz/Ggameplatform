import { el } from './Dom.js';

/**
 * Full-screen countdown overlay (3 / 2 / 1 / GO). The owning state drives the
 * displayed text; this view only renders and animates a pulse on change.
 */
export class CountdownView {
    /** @param {HTMLElement} root overlay container */
    constructor(root) {
        this._root = root;
        this._node = el('div', 'countdown');
        root.appendChild(this._node);
        this._last = null;
    }

    /** @param {string} text */
    show(text) {
        if (this._last === text) return;
        this._last = text;
        this._node.textContent = text;
        this._node.classList.remove('countdown--pulse');
        // Force reflow so the CSS animation restarts on every change.
        this._node.getBoundingClientRect();
        this._node.classList.add('countdown--pulse');
    }

    dispose() {
        this._node.remove();
    }
}
