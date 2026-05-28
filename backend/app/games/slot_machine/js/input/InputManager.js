/**
 * Pointer & keyboard input drained once per frame.
 * Scales pointer to GameConfig.VIEW_WIDTH/HEIGHT for canvas-relative coords.
 */
import { GameConfig } from '../config/GameConfig.js';

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.queue = [];
        this._bind();
    }

    drain() {
        if (this.queue.length === 0) return [];
        const out = this.queue;
        this.queue = [];
        return out;
    }

    _bind() {
        const push = (e) => this.queue.push(e);

        this.canvas.addEventListener('pointerdown', (e) => {
            const p = this._toView(e);
            push({ type: 'pointerdown', x: p.x, y: p.y });
        });
        this.canvas.addEventListener('pointerup', (e) => {
            const p = this._toView(e);
            push({ type: 'pointerup', x: p.x, y: p.y });
        });
        this.canvas.addEventListener('pointermove', (e) => {
            const p = this._toView(e);
            push({ type: 'pointermove', x: p.x, y: p.y });
        });

        globalThis.addEventListener('keydown', (e) => {
            push({ type: 'keydown', key: e.key, code: e.code });
        });
    }

    _toView(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = GameConfig.VIEW_WIDTH  / rect.width;
        const scaleY = GameConfig.VIEW_HEIGHT / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }
}
