import { BaseSymbol } from './BaseSymbol.js';

/** Cherry bomb — twin cherries with stems and leaf. */
export class CherryBombSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const r = size * 0.18;
        const offset = size * 0.22;
        const leftCx = cx - offset;
        const rightCx = cx + offset;
        const fruitCy = cy + size * 0.18;
        const topY = cy - size * 0.4;
        // stems
        ctx.beginPath();
        ctx.moveTo(leftCx, fruitCy - r * 0.8);
        ctx.quadraticCurveTo(cx - size * 0.06, cy - size * 0.28, cx, topY);
        ctx.moveTo(rightCx, fruitCy - r * 0.8);
        ctx.quadraticCurveTo(cx + size * 0.06, cy - size * 0.28, cx, topY);
        ctx.strokeStyle = '#3a7a1a';
        ctx.lineWidth = size * 0.05;
        ctx.lineCap = 'round';
        ctx.stroke();
        // leaf
        ctx.beginPath();
        ctx.ellipse(cx + size * 0.1, topY + size * 0.03, size * 0.14, size * 0.065, -0.4, 0, Math.PI * 2);
        this._fillGlow(ctx, '#4cb01e', sym.accent, 8);
        this._stroke(ctx, size, '#000000', 0.03);
        // cherries
        for (const x of [leftCx, rightCx]) {
            ctx.beginPath();
            ctx.arc(x, fruitCy, r, 0, Math.PI * 2);
            this._fillGlow(ctx, '#e21a3c', sym.color, 14);
            this._stroke(ctx, size, '#000000', 0.045);
            // highlight
            ctx.beginPath();
            ctx.arc(x - r * 0.35, fruitCy - r * 0.4, r * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        }
    }
}
