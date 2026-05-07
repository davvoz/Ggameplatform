import { SurvivorWorldRenderer } from '../SurvivorWorldRenderer.js';

/**
 * BlitzWorldRenderer — World 6 "Blitz Run" background.
 *
 * Extends SurvivorWorldRenderer (inherits star/nebula parallax + neon grid).
 * Overrides the grid color to reflect chain intensity:
 *
 *   intensity 0.00 – 0.10  → magenta  (no chain / chain ×1-5)
 *   intensity 0.10 – 0.30  → orange   (chain ×5-15)
 *   intensity 0.30 – 0.60  → red      (chain ×15-30)
 *   intensity 0.60 – 1.00  → gold     (chain ×30-50 — HYPER mode)
 *
 * `intensity` is set each frame by BlitzMode via BackgroundFacade.setBlitzIntensity().
 */
export class BlitzWorldRenderer extends SurvivorWorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        /** 0-1 value driven by BlitzMode._getIntensity(). */
        this._intensity = 0;
    }

    /** Called by BackgroundFacade.setBlitzIntensity() every frame. */
    setIntensity(t) {
        this._intensity = Math.max(0, Math.min(1, t));
    }

    // ── override: grid color based on chain intensity ──────────

    _renderGrid(ctx) {
        const w = this.canvasWidth;
        const h = this.canvasHeight;
        const step = this.quality === 'low' ? 60 : 40;
        const pulse = 0.18 + 0.12 * Math.sin(this._gridPhase);
        const t = this._intensity;

        const [r, g, b] = this._gridColor(t);

        ctx.save();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
        ctx.lineWidth = t > 0.6 ? 1.5 : 1;
        ctx.beginPath();

        for (let x = 0; x <= w; x += step) {
            const dx = (x - this._playerX) * 0.05;
            ctx.moveTo(x + dx, 0);
            ctx.lineTo(x - dx, h);
        }
        for (let y = 0; y <= h; y += step) {
            const dy = (y - this._playerY) * 0.05;
            ctx.moveTo(0, y + dy);
            ctx.lineTo(w, y - dy);
        }
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Returns [r, g, b] interpolated along the intensity gradient:
     *  magenta → orange → red → gold
     */
    _gridColor(t) {
        // keyframes: [t, r, g, b]
        const KF = [
            [0, 255,  70, 220],  // magenta
            [0.1, 255, 140,  40],  // orange
            [0.3, 255,  40,  40],  // red
            [0.6, 255, 215,   0],  // gold
            [1, 255, 255, 200],  // near-white blaze
        ];

        for (let i = 1; i < KF.length; i++) {
            if (t <= KF[i][0]) {
                const prev = KF[i - 1];
                const next = KF[i];
                const f = (t - prev[0]) / (next[0] - prev[0]);
                return [
                    Math.round(prev[1] + (next[1] - prev[1]) * f),
                    Math.round(prev[2] + (next[2] - prev[2]) * f),
                    Math.round(prev[3] + (next[3] - prev[3]) * f),
                ];
            }
        }
        return [255, 255, 200];
    }
}
