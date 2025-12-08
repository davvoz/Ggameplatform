/**
 * Base class for particle renderers
 * Implements Template Method Pattern
 */
export class BaseParticleRenderer {
    constructor(renderer) {
        if (new.target === BaseParticleRenderer) {
            throw new TypeError('Cannot construct BaseParticleRenderer instances directly');
        }
        this.renderer = renderer;
    }

    /**
     * Template method for rendering
     * @param {Object} particle - Particle configuration
     * @param {Object} context - Rendering context
     */
    render(particle, context) {
        if (!this.canHandle(particle.type)) {
            return;
        }
        this.doRender(particle, context);
    }

    /**
     * Abstract method to be implemented by subclasses
     * @param {Object} particle - Particle configuration
     * @param {Object} context - Rendering context
     */
    doRender(particle, context) {
        throw new Error('Method doRender() must be implemented');
    }

    /**
     * Abstract method to check if renderer can handle particle type
     * @param {string} particleType - Type of particle
     * @returns {boolean}
     */
    canHandle(particleType) {
        throw new Error('Method canHandle() must be implemented');
    }

    /**
     * Helper: Apply alpha to color
     * @param {Array} color - Base color
     * @param {number} alpha - Alpha value
     * @returns {Array} Color with new alpha
     */
    applyAlpha(color, alpha) {
        return [...color.slice(0, 3), alpha];
    }
}
