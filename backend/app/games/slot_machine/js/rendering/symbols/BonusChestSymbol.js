import { BaseSymbol } from './BaseSymbol.js';

/** Bonus treasure chest with curved lid and lock. */
export class BonusChestSymbol extends BaseSymbol {
    draw(ctx, cx, cy, size, sym) {
        const w = size * 0.78;
        const h = size * 0.62;
        const x = cx - w / 2;
        const bodyY = cy - h * 0.25;
        const bodyH = h * 0.7;
        // body
        this._roundRectPath(ctx, x, bodyY, w, bodyH, size * 0.04);
        this._fillGlow(ctx, '#9a5c1a', sym.color, 14);
        this._stroke(ctx, size);
        // lid (rounded top)
        const lidH = h * 0.42;
        ctx.beginPath();
        ctx.moveTo(x, bodyY);
        ctx.quadraticCurveTo(cx, bodyY - lidH, x + w, bodyY);
        ctx.closePath();
        ctx.fillStyle = '#b8732a';
        ctx.fill();
        this._stroke(ctx, size);
        // metal bands
        ctx.strokeStyle = '#3a2308';
        ctx.lineWidth = size * 0.045;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.18, bodyY - lidH * 0.4);
        ctx.lineTo(x + w * 0.18, bodyY + bodyH);
        ctx.moveTo(x + w * 0.82, bodyY - lidH * 0.4);
        ctx.lineTo(x + w * 0.82, bodyY + bodyH);
        ctx.stroke();
        // lock plate
        this._roundRectPath(ctx, cx - size * 0.08, bodyY - size * 0.03, size * 0.16, size * 0.18, size * 0.025);
        this._fillGlow(ctx, '#ffd75a', sym.accent, 12);
        this._stroke(ctx, size, '#000000', 0.03);
        // keyhole
        ctx.beginPath();
        ctx.arc(cx, bodyY + size * 0.05, size * 0.022, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.fillRect(cx - size * 0.012, bodyY + size * 0.055, size * 0.024, size * 0.05);
    }
}
