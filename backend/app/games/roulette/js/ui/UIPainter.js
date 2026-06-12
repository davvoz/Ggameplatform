import { GameConfig } from '../config/GameConfig.js';

const C = GameConfig.COLOR;

/**
 * Reusable canvas drawing helpers (rounded rects, panels, text shadow).
 * Presentation-only: panels gain glass highlights, buttons gain gradient
 * bevels with hover/press states, text gains optional glow.
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
        const radius = opts.radius ?? 8;
        ctx.save();
        if (opts.glow) {
            ctx.shadowColor = opts.glow;
            ctx.shadowBlur = opts.glowBlur ?? 18;
        }
        ctx.fillStyle = opts.fill ?? C.PANEL_DARK;
        UIPainter.roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.restore();
        // Glass top highlight.
        if (opts.glass !== false && h > 16) {
            const gh = Math.min(h * 0.45, 22);
            const grad = ctx.createLinearGradient(0, y, 0, y + gh);
            grad.addColorStop(0, C.GLASS);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            UIPainter.roundRect(ctx, x + 1, y + 1, w - 2, gh, Math.max(2, radius - 1));
            ctx.fill();
        }
        if (opts.border) {
            ctx.strokeStyle = opts.border;
            ctx.lineWidth = opts.borderWidth ?? 1;
            UIPainter.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
            ctx.stroke();
        }
    }

    static button(ctx, x, y, w, h, label, opts = {}) {
        const active = opts.active ?? true;
        const hover = active && (opts.hover ?? false);
        const press = active && (opts.press ?? false);
        const radius = 8;
        ctx.save();
        // Press: sink the button slightly. Hover: lift with glow.
        const dy = press ? 1.5 : 0;
        if (hover && !press) {
            ctx.shadowColor = C.WIN_GLOW;
            ctx.shadowBlur = 14;
        }
        // Drop shadow base.
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        UIPainter.roundRect(ctx, x, y + 3, w, h, radius);
        ctx.fill();
        // Face gradient.
        const grad = ctx.createLinearGradient(0, y + dy, 0, y + dy + h);
        if (active) {
            grad.addColorStop(0, hover ? C.GOLD_PALE : C.GOLD_BRIGHT);
            grad.addColorStop(0.45, C.GOLD);
            grad.addColorStop(1, C.GOLD_DEEP);
        } else {
            grad.addColorStop(0, '#46464e');
            grad.addColorStop(1, '#2c2c33');
        }
        ctx.fillStyle = grad;
        UIPainter.roundRect(ctx, x, y + dy, w, h - dy, radius);
        ctx.fill();
        ctx.restore();
        // Bevel edge.
        ctx.strokeStyle = active ? 'rgba(255,233,168,0.8)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        UIPainter.roundRect(ctx, x + 0.5, y + dy + 0.5, w - 1, h - dy - 1, radius);
        ctx.stroke();
        // Label with subtle emboss.
        const text = active ? (opts.text ?? '#241a04') : C.TEXT_DIM;
        ctx.font = `bold ${opts.fontSize ?? 13}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (active) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(label, x + w / 2, y + dy + h / 2 + 1);
        }
        ctx.fillStyle = text;
        ctx.fillText(label, x + w / 2, y + dy + h / 2);
    }

    static text(ctx, str, x, y, opts = {}) {
        ctx.font = `${opts.weight ?? ''} ${opts.size ?? 12}px ${opts.family ?? 'system-ui'}`.trim();
        ctx.fillStyle = opts.color ?? C.TEXT;
        ctx.textAlign = opts.align ?? 'left';
        ctx.textBaseline = opts.baseline ?? 'top';
        if (opts.glow) {
            ctx.save();
            ctx.shadowColor = opts.glow;
            ctx.shadowBlur = opts.glowBlur ?? 12;
            ctx.fillText(str, x, y);
            ctx.restore();
        }
        if (opts.shadow) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillText(str, x + 1, y + 1.5);
            ctx.restore();
            ctx.fillStyle = opts.color ?? C.TEXT;
        }
        ctx.fillText(str, x, y);
    }

    /** Thin gold divider line with soft fade at both ends. */
    static divider(ctx, x, y, w) {
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, 'rgba(212,160,23,0)');
        grad.addColorStop(0.5, 'rgba(212,160,23,0.6)');
        grad.addColorStop(1, 'rgba(212,160,23,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, 1);
    }
}

