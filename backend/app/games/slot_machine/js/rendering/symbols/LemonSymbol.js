import { BaseSymbol } from './BaseSymbol.js';

/** Lemon — yellow ellipse with leaf and nub tips. */
export class LemonSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const bodyCy = cy + size * 0.06;
        // nubs
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(cx + dir * size * 0.38, bodyCy, size * 0.05, size * 0.07, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#e6c520';
            ctx.fill();
            this._stroke(ctx, size, '#000000', 0.03);
        }
        // body
        ctx.beginPath();
        ctx.ellipse(cx, bodyCy, size * 0.36, size * 0.28, 0, 0, Math.PI * 2);
        this._fillGlow(ctx, '#ffe240', sym.color, 16);
        this._stroke(ctx, size);
        // highlight
        ctx.beginPath();
        ctx.ellipse(cx - size * 0.12, bodyCy - size * 0.08, size * 0.13, size * 0.05, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();
        // leaf
        ctx.beginPath();
        ctx.ellipse(cx + size * 0.08, cy - size * 0.24, size * 0.13, size * 0.065, -0.6, 0, Math.PI * 2);
        this._fillGlow(ctx, '#4cb01e', sym.accent, 6);
        this._stroke(ctx, size, '#000000', 0.03);
    }
}
