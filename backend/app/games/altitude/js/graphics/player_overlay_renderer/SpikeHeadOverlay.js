/**
 * SpikeHeadOverlay.js
 *
 * Spike charge indicators above the player's head.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class SpikeHeadOverlay extends PlayerOverlay {
    #flashTimers = new Array(5).fill(0);

    draw(ctx, x, y, h, { spikeCount, spikeTimers, spikeCooldown, spike_haste }) {
        if (!spikeCount || spikeCount <= 0) return;

        const headTopY = y - 34;
        const chevH    = 5;
        const rowGap   = 4;
        const halfW    = 6;

        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Count active charges (timer === 0 → ready)
        let activeSegments = 0;
        for (let i = 0; i < spikeCount; i++) {
            if (spikeTimers[i] === 0) activeSegments++;
        }

        for (let i = 0; i < activeSegments; i++) {
            this.#drawSpikeSegment(ctx, {
                headTopY,
                i,
                spikeCount,
                spikeTimers,
                spikeCooldown,
                halfW,
                chevH,
                rowGap,
                x
            });
        }

        if (spike_haste && activeSegments > 0) {
            const topBaseY     = headTopY - (activeSegments - 1) * rowGap - chevH - 4;
            const shimmerAlpha = (0.4 + Math.sin(this._t * 8) * 0.25).toFixed(2);
            ctx.strokeStyle = `rgba(255,160,0,${shimmerAlpha})`;
            ctx.lineWidth   = 1.5;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur  = 8;
            ctx.beginPath();
            ctx.moveTo(x - halfW - 4, topBaseY);
            ctx.lineTo(x + halfW + 4, topBaseY);
            ctx.stroke();
        }

        ctx.restore();
    }

    #drawSpikeSegment(ctx, { headTopY, i, spikeCount, spikeTimers, spikeCooldown, halfW, chevH, rowGap, x }) {
        const logicalIndex = spikeCount - 1 - i;
        const timer = spikeTimers?.[logicalIndex] ?? 0;
        const ready = Math.max(0, 1 - timer / spikeCooldown) >= 1;

        if (ready && this.#flashTimers[logicalIndex] <= 0 && timer === 0) {
            this.#flashTimers[logicalIndex] = 1;
        }
        const flash      = ready ? this.#flashTimers[logicalIndex] : 0;
        const readyColor = flash > 0.5 ? '#ffff88' : '#ff4400';

        const baseY = headTopY - i * rowGap;
        const tipY  = baseY - chevH;

        ctx.shadowBlur  = ready ? 10 : 0;
        ctx.shadowColor = ready ? '#ff8800' : 'transparent';
        ctx.strokeStyle = readyColor;
        ctx.lineWidth   = 2.4;

        ctx.beginPath();
        ctx.moveTo(x - halfW, baseY);
        ctx.lineTo(x,         tipY);
        ctx.lineTo(x + halfW, baseY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,120,0,0.25)';
        ctx.beginPath();
        ctx.moveTo(x - halfW * 0.85, baseY - 1);
        ctx.lineTo(x,                tipY + 1);
        ctx.lineTo(x + halfW * 0.85, baseY - 1);
        ctx.fill();
    }
}
