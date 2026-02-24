/**
 * WorldRenderer — Abstract base class for world background renderers.
 *
 * Each "world" spans 30 levels (1-30, 31-60, 61-90, …).
 * Subclasses implement build / update / render for their unique visuals.
 *
 * To add a new World:
 *   1. Create a subclass of WorldRenderer (e.g. UnderwaterWorldRenderer)
 *   2. Implement build(), update(), renderBackground(), renderFx(), renderOverlay()
 *   3. Register it in BackgroundFacade.worlds[]
 *   4. Add the 30 theme entries in LevelsThemes.js
 */
export class WorldRenderer {
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

    // ── lifecycle ──────────────────────────────────

    /**
     * Build / rebuild all background entities for the given theme.
     * Called when the level changes to a theme handled by this world.
     * @param {object} theme  — the theme object from LevelsThemes
     */
    build(theme) { /* override */ }

    /**
     * Per-frame update (scrolling, animation).
     * @param {number} dt  — seconds since last frame
     */
    update(dt) { /* override */ }

    /**
     * Render the deep background layer (stars, rivers, canyons, etc.)
     * drawn BEFORE FX particles.
     */
    renderBackground(ctx, time) { /* override */ }

    /**
     * Render FX particles in the correct depth order for this world.
     * @param {CanvasRenderingContext2D} ctx
     * @param {BgFxParticle[]} fxParticles
     * @param {number} time
     */
    renderFx(ctx, fxParticles, time) {
        // Default: render unsorted
        for (const fx of fxParticles) {
            fx.render(ctx, this.canvasWidth, this.canvasHeight);
        }
    }

    /**
     * Render the overlay layer (vignettes, edges, snowfall, etc.)
     * drawn AFTER FX particles.
     */
    renderOverlay(ctx, time) { /* override */ }

    /**
     * Render any post-processing effects specific to this world
     * (e.g. black hole glow). Called last.
     */
    renderPostFx(ctx, theme) { /* override */ }

    // ── helpers ────────────────────────────────────

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    setQuality(quality) {
        this.quality = quality;
    }

    /** Utility: sort FX particles by a layer-order map { subType → int } */
    _renderFxSorted(ctx, fxParticles, layerOrder) {
        const sorted = [...fxParticles].sort(
            (a, b) => (layerOrder[a.subType] || 0) - (layerOrder[b.subType] || 0)
        );
        for (const fx of sorted) {
            fx.render(ctx, this.canvasWidth, this.canvasHeight);
        }
    }
}

export default WorldRenderer;
