/**
 * JetpackOverlay.js
 *
 * Big real-time flames with gradient + white hot core + drifting smoke.
 */

import { PlayerOverlay } from './PlayerOverlay.js';

export class JetpackOverlay extends PlayerOverlay {
    #smoke = [];

    update(dt) {
        super.update(dt);
        if (Math.random() < 0.55) {
            this.#smoke.push({
                ox:   (Math.random() - 0.5) * 12,
                oy:   0,
                vx:   (Math.random() - 0.5) * 18,
                vy:   28 + Math.random() * 22,
                life: 0.38 + Math.random() * 0.28,
                age:  0,
                r:    4 + Math.random() * 4.5,
            });
        }
        // Compact in-place to avoid creating a new array each frame
        let write = 0;
        for (const p of this.#smoke) {
            p.ox += p.vx * dt;
            p.oy += p.vy * dt;
            p.age += dt;
            if (p.age < p.life) {
                this.#smoke[write++] = p;
            }
        }
        this.#smoke.length = write;
    }

    draw(ctx, x, y, h) {
        const t     = this._t;
        const baseY = y + h / 2;

        ctx.save();

        // Smoke trail
        this.#smoke.forEach(p => {
            const alpha = ((1 - p.age / p.life) * 0.3).toFixed(3);
            ctx.fillStyle = `rgba(180,180,210,${alpha})`;
            ctx.beginPath();
            ctx.arc(x + p.ox, baseY + p.oy, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Flame plumes
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 20;
        [-8, 8].forEach(ox => {
            const fh = 20 + Math.sin(t * 22 + ox) * 7;
            const grad = ctx.createLinearGradient(x + ox, baseY, x + ox, baseY + fh);
            grad.addColorStop(0,    '#ffff88');
            grad.addColorStop(0.3, '#ff8800');
            grad.addColorStop(0.8, '#ff3300');
            grad.addColorStop(1,    'rgba(255,50,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(x + ox, baseY + fh * 0.42, 5.5, fh, 0, 0, Math.PI * 2);
            ctx.fill();

            // White-hot inner core
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.ellipse(x + ox, baseY + 3, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
