import { BaseSymbol } from './BaseSymbol.js';

/** Diamond gem — rhombus with facet highlight. */
export class DiamondSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const s = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.78, cy);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s * 0.78, cy);
        ctx.closePath();
        this._fillGlow(ctx, '#e0fbff', sym.color, 24);
        this._stroke(ctx, size);
        // facet highlight
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.38, cy - s * 0.18);
        ctx.lineTo(cx - s * 0.05, cy - s * 0.8);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = size * 0.045;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}
