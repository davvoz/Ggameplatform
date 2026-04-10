/**
 * ArmorPlatingOverlay.js
 *
 * Hex shoulder plates with metallic edge highlight + center rivet.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class ArmorPlatingOverlay extends PlayerOverlay {
    drawBehind(ctx, x, y, h) {
        const bY = y - h * 0.05;

        ctx.save();
        ctx.shadowColor = '#aabbcc';
        ctx.shadowBlur = 5;

        [-1, 1].forEach(side => {
            const px = x + side * 14;

            // Hex plate fill
            ctx.fillStyle = '#7799aa';
            ctx.beginPath();
            ctx.moveTo(px - 6, bY - 8); ctx.lineTo(px + 6, bY - 8);
            ctx.lineTo(px + 8, bY - 2); ctx.lineTo(px + 5, bY + 5);
            ctx.lineTo(px - 5, bY + 5); ctx.lineTo(px - 8, bY - 2);
            ctx.closePath();
            ctx.fill();

            // Top edge highlight (metallic sheen)
            ctx.strokeStyle = '#ccdde8';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(px - 6, bY - 8);
            ctx.lineTo(px + 6, bY - 8);
            ctx.lineTo(px + 8, bY - 2);
            ctx.stroke();

            // Center rivet
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#bbccdd';
            ctx.beginPath();
            ctx.arc(px, bY - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
