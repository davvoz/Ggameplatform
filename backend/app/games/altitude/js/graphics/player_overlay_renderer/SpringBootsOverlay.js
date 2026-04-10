/**
 * SpringBootsOverlay.js
 *
 * Zigzag coil springs + ground bounce ripple.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class SpringBootsOverlay extends PlayerOverlay {
    draw(ctx, x, y, h) {
        const t     = this._t;
        const footY = y + h / 2;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 6;

        // 2 zigzag springs (5 segments each)
        ctx.strokeStyle = '#22ff66';
        ctx.lineWidth = 2;
        [-9, 9].forEach(bx => {
            const stretch = 13 + Math.sin(t * 8 + bx) * 3;
            ctx.beginPath();
            ctx.moveTo(x + bx, footY);
            for (let i = 1; i <= 5; i++) {
                const sx = x + bx + ((i % 2) * 2 - 1) * 5;
                ctx.lineTo(sx, footY + (i / 5) * stretch);
            }
            ctx.stroke();
        });

        // Ground bounce ripple
        const phase = (t * 4) % 1;
        ctx.globalAlpha = (1 - phase) * 0.55;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 1.2;
        const ripR = 8 + phase * 22;
        ctx.beginPath();
        ctx.ellipse(x, footY + 6, ripR, ripR * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
