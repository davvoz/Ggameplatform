import { BaseSymbol } from './BaseSymbol.js';

/** Grapes cluster — purple circles with stem and leaf. */
export class GrapesSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const r = size * 0.1;
        const grapes = [
            [-2, 0], [0, 0], [2, 0],
            [-1, 1.7], [1, 1.7],
            [-2, 3.4], [0, 3.4], [2, 3.4],
            [-1, 5.1], [1, 5.1],
            [0, 6.8]
        ];
        const baseY = cy - size * 0.32;
        // stem
        ctx.beginPath();
        ctx.moveTo(cx, baseY - r * 2.2);
        ctx.lineTo(cx, baseY - r * 0.5);
        ctx.strokeStyle = '#5a3a14';
        ctx.lineWidth = size * 0.04;
        ctx.lineCap = 'round';
        ctx.stroke();
        // leaf
        ctx.beginPath();
        ctx.ellipse(cx + size * 0.13, baseY - r * 2.2, size * 0.13, size * 0.07, -0.3, 0, Math.PI * 2);
        this._fillGlow(ctx, '#4cb01e', sym.accent, 8);
        this._stroke(ctx, size, '#000000', 0.03);
        // grapes
        for (const [gx, gy] of grapes) {
            const x = cx + gx * r;
            const y = baseY + gy * r;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            this._fillGlow(ctx, '#8a3eb8', sym.color, 8);
            this._stroke(ctx, size, '#000000', 0.035);
            // highlight
            ctx.beginPath();
            ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fill();
        }
    }
}
