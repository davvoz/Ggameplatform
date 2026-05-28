import { BaseSymbol } from './BaseSymbol.js';

/**
 * CoinCashSymbol — gold coin with embossed "$".
 * Scatter-pays anywhere (handled by EvaluationState). Cheap to draw: two arcs
 * + a radial gradient + a single glyph. No animation, no per-frame work.
 */
export class CoinCashSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const r = size * 0.38;

        // Outer rim (warm gold, soft glow)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this._fillGlow(ctx, sym.color || '#ffd700', sym.accent || '#fff7c0', 16);
        this._stroke(ctx, size, '#5a3000', 0.05);

        // Inner face (radial highlight top-left)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
            cx - r * 0.25, cy - r * 0.3, r * 0.05,
            cx, cy, r * 0.78
        );
        grad.addColorStop(0, '#fff8d0');
        grad.addColorStop(1, '#c98800');
        ctx.fillStyle = grad;
        ctx.fill();
        this._stroke(ctx, size, '#6a3a00', 0.025);

        // Embossed "$"
        ctx.fillStyle = '#5a3000';
        ctx.font = `900 ${Math.floor(size * 0.5)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + size * 0.02);
    }
}
