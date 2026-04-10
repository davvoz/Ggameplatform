/**
 * GhostRepelOverlay.js
 *
 * Ward aura — rotating arc + ward crosses (ready) / progress arc + % (charging).
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class GhostRepelOverlay extends PlayerOverlay {
    draw(ctx, x, y, h, { ghostRepelCooldown, ghostRepelMaxCd }) {
        if (!ghostRepelMaxCd) return;

        const t     = this._t;
        const cd    = ghostRepelCooldown ?? 0;
        const pct   = cd <= 0 ? 1 : 1 - cd / ghostRepelMaxCd;
        const ready = cd <= 0;
        const r     = 24;

        ctx.save();
        ctx.lineCap = 'round';

        if (ready) {
            ctx.shadowColor = '#66ffee';
            ctx.shadowBlur = 6;

            // Rotating ward arc
            ctx.strokeStyle = 'rgba(80,255,210,0.5)';
            ctx.lineWidth = 2;
            const a = t * 1.4;
            ctx.beginPath();
            ctx.arc(x, y, r, a, a + Math.PI * 1.3);
            ctx.stroke();

            // 3 ward crosses — single batched path
            ctx.strokeStyle = 'rgba(100,255,220,0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const wa = (i / 3) * Math.PI * 2 + t * 0.8;
                const wx = x + Math.cos(wa) * (r + 6);
                const wy = y + Math.sin(wa) * (r + 6);
                ctx.moveTo(wx - 3, wy); ctx.lineTo(wx + 3, wy);
                ctx.moveTo(wx, wy - 3); ctx.lineTo(wx, wy + 3);
            }
            ctx.stroke();
        } else {
            ctx.shadowColor = '#8844ff';
            ctx.shadowBlur = 6;

            // Progress arc
            ctx.strokeStyle = 'rgba(150,55,255,0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();

            // Percentage text
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#bb88ff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(pct * 100) + '%', x, y);
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
