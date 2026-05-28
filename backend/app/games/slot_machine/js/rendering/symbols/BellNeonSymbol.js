import { BaseSymbol } from './BaseSymbol.js';

/** Golden bell with clapper. */
export class BellNeonSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const w = size * 0.6;
        const h = size * 0.68;
        const topY = cy - h / 2;
        // body
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, cy + h * 0.22);
        ctx.quadraticCurveTo(cx - w / 2, topY, cx, topY);
        ctx.quadraticCurveTo(cx + w / 2, topY, cx + w / 2, cy + h * 0.22);
        ctx.lineTo(cx + w * 0.62, cy + h * 0.32);
        ctx.lineTo(cx - w * 0.62, cy + h * 0.32);
        ctx.closePath();
        this._fillGlow(ctx, '#ffd75a', sym.color, 18);
        this._stroke(ctx, size);
        // sheen
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.18, cy - h * 0.05, w * 0.1, h * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
        // clapper
        ctx.beginPath();
        ctx.arc(cx, cy + h * 0.42, size * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#7a5300';
        ctx.fill();
        this._stroke(ctx, size, '#000000', 0.03);
        // top knob
        ctx.beginPath();
        ctx.arc(cx, topY - size * 0.04, size * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#c79100';
        ctx.fill();
        this._stroke(ctx, size, '#000000', 0.03);
    }
}
