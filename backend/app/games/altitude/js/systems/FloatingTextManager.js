/**
 * FloatingTextManager — Manages transient floating text labels (e.g. "+❤️", "DASH!").
 *
 * Single Responsibility: create, update, and draw floating text entities.
 * Depends only on BitmapFont for rendering.
 */

import { bitmapFont } from '../graphics/BitmapFont.js';
import { updateAndCompact } from '../core/ArrayUtils.js';

export class FloatingTextManager {
    #texts = [];

    get length() { return this.#texts.length; }

    /**
     * Add a floating text.
     *
     * @param {object} opts
     * @param {number} opts.x        — world x (or screen x for HUD-anchored texts)
     * @param {number} opts.screenY  — initial screen-space y
     * @param {string} opts.text     — display string
     * @param {number} [opts.life=1] — lifetime in seconds
     * @param {number} [opts.vy=-50] — vertical velocity (px/s, negative = upward)
     * @param {string} [opts.color]  — CSS colour string
     * @param {boolean} [opts.large] — use larger font size
     */
    add({ x, screenY, text, life = 1, vy = -50, color, large = false }) {
        this.#texts.push({
            x,
            screenY,
            text,
            life,
            maxLife: life,
            vy,
            color,
            large,
        });
    }

    /**
     * Tick all texts, removing expired ones in-place (zero allocation).
     *
     * @param {number} dt — delta time in seconds
     */
    update(dt) {
        updateAndCompact(this.#texts, ft => {
            ft.life -= dt;
            ft.screenY += ft.vy * dt;
            return ft.life > 0;
        });
    }

    /**
     * Render all active floating texts.
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (this.#texts.length === 0) return;

        ctx.save();
        for (const ft of this.#texts) {
            const t = ft.life / ft.maxLife;           // 1 → 0
            const alpha = t < 0.3 ? t / 0.3 : 1;     // fade out last 30%
            const scale = 1 + (1 - t) * 0.6;         // grows slightly as it rises

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ft.x, ft.screenY);
            ctx.scale(scale, scale);

            const col  = ft.color ?? '#ffffff';
            const size = ft.large ? 24 : 18;

            ctx.shadowColor = col;
            ctx.shadowBlur  = 12;

            if (FloatingTextManager.#hasUnicode(ft)) {
                ctx.font = `bold ${size}px sans-serif`;
                ctx.fillStyle = ft.large ? col : '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ft.text, 0, 0);
            } else {
                bitmapFont.drawText(ctx, ft.text, 0, 0, size, {
                    align: 'center',
                    color: ft.large ? col : '#ffffff',
                });
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }
        ctx.restore();
    }

    /**
     * Remove all texts.
     */
    clear() {
        this.#texts.length = 0;
    }

    /**
     * Detect non-ASCII characters (cached per entry).
     */
    static #hasUnicode(ft) {
        if (ft._isUnicode === undefined) {
            ft._isUnicode = false;
            for (let i = 0; i < ft.text.length; i++) {
                if (ft.text.charCodeAt(i) > 127) {
                    ft._isUnicode = true;
                    break;
                }
            }
        }
        return ft._isUnicode;
    }
}
