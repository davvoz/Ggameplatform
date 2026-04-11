/**
 * Input manager — handles touch and keyboard input.
 * Floating virtual joystick: appears where you touch, analog movement.
 * Inspired by Survivor Arena's mobile controls.
 */
export class InputManager {
    #keys = new Set();
    #touchActive = false;
    #touchId = null;
    #touchStartX = 0;
    #touchStartY = 0;
    #touchCurrentX = 0;
    #touchCurrentY = 0;
    #dx = 0;
    #dy = 0;
    #renderer;
    #joystickDeadzone = 8;
    #joystickMaxDist = 40;
    #tapCallbacks = [];

    /** Joystick visual state (in canvas/design coordinates). */
    joystickVisible = false;
    joystickBaseX = 0;
    joystickBaseY = 0;
    joystickThumbX = 0;
    joystickThumbY = 0;

    constructor(renderer) {
        this.#renderer = renderer;
        this.#setupKeyboard();
        this.#setupTouch();
    }

    get dx() { return this.#dx; }
    get dy() { return this.#dy; }

    onTap(callback) {
        this.#tapCallbacks.push(callback);
    }

    clearTapCallbacks() {
        this.#tapCallbacks = [];
    }

    update() {
        this.#dx = 0;
        this.#dy = 0;

        // Keyboard (binary)
        if (this.#keys.has('ArrowLeft') || this.#keys.has('KeyA')) this.#dx -= 1;
        if (this.#keys.has('ArrowRight') || this.#keys.has('KeyD')) this.#dx += 1;
        if (this.#keys.has('ArrowUp') || this.#keys.has('KeyW')) this.#dy -= 1;
        if (this.#keys.has('ArrowDown') || this.#keys.has('KeyS')) this.#dy += 1;

        // Touch joystick (analog, overrides keyboard if active)
        if (this.#touchActive) {
            const rawDx = this.#touchCurrentX - this.#touchStartX;
            const rawDy = this.#touchCurrentY - this.#touchStartY;
            const dist = Math.hypot(rawDx, rawDy);

            if (dist > this.#joystickDeadzone) {
                const clampedDist = Math.min(dist, this.#joystickMaxDist);
                const normX = rawDx / dist;
                const normY = rawDy / dist;
                const strength = clampedDist / this.#joystickMaxDist;
                this.#dx = normX * strength;
                this.#dy = normY * strength;

                // Update thumb visual position
                this.joystickThumbX = this.#touchStartX + normX * clampedDist;
                this.joystickThumbY = this.#touchStartY + normY * clampedDist;
            } else {
                // Inside dead zone — no movement, thumb at center
                this.joystickThumbX = this.#touchStartX;
                this.joystickThumbY = this.#touchStartY;
            }
            return; // skip keyboard normalize when touch is active
        }

        // Normalize diagonal (keyboard only)
        if (this.#dx !== 0 && this.#dy !== 0) {
            const inv = 1 / Math.SQRT2;
            this.#dx *= inv;
            this.#dy *= inv;
        }
    }

    isKeyDown(code) {
        return this.#keys.has(code);
    }

    #setupKeyboard() {
        globalThis.addEventListener('keydown', (e) => {
            this.#keys.add(e.code);
        });
        globalThis.addEventListener('keyup', (e) => {
            this.#keys.delete(e.code);
        });
    }

    #setupTouch() {
        const canvas = this.#renderer.canvas;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Only track one touch for joystick
            if (this.#touchActive) return;

            const touch = e.changedTouches[0];
            this.#touchId = touch.identifier;
            const pos = this.#renderer.pageToCanvas(touch.pageX, touch.pageY);

            this.#touchActive = true;
            this.#touchStartX = pos.x;
            this.#touchStartY = pos.y;
            this.#touchCurrentX = pos.x;
            this.#touchCurrentY = pos.y;

            // Visual state
            this.joystickVisible = true;
            this.joystickBaseX = pos.x;
            this.joystickBaseY = pos.y;
            this.joystickThumbX = pos.x;
            this.joystickThumbY = pos.y;

            for (const cb of this.#tapCallbacks) {
                cb(pos.x, pos.y);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.#touchActive) return;

            const touch = Array.from(e.changedTouches).find(
                t => t.identifier === this.#touchId
            );
            if (!touch) return;

            const pos = this.#renderer.pageToCanvas(touch.pageX, touch.pageY);
            this.#touchCurrentX = pos.x;
            this.#touchCurrentY = pos.y;
        }, { passive: false });

        const handleTouchEnd = (e) => {
            if (!this.#touchActive) return;
            const touch = Array.from(e.changedTouches).find(
                t => t.identifier === this.#touchId
            );
            if (!touch) return;

            e.preventDefault();
            this.#touchActive = false;
            this.#touchId = null;
            this.joystickVisible = false;
        };

        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        // Mouse fallback for testing
        canvas.addEventListener('mousedown', (e) => {
            const pos = this.#renderer.pageToCanvas(e.pageX, e.pageY);
            this.#touchActive = true;
            this.#touchStartX = pos.x;
            this.#touchStartY = pos.y;
            this.#touchCurrentX = pos.x;
            this.#touchCurrentY = pos.y;

            this.joystickVisible = true;
            this.joystickBaseX = pos.x;
            this.joystickBaseY = pos.y;
            this.joystickThumbX = pos.x;
            this.joystickThumbY = pos.y;

            for (const cb of this.#tapCallbacks) {
                cb(pos.x, pos.y);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.#touchActive) return;
            const pos = this.#renderer.pageToCanvas(e.pageX, e.pageY);
            this.#touchCurrentX = pos.x;
            this.#touchCurrentY = pos.y;
        });

        canvas.addEventListener('mouseup', () => {
            this.#touchActive = false;
            this.joystickVisible = false;
        });
    }
}
