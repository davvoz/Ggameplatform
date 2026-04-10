/**
 * DoubleCoinsOverlay.js
 *
 * Golden crown halo ring + orbiting coins + ×2 multiplier.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class DoubleCoinsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const headY = y - h * 0.38;
        const R     = 22;

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 6;

        // Halo ring
        ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.1;
        ctx.strokeStyle = '#ffc800';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, headY, R + 4, 9, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 5 orbiting coins
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + t * 1.3;
            ctx.globalAlpha = 0.5 + Math.abs(Math.cos(a)) * 0.4;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * R, headY + Math.sin(a) * 7, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // ×2 multiplier text
        ctx.globalAlpha = 0.6 + Math.sin(t * 2.5) * 0.25;
        ctx.fillStyle = '#ffe040';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('×2', x, y - h * 0.6);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
