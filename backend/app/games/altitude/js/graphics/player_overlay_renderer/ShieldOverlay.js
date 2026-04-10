/**
 * ShieldOverlay.js
 *
 * Flickering energy barrier — bubble + 3 rotating arc panels + inner ring.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class ShieldOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const r = 36;

        ctx.save();
        ctx.shadowColor = '#00eeff';
        ctx.shadowBlur = 10;

        // Shield bubble
        ctx.globalAlpha = 0.05 + Math.sin(t * 3) * 0.025;
        ctx.fillStyle = '#00ccff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 3 flickering arc panels (120° apart, rotating)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00f0ff';
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 1.2;
            ctx.globalAlpha = 0.4 + Math.sin(t * 6 + i * 2.1) * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, r, a, a + Math.PI * 0.55);
            ctx.stroke();
        }

        // Inner energy ring
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#66ddff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
