import { SimpleParticleRenderer } from './particles/SimpleParticleRenderer.js';
import { AnimatedParticleRenderer } from './particles/AnimatedParticleRenderer.js';
import { CloudRenderer } from './particles/CloudRenderer.js';
import { CreatureRenderer } from './particles/CreatureRenderer.js';
import { ShootingStarRenderer } from './particles/ShootingStarRenderer.js';

/**
 * Factory for creating particle renderers
 * Follows Factory Pattern and Open/Closed Principle
 */
export class ParticleRendererFactory {
    constructor(renderer) {
        this.renderer = renderer;
        this.renderers = this.initializeRenderers();
    }

    initializeRenderers() {
        return [
            new SimpleParticleRenderer(this.renderer),
            new AnimatedParticleRenderer(this.renderer),
            new CloudRenderer(this.renderer),
            new CreatureRenderer(this.renderer),
            new ShootingStarRenderer(this.renderer)
        ];
    }

    /**
     * Get renderer for specific particle type
     * @param {string} particleType - Type of particle
     * @returns {BaseParticleRenderer|null} Renderer or null if not found
     */
    getRenderer(particleType) {
        return this.renderers.find(renderer => renderer.canHandle(particleType)) || null;
    }

    /**
     * Register a new renderer
     * Allows extending functionality at runtime
     * @param {BaseParticleRenderer} renderer - Renderer to register
     */
    registerRenderer(renderer) {
        if (!renderer.canHandle || !renderer.render) {
            throw new Error('Invalid renderer: must implement canHandle() and render()');
        }
        this.renderers.push(renderer);
    }
}
