import { BaseSymbol } from './BaseSymbol.js';

/** Lucky "7" — stylized angular numeral. */
export class SevenLuckySymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const w = size * 0.62;
        const h = size * 0.82;
        const x = cx - w / 2;
        const y = cy - h / 2;
        const top = h * 0.22;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w * 0.92, y + top);
        ctx.lineTo(x + w * 0.55, y + h);
        ctx.lineTo(x + w * 0.18, y + h);
        ctx.lineTo(x + w * 0.7, y + top);
        ctx.lineTo(x, y + top);
        ctx.closePath();
        this._fillGlow(ctx, '#ffffff', sym.color, 20);
        this._stroke(ctx, size);
    }
}
