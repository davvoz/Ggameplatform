import { SkyGradientRenderer } from './layers/SkyGradientRenderer.js';
import { GroundRenderer } from './layers/GroundRenderer.js';
import { SimpleShapeRenderer } from './layers/SimpleShapeRenderer.js';
import { CelestialRenderer } from './layers/CelestialRenderer.js';
import { VegetationRenderer } from './layers/VegetationRenderer.js';
import { AuroraWaveRenderer } from './layers/AuroraWaveRenderer.js';
import { VolcanoRenderer } from './layers/VolcanoRenderer.js';
import { LavaFlowRenderer } from './layers/LavaFlowRenderer.js';

/**
 * Factory for creating layer renderers
 * Follows Factory Pattern and Open/Closed Principle
 * Makes it easy to add new renderer types without modifying existing code
 */
export class LayerRendererFactory {
    constructor(renderer) {
        this.renderer = renderer;
        this.renderers = this.initializeRenderers();
    }

    initializeRenderers() {
        return [
            new SkyGradientRenderer(this.renderer),
            new GroundRenderer(this.renderer),
            new SimpleShapeRenderer(this.renderer),
            new CelestialRenderer(this.renderer),
            new VegetationRenderer(this.renderer),
            new AuroraWaveRenderer(this.renderer),
            new VolcanoRenderer(this.renderer),
            new LavaFlowRenderer(this.renderer)
        ];
    }

    /**
     * Get renderer for specific layer type
     * @param {string} layerType - Type of layer
     * @returns {BaseLayerRenderer|null} Renderer or null if not found
     */
    getRenderer(layerType) {
        return this.renderers.find(renderer => renderer.canHandle(layerType)) || null;
    }

    /**
     * Register a new renderer
     * Allows extending functionality at runtime
     * @param {BaseLayerRenderer} renderer - Renderer to register
     */
    registerRenderer(renderer) {
        if (!renderer.canHandle || !renderer.render) {
            throw new Error('Invalid renderer: must implement canHandle() and render()');
        }
        this.renderers.push(renderer);
    }
}
