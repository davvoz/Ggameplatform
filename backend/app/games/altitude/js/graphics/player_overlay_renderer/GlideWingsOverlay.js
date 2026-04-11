/**
 * GlideWingsOverlay.js
 *
 * Organic dragonfly wings — 3-curve shape with central vein.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class GlideWingsOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h, { anim }) {
        const t       = this._t;
        const anchorY = y - h * 0.18;

        let spread;
        if (anim === 'fall') {
            spread = 1;
        } else if (anim === 'jump') {
            spread = 0.18;
        } else {
            spread = 0.4 + Math.sin(t * 2) * 0.07;
        }

        ctx.save();
        ctx.shadowColor = '#22dd77';
        ctx.shadowBlur  = 8;

        [-1, 1].forEach(side => {
            const baseX = x + side * 7;
            const midX  = x + side * (10 + spread * 18);
            const tipX  = x + side * (22 + spread * 32);
            const tipY  = anchorY + spread * 20;

            // Wing membrane
            ctx.globalAlpha = 0.5 + spread * 0.32;
            ctx.fillStyle   = '#18b95a';
            ctx.strokeStyle = '#44ffaa';
            ctx.lineWidth   = 1.2;

            ctx.beginPath();
            ctx.moveTo(baseX, anchorY - 2);
            ctx.quadraticCurveTo(midX, anchorY - 6 + spread * 2, tipX, anchorY + spread * 6);
            ctx.quadraticCurveTo(tipX - side * 6, tipY, midX, anchorY + 18);
            ctx.quadraticCurveTo(x + side * 5, anchorY + 14, baseX, anchorY + 4);

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Central vein
            ctx.strokeStyle = 'rgba(100,255,160,0.3)';
            ctx.lineWidth = 0.8;

            ctx.beginPath();
            ctx.moveTo(baseX, anchorY + 3);
            ctx.quadraticCurveTo(
                midX * 0.85 + x * 0.15,
                anchorY + spread * 10,
                tipX * 0.7 + x * 0.3,
                anchorY + spread * 16
            );
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
