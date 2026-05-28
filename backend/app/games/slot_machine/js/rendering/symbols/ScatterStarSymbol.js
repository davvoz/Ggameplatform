import { BaseSymbol } from './BaseSymbol.js';

/** Scatter — 4-point sparkle star with center dot. */
export class ScatterStarSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const outer = size * 0.5;
        const inner = outer * 0.26;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = -Math.PI / 2 + i * Math.PI / 4;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        this._fillGlow(ctx, '#ffe066', sym.color, 28);
        this._stroke(ctx, size);
        // center
        ctx.beginPath();
        ctx.arc(cx, cy, outer * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
}
