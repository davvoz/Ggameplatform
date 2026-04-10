/**
 * RocketPodsOverlay.js
 *
 * Mechanical jet pods with nozzle caps + reactive thrust flames.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class RocketPodsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t  = this._t;
        const pY = y - h * 0.06;

        ctx.save();
        ctx.shadowColor = '#3399ff';
        ctx.shadowBlur = 6;

        [-1, 1].forEach(side => {
            const px = x + side * 17;

            // Pod body
            ctx.fillStyle = '#2255dd';
            ctx.beginPath();
            ctx.roundRect(px - 4, pY - 7, 8, 14, 3);
            ctx.fill();

            // Nozzle cap (dome on top)
            ctx.fillStyle = '#3366cc';
            ctx.beginPath();
            ctx.arc(px, pY - 7, 4, Math.PI, 0);
            ctx.fill();

            // Thrust flame
            const isJump = anim === 'jump';
            const fh = isJump ? 10 + Math.sin(t * 22 + side) * 4 : 3 + Math.sin(t * 10 + side) * 1.5;
            ctx.globalAlpha = isJump ? 0.85 : 0.4;
            ctx.fillStyle = isJump ? '#78b4ff' : '#5090ff';
            ctx.shadowBlur = isJump ? 10 : 4;
            ctx.beginPath();
            ctx.ellipse(px, pY + 10 + fh * 0.5, 2.5, fh, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
