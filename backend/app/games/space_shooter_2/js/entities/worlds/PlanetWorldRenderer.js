/**
 * PlanetWorldRenderer — World 2 (Levels 31-60)
 *
 * Orchestrates planet-type sub-renderers (Jungle, Volcanic, Frozen, Desert).
 * No stars/nebulae — we're flying over a planet surface.
 *
 * Each planet type is handled by a PlanetRenderer subclass.
 * To add a new planet type:
 *   1. Create a PlanetRenderer subclass (e.g. OceanPlanetRenderer)
 *   2. Register its fx key here in this.planetRenderers
 *   3. Add LevelsThemes entries with the matching fx key
 */
import { WorldRenderer } from './WorldRenderer.js';
import { JunglePlanetRenderer } from './planets/JunglePlanetRenderer.js';
import { VolcanicPlanetRenderer } from './planets/VolcanicPlanetRenderer.js';
import { FrozenPlanetRenderer } from './planets/FrozenPlanetRenderer.js';
import { DesertPlanetRenderer } from './planets/DesertPlanetRenderer.js';
import { MechanicalPlanetRenderer } from './planets/MechanicalPlanetRenderer.js';
import { ToxicPlanetRenderer } from './planets/ToxicPlanetRenderer.js';

export class PlanetWorldRenderer extends WorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);

        /**
         * Registry: fx-key -> PlanetRenderer instance.
         * Add new planet types here.
         */
        this.planetRenderers = {
            jungle:     new JunglePlanetRenderer(canvasWidth, canvasHeight, quality),
            volcanic:   new VolcanicPlanetRenderer(canvasWidth, canvasHeight, quality),
            frozen:     new FrozenPlanetRenderer(canvasWidth, canvasHeight, quality),
            desert:     new DesertPlanetRenderer(canvasWidth, canvasHeight, quality),
            mechanical: new MechanicalPlanetRenderer(canvasWidth, canvasHeight, quality),
            toxic:      new ToxicPlanetRenderer(canvasWidth, canvasHeight, quality),
        };

        /** Currently active planet renderer (null if none matched). */
        this._activePlanet = null;
    }

    // ── lifecycle ──────────────────────────────────

    build(theme) {
        const fxKey = theme.fx;
        this._activePlanet = this.planetRenderers[fxKey] || null;

        if (this._activePlanet) {
            this._activePlanet.build(theme);
        }
    }

    update(dt) {
        if (this._activePlanet) {
            this._activePlanet.update(dt);
        }
    }

    renderBackground(ctx, time) {
        if (this._activePlanet) {
            this._activePlanet.renderBackground(ctx, time);
        }
    }

    renderFx(ctx, fxParticles, time) {
        if (this._activePlanet && this._activePlanet.fxLayerOrder) {
            this._renderFxSorted(ctx, fxParticles, this._activePlanet.fxLayerOrder);
        } else {
            super.renderFx(ctx, fxParticles, time);
        }
    }

    renderOverlay(ctx, time) {
        if (this._activePlanet) {
            this._activePlanet.renderOverlay(ctx, time);
        }
    }

    // ── helpers ────────────────────────────────────

    resize(canvasWidth, canvasHeight) {
        super.resize(canvasWidth, canvasHeight);
        for (const pr of Object.values(this.planetRenderers)) {
            pr.resize(canvasWidth, canvasHeight);
        }
    }

    setQuality(quality) {
        super.setQuality(quality);
        for (const pr of Object.values(this.planetRenderers)) {
            pr.setQuality(quality);
        }
    }
}

export default PlanetWorldRenderer;
