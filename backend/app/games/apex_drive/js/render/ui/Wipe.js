import { UI } from './widgets.js';

/**
 * The change of screen: big square pixels grow from the edges to the middle
 * until the frame is covered, the screen behind is swapped, then they
 * shrink away from the middle out. The game asks `cover(onCovered)`.
 */
const BLOCK = 12;
const HALF = 0.28;

export class Wipe {
    #time = 0;
    #phase = 'idle';
    #onCovered = null;

    get busy() {
        return this.#phase !== 'idle';
    }

    /** Starts a change of screen; `onCovered` runs when nothing of the old one shows. */
    cover(onCovered) {
        this.#phase = 'closing';
        this.#time = 0;
        this.#onCovered = onCovered;
    }

    update(dt) {
        if (this.#phase === 'idle') return;
        this.#time += dt;
        if (this.#phase === 'closing' && this.#time >= HALF) {
            this.#onCovered?.();
            this.#phase = 'opening';
            this.#time = 0;
        } else if (this.#phase === 'opening' && this.#time >= HALF) {
            this.#phase = 'idle';
        }
    }

    draw(ctx, { width, height }) {
        if (this.#phase === 'idle') return;
        const t = Math.min(1, this.#time / HALF);
        const cover = this.#phase === 'closing' ? t : 1 - t;
        const cx = width / 2;
        const cy = height / 2;
        const reach = Math.hypot(cx, cy);
        ctx.fillStyle = UI.ink;
        for (let y = 0; y < height; y += BLOCK) {
            for (let x = 0; x < width; x += BLOCK) {
                // blocks far from the middle close first and open last
                const far = Math.hypot(x + BLOCK / 2 - cx, y + BLOCK / 2 - cy) / reach;
                const size = Math.round(Math.min(1, Math.max(0, cover * 2 - (1 - far))) * BLOCK);
                if (size > 0) ctx.fillRect(x + (BLOCK - size) / 2, y + (BLOCK - size) / 2, size, size);
            }
        }
    }
}
