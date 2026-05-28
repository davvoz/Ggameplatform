import { BaseSymbol } from './BaseSymbol.js';

/** Mystery box — rounded square with stylized "?" drawn as path. */
export class MysteryBoxSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const w = size * 0.7;
        const x = cx - w / 2;
        const y = cy - w / 2;
        // box
        this._roundRectPath(ctx, x, y, w, w, size * 0.08);
        this._fillGlow(ctx, '#3a2a6a', sym.color, 18);
        this._stroke(ctx, size);
        // diagonal sheen
        ctx.save();
        this._roundRectPath(ctx, x, y, w, w, size * 0.08);
        ctx.clip();
        const grad = ctx.createLinearGradient(x, y, x + w, y + w);
        grad.addColorStop(0, 'rgba(255,255,255,0.0)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, w);
        ctx.restore();
        // "?" as path: arc on top + vertical stem + dot
        const qx = cx;
        const qTop = cy - size * 0.18;
        const arcR = size * 0.12;
        ctx.beginPath();
        ctx.arc(qx, qTop, arcR, Math.PI, 0.4, false);
        ctx.lineTo(qx + Math.cos(0.4) * arcR * 0.5, qTop + Math.sin(0.4) * arcR * 0.5 + size * 0.08);
        ctx.lineTo(qx, qTop + size * 0.14);
        ctx.lineWidth = size * 0.07;
        ctx.strokeStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = sym.accent || '#ffd75a';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // dot
        ctx.beginPath();
        ctx.arc(qx, qTop + size * 0.24, size * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
}
