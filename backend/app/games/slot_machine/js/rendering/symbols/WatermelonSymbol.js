import { BaseSymbol } from './BaseSymbol.js';

/** Watermelon slice — rind / white / flesh with seeds. */
export class WatermelonSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const r = size * 0.48;
        const flatY = cy + size * 0.1;
        // rind (outer)
        ctx.beginPath();
        ctx.moveTo(cx - r, flatY);
        ctx.arc(cx, flatY, r, Math.PI, 0, true);
        ctx.closePath();
        this._fillGlow(ctx, '#2faa3a', sym.color, 14);
        this._stroke(ctx, size, '#000000', 0.05);
        // white layer
        ctx.beginPath();
        const r1 = r * 0.9;
        ctx.moveTo(cx - r1, flatY);
        ctx.arc(cx, flatY, r1, Math.PI, 0, true);
        ctx.closePath();
        ctx.fillStyle = '#f8f4d8';
        ctx.fill();
        // pink flesh
        ctx.beginPath();
        const r2 = r * 0.8;
        ctx.moveTo(cx - r2, flatY);
        ctx.arc(cx, flatY, r2, Math.PI, 0, true);
        ctx.closePath();
        ctx.fillStyle = '#ff6e8c';
        ctx.fill();
        // seeds
        const seeds = [
            [-0.45, -0.18], [-0.18, -0.42], [0.12, -0.5], [0.42, -0.32], [0.6, -0.08],
            [-0.62, -0.05], [0, -0.22]
        ];
        ctx.fillStyle = '#1a1a1a';
        for (const [sx, sy] of seeds) {
            ctx.beginPath();
            ctx.ellipse(cx + sx * r, flatY + sy * r, size * 0.025, size * 0.04, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
