/**
 * Abstract base for procedural symbol glyphs.
 * Subclasses MUST implement draw(ctx, cx, cy, size, sym).
 * Provides shared canvas helpers; no state.
 */
import { GameConfig } from '../../config/GameConfig.js';

export class BaseSymbol {
    draw(_ctx, _cx, _cy, _size, _sym) {
        throw new Error('BaseSymbol.draw must be overridden');
    }

    _stroke(ctx, size, color = '#000000', mult = 0.06) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, size * mult);
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    _fillGlow(ctx, fill, glowColor, blur = 14) {
        ctx.shadowBlur = blur;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /** Three stacked rounded bars used by BAR symbols. */
    _drawBars(ctx, cx, cy, size, sym, palette) {
        const w = size * 0.82;
        const h = size * 0.18;
        const gap = h * 0.45;
        const totalH = h * 3 + gap * 2;
        const y0 = cy - totalH / 2;
        const mobile = GameConfig.IS_MOBILE;
        for (let i = 0; i < 3; i++) {
            const y = y0 + i * (h + gap);
            const x = cx - w / 2;
            this._roundRectPath(ctx, x, y, w, h, h * 0.42);
            if (mobile) {
                this._fillGlow(ctx, palette.top, sym.color, 12);
            } else {
                const grad = ctx.createLinearGradient(0, y, 0, y + h);
                grad.addColorStop(0, palette.top);
                grad.addColorStop(1, palette.bottom);
                this._fillGlow(ctx, grad, sym.color, 12);
            }
            this._stroke(ctx, size, '#000000', 0.04);
            if (!mobile) {
                // inner sheen
                this._roundRectPath(ctx, x + size * 0.02, y + h * 0.12, w - size * 0.04, h * 0.32, h * 0.2);
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.fill();
            }
        }
    }
}
