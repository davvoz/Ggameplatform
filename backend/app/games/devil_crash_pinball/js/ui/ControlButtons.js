/**
 * Overlay control panel with two HTML action buttons:
 *  - Ball Rescue: teleports the ball back to spawn (no ball consumed).
 *  - Tilt: nudges the table, same mechanic as pressing T on keyboard.
 *
 * Buttons are HTML elements positioned absolutely inside #game-container so
 * they scale with the CSS-scaled canvas.  They capture pointer events before
 * the canvas sees them, so touching them never triggers game input zones.
 *
 * SRP: owns only the DOM lifecycle of the two buttons and their visibility.
 * Game-logic callbacks are injected via constructor (Dependency Inversion).
 */
export class ControlButtons {
    /**
     * @param {HTMLElement} container - The wrapper element (#game-container).
     * @param {() => void} onRescue   - Called when the ball-rescue button is clicked.
     * @param {() => void} onTilt     - Called when the tilt button is clicked.
     */
    constructor(container, onRescue, onTilt) {
        this._panel = this._buildPanel(onRescue, onTilt);
        container.appendChild(this._panel);
    }

    /** Show the panel. Call when entering PLAY state. */
    show() {
        this._panel.hidden = false;
    }

    /** Hide the panel. Call when leaving PLAY state. */
    hide() {
        this._panel.hidden = true;
    }

    /** Remove DOM elements and release references. */
    destroy() {
        this._panel.remove();
    }

    // ── Private ────────────────────────────────────────────────────────────────

    /** Build the panel container with both buttons inside. @private */
    _buildPanel(onRescue, onTilt) {
        const panel = document.createElement('div');
        panel.className = 'ctrl-panel';
        panel.hidden    = true;

        panel.appendChild(this._createButton('ctrl-btn ctrl-rescue', '⟳', 'RESET',  onRescue));
        panel.appendChild(this._createButton('ctrl-btn ctrl-tilt',   '⚡', 'TILT',   onTilt));

        return panel;
    }

    /**
     * Create a single styled button.
     * @param {string}   cssClass - Space-separated class names.
     * @param {string}   icon     - Unicode icon (decorative).
     * @param {string}   label    - Visible label and aria-label.
     * @param {Function} onClick  - Click handler.
     * @returns {HTMLButtonElement}
     * @private
     */
    _createButton(cssClass, icon, label, onClick) {
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = cssClass;
        btn.setAttribute('aria-label', label);
        btn.innerHTML =
            `<span class="ctrl-icon" aria-hidden="true">${icon}</span>` +
            `<span class="ctrl-label">${label}</span>`;
        btn.addEventListener('click', onClick);
        return btn;
    }
}
