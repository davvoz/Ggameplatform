/**
 * DashChevronOverlay.js
 *
 * Cyan speed-chevrons on the forward side + charge dots below feet.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class DashChevronOverlay extends PlayerOverlay {
    draw(ctx, x, y, h, { facing = 1, dashCount = 0, dashRemaining = 0, dashing = false }) {
        const t   = this._t;
        const bY  = y - h * 0.08;
        const bX  = x + facing * 14;
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = '#00ddff'; ctx.shadowBlur = 5;

        // Speed chevrons (brighter while dashing)
        for (let i = 0; i < 3; i++) {
            const cy        = bY + i * 5;
            const baseAlpha = dashing ? 0.9 : 0.48;
            const alpha     = (baseAlpha + Math.sin(t * 5 + i * 1.2) * 0.28).toFixed(2);
            ctx.strokeStyle = `rgba(0,220,255,${alpha})`; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bX,                cy - 2.5);
            ctx.lineTo(bX + facing * 4.5, cy);
            ctx.lineTo(bX,                cy + 2.5);
            ctx.stroke();
        }

        if (dashCount > 0) {
            this.#drawChargeDots(ctx, x, y, h, dashCount, dashRemaining);
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    #drawChargeDots(ctx, x, y, h, dashCount, dashRemaining) {
        const t      = this._t;
        const footY  = y + h * 0.55;
        const totalW = dashCount * 6 + (dashCount - 1) * 3;
        const startX = x - totalW / 2;

        for (let i = 0; i < dashCount; i++) {
            const dotX  = startX + i * 9 + 3;
            const ready = i < dashRemaining;

            ctx.beginPath();
            ctx.arc(dotX, footY, 3, 0, Math.PI * 2);

            if (ready) {
                ctx.fillStyle  = '#00eeff';
                ctx.globalAlpha = 0.85 + Math.sin(t * 3 + i) * 0.15;
                ctx.shadowColor = '#00ddff';
                ctx.shadowBlur  = 6;
            } else {
                ctx.fillStyle   = '#224';
                ctx.globalAlpha = 0.4;
                ctx.shadowBlur  = 0;
            }
            ctx.fill();

            ctx.strokeStyle = ready ? '#44ffff' : '#335';
            ctx.lineWidth   = 1;
            ctx.globalAlpha = ready ? 0.6 : 0.3;
            ctx.stroke();
        }
    }
}
