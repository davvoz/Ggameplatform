/**
 * SlowTimeOverlay.js
 *
 * Frost clock — blue tint + clock ring with 4 ticks + hour/minute hands.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class SlowTimeOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t  = this._t;
        const cr = 32;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#aadaff';
        ctx.shadowBlur = 6;

        // Frost tint
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#88bbff';
        ctx.beginPath();
        ctx.arc(x, y, cr + 6, 0, Math.PI * 2);
        ctx.fill();

        // Clock ring
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = '#8cbfff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.stroke();

        // 4 tick marks (12/3/6/9) — single batched path
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#aadcff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            ctx.moveTo(x + Math.cos(a) * (cr - 4), y + Math.sin(a) * (cr - 4));
            ctx.lineTo(x + Math.cos(a) * (cr - 1), y + Math.sin(a) * (cr - 1));
        }
        ctx.stroke();

        // Hour hand (slow)
        const ha = t * 0.5 - Math.PI / 2;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#b0d8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ha) * cr * 0.45, y + Math.sin(ha) * cr * 0.45);
        ctx.stroke();

        // Minute hand (faster)
        const ma = t * 2.5 - Math.PI / 2;
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = '#c8eaff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ma) * cr * 0.75, y + Math.sin(ma) * cr * 0.75);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
