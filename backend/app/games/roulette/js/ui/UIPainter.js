import { GameConfig } from '../config/GameConfig.js';

const C = GameConfig.COLOR;

/**
 * Reusable canvas drawing helpers (rounded rects, panels, text shadow).
 */
export class UIPainter {
    static roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
    }

    static panel(ctx, x, y, w, h, opts = {}) {
        ctx.fillStyle = opts.fill ?? 'rgba(16,12,24,0.88)';
        UIPainter.roundRect(ctx, x, y, w, h, opts.radius ?? 8);
        ctx.fill();
        if (opts.border) {
            ctx.strokeStyle = opts.border;
            ctx.lineWidth = opts.borderWidth ?? 1;
            ctx.stroke();
        }
    }

    static button(ctx, x, y, w, h, label, opts = {}) {
        const active = opts.active ?? true;
        const fill = active ? (opts.fill ?? C.GOLD) : '#3a3a40';
        const text = active ? (opts.text ?? C.BLACK) : C.TEXT_DIM;
        UIPainter.panel(ctx, x, y, w, h, { fill, border: C.GOLD_BRIGHT, radius: 6 });
        ctx.fillStyle = text;
        ctx.font = `bold ${opts.fontSize ?? 13}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
    }

    static text(ctx, str, x, y, opts = {}) {
        ctx.font = `${opts.weight ?? ''} ${opts.size ?? 12}px system-ui`.trim();
        ctx.fillStyle = opts.color ?? C.TEXT;
        ctx.textAlign = opts.align ?? 'left';
        ctx.textBaseline = opts.baseline ?? 'top';
        if (opts.shadow) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillText(str, x + 1, y + 1);
            ctx.restore();
            ctx.fillStyle = opts.color ?? C.TEXT;
        }
        ctx.fillText(str, x, y);
    }
}
