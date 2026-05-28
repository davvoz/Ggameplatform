import { BaseSymbol } from './BaseSymbol.js';

/** Wild — 5-point star with accent core. */
export class StarWildSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const outer = size * 0.5;
        const inner = outer * 0.45;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        this._fillGlow(ctx, '#ffffff', sym.color, 26);
        this._stroke(ctx, size);
        // accent core
        ctx.beginPath();
        ctx.arc(cx, cy, outer * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = sym.accent;
        ctx.fill();
        ctx.lineWidth = size * 0.025;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }
}
