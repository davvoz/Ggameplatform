import { SpaceWorldRenderer } from './SpaceWorldRenderer.js';

/**
 * SurvivorWorldRenderer — World 5 "Adaptive Arena" background.
 *
 * Inherits star/nebula parallax from SpaceWorldRenderer (proven & cheap)
 * and overlays:
 *   - A pulsating magenta neon grid that warps with player movement.
 *   - Cyan/magenta scanlines that drift vertically.
 *   - A subtle vignette in the brand colour.
 *
 * Pure render layer — no game-state mutation.
 */
export class SurvivorWorldRenderer extends SpaceWorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        this._gridPhase = 0;
        this._scanPhase = 0;
        this._playerX = canvasWidth / 2;
        this._playerY = canvasHeight / 2;
    }

    setPlayerInfo(x, y) {
        this._playerX = x;
        this._playerY = y;
    }

    update(dt) {
        super.update(dt);
        this._gridPhase = (this._gridPhase + dt * 0.6) % (Math.PI * 2);
        this._scanPhase = (this._scanPhase + dt * 35) % this.canvasHeight;
    }

    renderBackground(ctx, time) {
        super.renderBackground(ctx, time);
        this._renderGrid(ctx);
    }

    renderOverlay(ctx, time) {
        this._renderScanlines(ctx);
        this._renderVignette(ctx);
    }

    // ───────────────────────────────────────────────
    //  Internal — grid
    // ───────────────────────────────────────────────

    _renderGrid(ctx) {
        const w = this.canvasWidth;
        const h = this.canvasHeight;
        const step = this.quality === 'low' ? 60 : 40;
        const pulse = 0.18 + 0.12 * Math.sin(this._gridPhase);

        ctx.save();
        ctx.strokeStyle = `rgba(255, 70, 220, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Vertical lines warped toward player X
        for (let x = 0; x <= w; x += step) {
            const dx = (x - this._playerX) * 0.05;
            ctx.moveTo(x + dx, 0);
            ctx.lineTo(x - dx, h);
        }
        // Horizontal lines warped toward player Y
        for (let y = 0; y <= h; y += step) {
            const dy = (y - this._playerY) * 0.05;
            ctx.moveTo(0, y + dy);
            ctx.lineTo(w, y - dy);
        }
        ctx.stroke();
        ctx.restore();
    }

    // ───────────────────────────────────────────────
    //  Internal — scanlines
    // ───────────────────────────────────────────────

    _renderScanlines(ctx) {
        if (this.quality === 'low') return;
        const w = this.canvasWidth;
        const h = this.canvasHeight;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const yMagenta = (this._scanPhase) % h;
        const yCyan    = (this._scanPhase + h * 0.5) % h;

        ctx.fillStyle = 'rgba(255, 50, 220, 0.10)';
        ctx.fillRect(0, yMagenta - 1, w, 2);

        ctx.fillStyle = 'rgba(80, 220, 255, 0.08)';
        ctx.fillRect(0, yCyan - 1, w, 2);

        ctx.restore();
    }

    // ───────────────────────────────────────────────
    //  Internal — vignette
    // ───────────────────────────────────────────────

    _renderVignette(ctx) {
        const w = this.canvasWidth;
        const h = this.canvasHeight;
        const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(40, 0, 40, 0.55)');
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}

export default SurvivorWorldRenderer;
