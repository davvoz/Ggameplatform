/**
 * ShockwaveOverlay.js
 *
 * Expanding pulse rings + 4 radial burst lines.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class ShockwaveOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t  = this._t;
        const cy = y + h * 0.10;

        ctx.save();
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 5;
        ctx.lineCap = 'round';

        // 2 expanding pulse rings
        ctx.strokeStyle = '#ffdd44';
        for (let i = 0; i < 2; i++) {
            const phase = (t * 2.2 + i * 0.5) % 1;
            const r = 12 + phase * 28;
            ctx.globalAlpha = (1 - phase) * 0.55;
            ctx.lineWidth = 1.8 - phase;
            ctx.beginPath();
            ctx.ellipse(x, cy, r, r * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4 radial burst lines (NSEW) — single batched path
        const burst = 16 + Math.sin(t * 3) * 4;
        ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 8, cy);       ctx.lineTo(x + burst, cy);
        ctx.moveTo(x - 8, cy);       ctx.lineTo(x - burst, cy);
        ctx.moveTo(x, cy - 5);       ctx.lineTo(x, cy - burst * 0.6);
        ctx.moveTo(x, cy + 5);       ctx.lineTo(x, cy + burst * 0.6);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
