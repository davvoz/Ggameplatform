import { BaseParticleRenderer } from '../BaseParticleRenderer.js';
import { PARTICLE_TYPES } from '../BackgroundRendererConfig.js';

/**
 * Renderer for simple circular particles
 * Single Responsibility: Rendering basic particle types
 */
export class SimpleParticleRenderer extends BaseParticleRenderer {
    canHandle(particleType) {
        return [
            PARTICLE_TYPES.BUBBLE,
            PARTICLE_TYPES.LEAF,
            PARTICLE_TYPES.SAND,
            PARTICLE_TYPES.EMBER,
            PARTICLE_TYPES.LAVA_GLOW,
            PARTICLE_TYPES.SMOKE,
            PARTICLE_TYPES.GLOWDUST,
            PARTICLE_TYPES.SPORE,
            PARTICLE_TYPES.AURORA_PARTICLE,
            PARTICLE_TYPES.HEATWAVE,
            PARTICLE_TYPES.SNOWFLAKE
        ].includes(particleType);
    }

    doRender(particle, context) {
        const radius = particle.radius || particle.size / 2;
        this.renderer.drawCircle(particle.x, particle.y, radius, particle.color);
    }
}
