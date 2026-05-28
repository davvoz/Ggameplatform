import { BaseSymbol } from './BaseSymbol.js';

/** Royal crown with three gems. */
export class CrownSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const w = size * 0.82;
        const h = size * 0.6;
        const x = cx - w / 2;
        const y = cy - h / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h * 0.55);
        ctx.lineTo(x + w * 0.85, y);
        ctx.lineTo(x + w * 0.7, y + h * 0.4);
        ctx.lineTo(x + w * 0.5, y - h * 0.12);
        ctx.lineTo(x + w * 0.3, y + h * 0.4);
        ctx.lineTo(x + w * 0.15, y);
        ctx.lineTo(x, y + h * 0.55);
        ctx.closePath();
        this._fillGlow(ctx, '#ffd75a', sym.color, 18);
        this._stroke(ctx, size);
        // band line
        ctx.beginPath();
        ctx.moveTo(x + size * 0.02, y + h * 0.7);
        ctx.lineTo(x + w - size * 0.02, y + h * 0.7);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = size * 0.03;
        ctx.stroke();
        // gems
        const gems = [
            { x: 0.15, y: 0.02, color: '#ff3366' },
            { x: 0.5,  y: -0.12, color: '#22e0ff' },
            { x: 0.85, y: 0.02, color: '#ff3366' }
        ];
        for (const g of gems) {
            ctx.beginPath();
            ctx.arc(x + w * g.x, y + h * g.y, size * 0.058, 0, Math.PI * 2);
            ctx.fillStyle = g.color;
            ctx.fill();
            ctx.lineWidth = size * 0.025;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }
    }
}
