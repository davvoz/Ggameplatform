/**
 * PlanetRenderer — Abstract base class for planet-type sub-renderers.
 *
 * Each planet type (Jungle, Volcanic, Frozen, Desert, …) extends this class
 * and implements its own build / update / render pipeline.
 *
 * To add a NEW planet type to an existing world:
 *   1. Create a subclass (e.g. OceanPlanetRenderer)
 *   2. Implement build(), update(), renderBackground(), renderOverlay()
 *   3. Define fxLayerOrder for particle depth sorting
 *   4. Register the fx key in PlanetWorldRenderer.planetRenderers
 *   5. Add theme entries in LevelsThemes.js with { fx: 'ocean', oceanOverlay: true, ... }
 */
export class PlanetRenderer {
    /**
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {'high'|'medium'|'low'} quality
     */
    constructor(canvasWidth, canvasHeight, quality) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.quality = quality;
    }

    /** FX particle depth-sort map: { subType → layer int } */
    get fxLayerOrder() { return null; }

    // ── lifecycle (override in subclasses) ─────────

    /** Build all overlay structures for the given theme. */
    build(theme) { /* override */ }

    /** Per-frame animation / scrolling. */
    update(dt) { /* override */ }

    /** Render deep features (rivers, canyons, crevasses, etc.) — before FX. */
    renderBackground(ctx, time) { /* override */ }

    /** Render overlay (vignette, edge formations, snowfall, etc.) — after FX. */
    renderOverlay(ctx, time) { /* override */ }

    // ── helpers ────────────────────────────────────

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    setQuality(quality) {
        this.quality = quality;
    }

    /**
     * Utility: generate edge formations distributed around screen edges.
     * Shared pattern used by jungle trees, volcanic rocks, glaciers, dune ridges.
     */
    _distributeEdgeElements(count, W, H) {
        const elements = [];
        for (let i = 0; i < count; i++) {
            let side, x, y;
            const r = i / count;
            if (r < 0.35) {
                side = 'left'; x = -5;
                y = (i / (count * 0.35)) * H + (Math.random() - 0.5) * H * 0.1;
            } else if (r < 0.70) {
                side = 'right'; x = W + 5;
                y = ((i - count * 0.35) / (count * 0.35)) * H + (Math.random() - 0.5) * H * 0.1;
            } else if (r < 0.85) {
                side = 'top'; x = Math.random() * W; y = -5;
            } else {
                side = 'bottom'; x = Math.random() * W; y = H + 5;
            }
            elements.push({ side, x, y });
        }
        return elements;
    }

    /**
     * Utility: render a vignette on left + right edges.
     * @param {string} vigRGB  — e.g. '20,14,8'
     * @param {number} strength — alpha at edge (0-1)
     */
    _renderEdgeVignette(ctx, vigRGB, strength = 0.45, widthFrac = 0.15) {
        const W = this.canvasWidth, H = this.canvasHeight;
        const edgeW = W * widthFrac;
        const vCol = `rgba(${vigRGB},`;
        // Left
        const lgL = ctx.createLinearGradient(0, 0, edgeW, 0);
        lgL.addColorStop(0, vCol + `${strength})`);
        lgL.addColorStop(0.5, vCol + `${strength * 0.33})`);
        lgL.addColorStop(1, vCol + '0)');
        ctx.fillStyle = lgL;
        ctx.fillRect(0, 0, edgeW, H);
        // Right
        const lgR = ctx.createLinearGradient(W, 0, W - edgeW, 0);
        lgR.addColorStop(0, vCol + `${strength})`);
        lgR.addColorStop(0.5, vCol + `${strength * 0.33})`);
        lgR.addColorStop(1, vCol + '0)');
        ctx.fillStyle = lgR;
        ctx.fillRect(W - edgeW, 0, edgeW, H);
    }

    /**
     * Utility: create a scrolling path (used for rivers, canyons, crevasses).
     * Returns { points[], totalH, baseX, width }.
     */
    _buildScrollingPath(W, H, opts = {}) {
        const {
            baseXMin = 0.2, baseXMax = 0.6,
            pathWidth = [14, 22],
            driftStrength = 16,
            driftMax = 30,
            segHeight = [50, 30],
            wanderFrac = 0.2
        } = opts;

        const baseX = W * baseXMin + Math.random() * W * baseXMax;
        const width = pathWidth[0] + Math.random() * (pathWidth[1] - pathWidth[0]);
        const tileH = H * 3;
        const segH = segHeight[0] + Math.random() * segHeight[1];
        const segs = Math.ceil(tileH / segH);
        const points = [{ x: 0, y: 0 }];
        let cx = 0, drift = (Math.random() - 0.5) * (driftStrength * 0.75);
        for (let i = 0; i < segs; i++) {
            drift += (Math.random() - 0.5) * driftStrength;
            drift = Math.max(-driftMax, Math.min(driftMax, drift));
            cx += drift;
            const maxWander = W * wanderFrac;
            cx = Math.max(-maxWander, Math.min(maxWander, cx));
            points.push({ x: cx, y: (i + 1) * segH });
        }
        const totalH = points[points.length - 1].y;
        return { baseX, width, points, totalH };
    }
}

export default PlanetRenderer;
