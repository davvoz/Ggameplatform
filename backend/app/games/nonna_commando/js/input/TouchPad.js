import { Btn } from '../sim/Buttons.js';

/**
 * On-screen controls for phones: a floating stick on the left half (it
 * appears where the thumb lands) and FIRE, JUMP and BOMB on the right, sized
 * for thumbs and placed in the corners, away from the action. Several fingers
 * at once are fine: each pointer is tracked on its own.
 */
const STICK_RADIUS = 46;
const DEAD = 0.32;

export class TouchPad {
    #root;
    #controls;
    #stick;
    #knob;
    /** pointerId -> bit or 'stick' */
    #pointers = new Map();
    #stickId = null;
    #stickOrigin = { x: 0, y: 0 };
    #stickBits = 0;
    #enabled = false;

    /**
     * @param {HTMLElement} root the #touch layer
     * @param {import('./Controls.js').Controls} controls
     */
    constructor(root, controls) {
        this.#root = root;
        this.#controls = controls;
        this.#stick = root.querySelector('.stick');
        this.#knob = root.querySelector('.knob');
        const zone = root.querySelector('.stick-zone');

        zone.addEventListener('pointerdown', (e) => this.#stickDown(e));
        for (const button of root.querySelectorAll('[data-btn]')) {
            const bit = Btn[button.dataset.btn];
            button.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                button.setPointerCapture(e.pointerId);
                this.#pointers.set(e.pointerId, bit);
                button.classList.add('down');
                this.#push();
            });
            const up = (e) => {
                if (!this.#pointers.has(e.pointerId)) return;
                this.#pointers.delete(e.pointerId);
                button.classList.remove('down');
                this.#push();
            };
            button.addEventListener('pointerup', up);
            button.addEventListener('pointercancel', up);
            button.addEventListener('lostpointercapture', up);
        }
        root.addEventListener('pointermove', (e) => this.#stickMove(e));
        root.addEventListener('pointerup', (e) => this.#stickUp(e));
        root.addEventListener('pointercancel', (e) => this.#stickUp(e));
        root.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /** Show the controls only while playing on a touch device. */
    setVisible(visible) {
        this.#enabled = visible;
        this.#root.classList.toggle('on', visible);
        if (!visible) this.reset();
    }

    reset() {
        this.#pointers.clear();
        this.#stickId = null;
        this.#stickBits = 0;
        this.#stick.classList.remove('live');
        for (const b of this.#root.querySelectorAll('.down')) b.classList.remove('down');
        this.#controls.clearTouch();
    }

    #stickDown(e) {
        if (!this.#enabled || this.#stickId !== null) return;
        e.preventDefault();
        this.#stickId = e.pointerId;
        this.#root.setPointerCapture?.(e.pointerId);
        const rect = this.#root.getBoundingClientRect();
        this.#stickOrigin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.#stick.style.left = `${this.#stickOrigin.x}px`;
        this.#stick.style.top = `${this.#stickOrigin.y}px`;
        this.#stick.classList.add('live');
        this.#stickMove(e);
    }

    #stickMove(e) {
        if (e.pointerId !== this.#stickId) return;
        const rect = this.#root.getBoundingClientRect();
        let dx = e.clientX - rect.left - this.#stickOrigin.x;
        let dy = e.clientY - rect.top - this.#stickOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > STICK_RADIUS) {
            // the stick follows a thumb that slides too far
            this.#stickOrigin.x += (dx / len) * (len - STICK_RADIUS);
            this.#stickOrigin.y += (dy / len) * (len - STICK_RADIUS);
            this.#stick.style.left = `${this.#stickOrigin.x}px`;
            this.#stick.style.top = `${this.#stickOrigin.y}px`;
            dx = (dx / len) * STICK_RADIUS;
            dy = (dy / len) * STICK_RADIUS;
        }
        this.#knob.style.transform = `translate(${dx}px, ${dy}px)`;
        const nx = dx / STICK_RADIUS;
        const ny = dy / STICK_RADIUS;
        let bits = 0;
        if (nx < -DEAD) bits |= Btn.LEFT;
        if (nx > DEAD) bits |= Btn.RIGHT;
        // vertical needs a clearer push, so running is never mistaken for crouching
        if (ny < -DEAD * 1.6) bits |= Btn.UP;
        if (ny > DEAD * 1.6) bits |= Btn.DOWN;
        this.#stickBits = bits;
        this.#push();
    }

    #stickUp(e) {
        if (e.pointerId !== this.#stickId) return;
        this.#stickId = null;
        this.#stickBits = 0;
        this.#knob.style.transform = '';
        this.#stick.classList.remove('live');
        this.#stick.style.left = '';
        this.#stick.style.top = '';
        this.#push();
    }

    #push() {
        let bits = this.#stickBits;
        for (const bit of this.#pointers.values()) bits |= bit;
        this.#controls.setTouch(bits);
    }
}
