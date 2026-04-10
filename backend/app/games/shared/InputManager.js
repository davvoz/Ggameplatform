import Vector2 from './Vector2.js';

/**
 * Base InputManager - Keyboard + Canvas-based touch input (joystick + fire).
 * Subclasses add game-specific ability buttons and rendering.
 */
export class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = new Map();
        this.touch = { active: false, joystick: new Vector2(0, 0), fire: false };

        // Joystick
        this.joystickCenter = new Vector2(0, 0);
        this.joystickStickPos = new Vector2(0, 0);
        this.joystickBaseRadius = 55;
        this.joystickStickRadius = 25;
        this.joystickMaxDistance = 35;
        this.joystickTouchId = null;

        // Fire button
        this.fireButtonPressed = false;
        this.fireButtonTouchId = null;

        // Positions (set in updateLayout)
        this.joystickPos = { x: 0, y: 0 };
        this.fireButtonPos = { x: 0, y: 0, radius: 45 };

        this.isMobile = this._detectMobile();
        this._init();
    }

    _detectMobile() {
        return ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0);
    }

    _init() {
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
        if (this.isMobile) this._initTouchControls();
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _initTouchControls() {
        const c = this.game.canvas;
        c.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        c.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        c.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        c.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
    }

    // ── Layout ───────────────────────────────────────────────────

    updateLayout(w, h) {
        const pad = 25, bottom = 30;
        this.joystickPos = {
            x: pad + this.joystickBaseRadius,
            y: h - bottom - this.joystickBaseRadius
        };
        this.joystickCenter.set(this.joystickPos.x, this.joystickPos.y);

        this.fireButtonPos = {
            x: w - pad - this.fireButtonPos.radius,
            y: h - bottom - this.fireButtonPos.radius,
            radius: 45
        };
        this._updateExtraLayout(w, h);
    }

    /** Override to position extra ability buttons. */
    _updateExtraLayout(_w, _h) {}

    // ── Coordinate helpers ───────────────────────────────────────

    _getTouchCoords(touch) {
        const c = this.game.canvas;
        const r = c.getBoundingClientRect();
        return {
            x: (touch.clientX - r.left) * (c.width / r.width),
            y: (touch.clientY - r.top) * (c.height / r.height)
        };
    }

    _isInJoystickZone(x, y) {
        return Math.hypot(x - this.joystickPos.x, y - this.joystickPos.y) < this.joystickBaseRadius * 1.5;
    }

    _isInFireButton(x, y) {
        return Math.hypot(x - this.fireButtonPos.x, y - this.fireButtonPos.y) < this.fireButtonPos.radius * 1.3;
    }

    // ── Touch events ─────────────────────────────────────────────

    /** Override to widen the allowed game states for touch. */
    _canProcessTouch() {
        return this.game.state === 'playing';
    }

    _onTouchStart(e) {
        if (!this._canProcessTouch()) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const c = this._getTouchCoords(t);

            if (this.joystickTouchId === null && this._isInJoystickZone(c.x, c.y)) {
                e.preventDefault();
                this.joystickTouchId = t.identifier;
                this.touch.active = true;
                this._updateJoystick(c.x, c.y);
                continue;
            }

            if (this.fireButtonTouchId === null && this._isInFireButton(c.x, c.y)) {
                e.preventDefault();
                this.fireButtonTouchId = t.identifier;
                this.fireButtonPressed = true;
                this.touch.fire = true;
                continue;
            }

            if (this._onExtraTouchStart(e, t, c)) continue;
        }
    }

    /** Override to handle extra ability button touch starts. Return true if handled. */
    _onExtraTouchStart(_e, _touch, _coords) { return false; }

    _onTouchMove(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.joystickTouchId) {
                e.preventDefault();
                const c = this._getTouchCoords(t);
                this._updateJoystick(c.x, c.y);
            }
        }
    }

    _onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];

            if (t.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.touch.active = false;
                this.touch.joystick.set(0, 0);
                this.joystickStickPos.set(this.joystickPos.x, this.joystickPos.y);
            }

            if (t.identifier === this.fireButtonTouchId) {
                this.fireButtonTouchId = null;
                this.fireButtonPressed = false;
                this.touch.fire = false;
            }

            this._onExtraTouchEnd(t);
        }
    }

    /** Override to handle extra ability button touch ends. */
    _onExtraTouchEnd(_touch) {}

    // ── Joystick ─────────────────────────────────────────────────

    _updateJoystick(touchX, touchY) {
        const dx = touchX - this.joystickPos.x;
        const dy = touchY - this.joystickPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > this.joystickMaxDistance) {
            const angle = Math.atan2(dy, dx);
            this.joystickStickPos.set(
                this.joystickPos.x + Math.cos(angle) * this.joystickMaxDistance,
                this.joystickPos.y + Math.sin(angle) * this.joystickMaxDistance
            );
            this.touch.joystick.set(Math.cos(angle), Math.sin(angle));
        } else {
            this.joystickStickPos.set(touchX, touchY);
            if (dist > 5) {
                this.touch.joystick.set(dx / this.joystickMaxDistance, dy / this.joystickMaxDistance);
            } else {
                this.touch.joystick.set(0, 0);
            }
        }
    }

    // ── Keyboard ─────────────────────────────────────────────────

    _onKeyDown(e) {
        this.keys.set(e.code, true);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        this.keys.set(e.code, false);
    }

    isKeyPressed(code) {
        return this.keys.get(code) || false;
    }

    // ── Game input queries ───────────────────────────────────────

    getMovementDirection() {
        if (this.touch.active) {
            return this.touch.joystick.copy();
        }

        let x = 0, y = 0;
        if (this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA')) x -= 1;
        if (this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD')) x += 1;
        if (this.isKeyPressed('ArrowUp') || this.isKeyPressed('KeyW')) y -= 1;
        if (this.isKeyPressed('ArrowDown') || this.isKeyPressed('KeyS')) y += 1;

        const dir = new Vector2(x, y);
        return dir.magnitude() > 1 ? dir.normalize() : dir;
    }

    isFiring() {
        return this.touch.fire || this.fireButtonPressed || this.isKeyPressed('Space');
    }

    // ── Reset ────────────────────────────────────────────────────

    reset() {
        this.keys.clear();
        this.touch.active = false;
        this.touch.joystick.set(0, 0);
        this.touch.fire = false;
        this.joystickTouchId = null;
        this.fireButtonTouchId = null;
        this.fireButtonPressed = false;
        this.joystickStickPos.set(this.joystickPos.x, this.joystickPos.y);
        this._resetExtra();
    }

    /** Override to reset extra ability button state. */
    _resetExtra() {}
}
