/**
 * StompBootsOverlay.js
 *
 * Red energy rings + downward impact chevron.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class StompBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const bootY = y + h * 0.44;

        ctx.save();
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Boot energy rings
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff5000';
        [-8, 8].forEach(bx => {
            ctx.globalAlpha = 0.5 + Math.sin(t * 7 + bx) * 0.2;
            ctx.beginPath();
            ctx.ellipse(x + bx, bootY, 8, 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Downward impact chevron (▼)
        ctx.globalAlpha = 0.4 + Math.sin(t * 5) * 0.2;
        ctx.strokeStyle = '#ff6622';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 5, bootY + 7);
        ctx.lineTo(x, bootY + 13);
        ctx.lineTo(x + 5, bootY + 7);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
