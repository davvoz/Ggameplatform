/**
 * MagnetOverlay.js
 *
 * Converging field pulses + orbiting coins at varied depths.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class MagnetOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t = this._t;
        const R = 32;

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 6;

        // 2 inward-converging field pulses
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
            const phase = (t * 1.8 + i * 0.5) % 1;
            const pr = R + (1 - phase) * 16;
            ctx.globalAlpha = phase * 0.25;
            ctx.beginPath();
            ctx.arc(x, y, pr, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3 orbiting coins at staggered depths
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 4;
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 2.0;
            const depth = 0.5 + Math.sin(a) * 0.35;
            const cr = R * (0.7 + i * 0.13);
            ctx.globalAlpha = 0.4 + depth * 0.5;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * cr, y + Math.sin(a) * cr * 0.4, 3 + depth * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
