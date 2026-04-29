import { GameConfig as C } from '../config/GameConfig.js';

/**
 * Touch + keyboard input. Touch zones split canvas in half: left flipper /
 * right flipper. Tap on launcher zone (bottom-right corner) launches ball
 * when IDLE.
 *
 * MOUSE is intentionally NOT used for gameplay. The mouse stays free for
 * UI confirmations and other on-screen buttons. Only `touch` and `pen`
 * pointer types are accepted on the canvas.
 *
 * Reports state via flags; consumed by Game each frame.
 */
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.left = false;
        this.right = false;
        this.launchPressed = false;   // edge: set true on press, consumed once
        this.launchHeld = false;      // steady: true while launch zone or Space is held
        this.tiltPressed = false;
        this.escPressed = false;
        this._spaceDown = false;
        this._pointerLaunchActive = false;
        this._activePointers = new Map(); // pointerId -> 'left'|'right'|'launch'|'hud'
        // Last pointer-down position (normalised 0–1) for HUD button hit-testing.
        this._lastTapPos = null;
        this._bind();
    }

    _bind() {
        this._kd = (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                this.escPressed = true;
                return;
            }
            if (e.code === C.INPUT_LEFT_KEY) this.left = true;
            else if (e.code === C.INPUT_RIGHT_KEY) this.right = true;
            else if (e.code === C.INPUT_LAUNCH_KEY) {
                if (!this._spaceDown) this.launchPressed = true;
                this._spaceDown = true;
                this._recomputeLaunchHeld();
            }
            else if (e.code === C.INPUT_TILT_KEY) this.tiltPressed = true;
        };
        this._ku = (e) => {
            if (e.code === C.INPUT_LEFT_KEY) this.left = false;
            else if (e.code === C.INPUT_RIGHT_KEY) this.right = false;
            else if (e.code === C.INPUT_LAUNCH_KEY) {
                this._spaceDown = false;
                this._recomputeLaunchHeld();
            }
        };
        this._pd = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const xN = (e.clientX - rect.left) / rect.width;
            const yN = (e.clientY - rect.top)  / rect.height;
            // Always record tap position so Game can hit-test HUD buttons.
            this._lastTapPos = { x: xN, y: yN };
            // MOUSE: only fires launch edge for menu dismissal.
            // Excluded from top-bar so clicking HUD buttons doesn't start a launch.
            if (e.pointerType === 'mouse') {
                if (yN >= C.HUD_ZONE_Y) this.launchPressed = true;
                return;
            }
            e.preventDefault();
            const zone = this._zoneFor(e);
            this._activePointers.set(e.pointerId, zone);
            this._apply();
        };
        this._pu = (e) => {
            if (e.pointerType === 'mouse') return;
            e.preventDefault();
            this._activePointers.delete(e.pointerId);
            this._apply();
        };
        this._pm = (e) => {
            if (e.pointerType === 'mouse') return;
            if (!this._activePointers.has(e.pointerId)) return;
            const zone = this._zoneFor(e);
            this._activePointers.set(e.pointerId, zone);
            this._apply();
        };

        globalThis.addEventListener('keydown', this._kd);
        globalThis.addEventListener('keyup', this._ku);
        // Reset all transient flags when the window/tab loses focus, the user
        // alt-tabs, or fullscreen state changes. Without this, a flipper key
        // held during a focus change stays "stuck" (no keyup ever fires)
        // and the game appears frozen with the flipper raised.
        this._reset = () => this._resetAllInputs();
        globalThis.addEventListener('blur', this._reset);
        globalThis.addEventListener('visibilitychange', this._reset);
        document.addEventListener('fullscreenchange', this._reset);
        this.canvas.addEventListener('pointerdown', this._pd, { passive: false });
        this.canvas.addEventListener('pointerup', this._pu, { passive: false });
        this.canvas.addEventListener('pointercancel', this._pu, { passive: false });
        this.canvas.addEventListener('pointermove', this._pm, { passive: false });
    }

    /**
     * Clear all transient input state. Called on focus loss / fullscreen
     * change to avoid "stuck key" glitches (held flipper that never releases,
     * queued ESC that pauses the game right after exiting fullscreen, etc.).
     */
    _resetAllInputs() {
        this.left = false;
        this.right = false;
        this.launchPressed = false;
        this.launchHeld = false;
        this.tiltPressed = false;
        this.escPressed = false;
        this._spaceDown = false;
        this._pointerLaunchActive = false;
        this._activePointers.clear();
        this._lastTapPos = null;
    }

    _zoneFor(e) {
        const rect = this.canvas.getBoundingClientRect();
        const xN = (e.clientX - rect.left) / rect.width;
        const yN = (e.clientY - rect.top) / rect.height;
        // Top-bar guard: HUD button area — must not trigger flippers.
        if (yN < C.HUD_ZONE_Y) return 'hud';
        // Right portion + lower portion -> launch (large area, easy to find)
        if (xN > C.LAUNCH_ZONE_X && yN > C.LAUNCH_ZONE_Y) return 'launch';
        return xN < 0.5 ? 'left' : 'right';
    }

    _apply() {
        let l = false, r = false, launchActive = false;
        for (const v of this._activePointers.values()) {
            if (v === 'left') l = true;
            else if (v === 'right') r = true;
            else if (v === 'launch') launchActive = true;
        }
        this.left = l;
        this.right = r;
        // launch edge
        if (launchActive && !this._pointerLaunchActive) this.launchPressed = true;
        this._pointerLaunchActive = launchActive;
        this._recomputeLaunchHeld();
    }

    _recomputeLaunchHeld() {
        this.launchHeld = !!this._spaceDown || !!this._pointerLaunchActive;
    }

    consumeLaunch() {
        const v = this.launchPressed;
        this.launchPressed = false;
        return v;
    }

    consumeTilt() {
        const v = this.tiltPressed;
        this.tiltPressed = false;
        return v;
    }

    consumeEsc() {
        const v = this.escPressed;
        this.escPressed = false;
        return v;
    }

    /**
     * Programmatically request a tilt (e.g. from an on-screen button).
     * Sets the same flag that the T key sets; consumed by the game loop
     * on the next frame via consumeTilt().
     */
    requestTilt() {
        this.tiltPressed = true;
    }

    /**
     * Consume and return the last pointer-down canvas position (normalised 0–1).
     * Used by Game to hit-test HUD action buttons each frame.
     * Returns null if no new tap occurred since last call.
     * @returns {{ x: number, y: number } | null}
     */
    consumeCanvasTap() {
        const v = this._lastTapPos;
        this._lastTapPos = null;
        return v;
    }

    destroy() {
        globalThis.removeEventListener('keydown', this._kd);
        globalThis.removeEventListener('keyup', this._ku);
        globalThis.removeEventListener('blur', this._reset);
        globalThis.removeEventListener('visibilitychange', this._reset);
        document.removeEventListener('fullscreenchange', this._reset);
        this.canvas.removeEventListener('pointerdown', this._pd);
        this.canvas.removeEventListener('pointerup', this._pu);
        this.canvas.removeEventListener('pointercancel', this._pu);
        this.canvas.removeEventListener('pointermove', this._pm);
    }
}
