/**
 * SpaceWorldRenderer — World 1 (Levels 1-30)
 *
 * Deep space backgrounds: parallax star fields, nebulae, and space FX.
 * Also used as fallback for planet themes that don't have a custom renderer yet
 * (e.g. Mechanical, Toxic in World 2).
 */
import { WorldRenderer } from './WorldRenderer.js';
import { Star } from './space/Star.js';
import { Nebula } from './space/Nebula.js';

export class SpaceWorldRenderer extends WorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        this.stars = [];
        this.nebulae = [];
    }

    // ── lifecycle ──────────────────────────────────

    build(theme) {
        this.stars = [];
        this.nebulae = [];

        const starCounts = {
            high: [40, 25, 12],
            medium: [25, 15, 8],
            low: [15, 8, 4]
        };
        const counts = starCounts[this.quality] || starCounts.high;
        for (let layer = 0; layer < 3; layer++) {
            for (let i = 0; i < counts[layer]; i++) {
                this.stars.push(new Star(this.canvasWidth, this.canvasHeight, layer, theme));
            }
        }

        if (this.quality !== 'low') {
            for (let i = 0; i < 3; i++) {
                this.nebulae.push(new Nebula(this.canvasWidth, this.canvasHeight, theme));
            }
        }
    }

    update(dt) {
        for (const star of this.stars) {
            star.update(dt, this.canvasWidth, this.canvasHeight);
        }
        for (const nebula of this.nebulae) {
            nebula.update(dt, this.canvasWidth, this.canvasHeight);
        }
    }

    renderBackground(ctx, time) {
        for (const nebula of this.nebulae) {
            nebula.render(ctx);
        }
        for (const star of this.stars) {
            star.render(ctx);
        }
    }

    // FX: default unsorted (inherited from WorldRenderer)

    renderPostFx(ctx, theme) {
        // Black hole center glow
        if (theme && theme.fx === 'blackhole') {
            ctx.save();
            const cx = this.canvasWidth / 2, cy = this.canvasHeight / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
            g.addColorStop(0, 'rgba(0,0,0,0.9)');
            g.addColorStop(0.6, 'rgba(20,0,40,0.3)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

export default SpaceWorldRenderer;
