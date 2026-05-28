import { BaseSymbol } from './BaseSymbol.js';

/** Rainbow gem — diamond shell with inner coloured core. */
export class RainbowSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const s = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s, cy);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s, cy);
        ctx.closePath();
        this._fillGlow(ctx, '#ffffff', sym.color, 22);
        this._stroke(ctx, size);
        // inner diamond
        const s2 = s * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s2);
        ctx.lineTo(cx + s2, cy);
        ctx.lineTo(cx, cy + s2);
        ctx.lineTo(cx - s2, cy);
        ctx.closePath();
        ctx.fillStyle = sym.color;
        ctx.fill();
        this._stroke(ctx, size, '#000000', 0.035);
        // sparkle
        ctx.beginPath();
        ctx.arc(cx, cy, s2 * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
}
