import { BaseSymbol } from './BaseSymbol.js';

/** Orange — circle with segment lines and leaf. */
export class OrangeSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const r = size * 0.36;
        const bodyCy = cy + size * 0.05;
        ctx.beginPath();
        ctx.arc(cx, bodyCy, r, 0, Math.PI * 2);
        this._fillGlow(ctx, '#ff8000', sym.color, 16);
        this._stroke(ctx, size);
        // segments
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            ctx.moveTo(cx, bodyCy);
            ctx.lineTo(cx + Math.cos(a) * r * 0.92, bodyCy + Math.sin(a) * r * 0.92);
        }
        ctx.strokeStyle = 'rgba(120,40,0,0.55)';
        ctx.lineWidth = size * 0.028;
        ctx.stroke();
        // highlight
        ctx.beginPath();
        ctx.arc(cx - r * 0.4, bodyCy - r * 0.4, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();
        // leaf
        ctx.beginPath();
        ctx.ellipse(cx + size * 0.05, cy - size * 0.32, size * 0.13, size * 0.065, -0.5, 0, Math.PI * 2);
        this._fillGlow(ctx, '#4cb01e', sym.accent, 6);
        this._stroke(ctx, size, '#000000', 0.03);
    }
}
