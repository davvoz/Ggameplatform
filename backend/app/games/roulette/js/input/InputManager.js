import { GameConfig } from '../config/GameConfig.js';

/**
 * Unified pointer + key input. Queues semantic events; states drain on update.
 * Event shape:  { type: 'down'|'move'|'up', x, y }
 *               { type: 'key', code, down: bool }
 */
export class InputManager {
    constructor(canvas) {
        this._canvas = canvas;
        this._queue = [];
        this._active = false;
        this._bound = {
            pointerdown:   (e) => this._onPointer('down', e),
            pointermove:   (e) => this._onPointer('move', e),
            pointerup:     (e) => this._onPointer('up', e),
            pointercancel: (e) => this._onPointer('up', e),
            keydown:       (e) => this._onKey(e, true),
            keyup:         (e) => this._onKey(e, false),
            blur:          () => this._queue.push({ type: 'blur' })
        };
    }

    attach() {
        if (this._active) return;
        this._active = true;
        const c = this._canvas;
        c.addEventListener('pointerdown',   this._bound.pointerdown);
        c.addEventListener('pointermove',   this._bound.pointermove);
        c.addEventListener('pointerup',     this._bound.pointerup);
        c.addEventListener('pointercancel', this._bound.pointercancel);
        globalThis.addEventListener('keydown', this._bound.keydown);
        globalThis.addEventListener('keyup',   this._bound.keyup);
        globalThis.addEventListener('blur',    this._bound.blur);
    }

    detach() {
        if (!this._active) return;
        this._active = false;
        const c = this._canvas;
        c.removeEventListener('pointerdown',   this._bound.pointerdown);
        c.removeEventListener('pointermove',   this._bound.pointermove);
        c.removeEventListener('pointerup',     this._bound.pointerup);
        c.removeEventListener('pointercancel', this._bound.pointercancel);
        globalThis.removeEventListener('keydown', this._bound.keydown);
        globalThis.removeEventListener('keyup',   this._bound.keyup);
        globalThis.removeEventListener('blur',    this._bound.blur);
    }

    drain() {
        const out = this._queue;
        this._queue = [];
        return out;
    }

    _onPointer(type, e) {
        e.preventDefault();
        const rect = this._canvas.getBoundingClientRect();
        const scaleX = GameConfig.VIEW_WIDTH  / rect.width;
        const scaleY = GameConfig.VIEW_HEIGHT / rect.height;
        this._queue.push({
            type,
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top)  * scaleY
        });
    }

    _onKey(e, down) {
        this._queue.push({ type: 'key', code: e.code, down });
    }
}
