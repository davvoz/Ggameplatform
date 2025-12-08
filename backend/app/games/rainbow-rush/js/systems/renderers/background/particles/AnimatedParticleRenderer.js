import { BaseParticleRenderer } from '../BaseParticleRenderer.js';
import { PARTICLE_TYPES, STAR_PARTICLE_CONFIG, FIREFLY_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for animated particles with alpha variations
 * Single Responsibility: Rendering particles with time-based effects
 */
export class AnimatedParticleRenderer extends BaseParticleRenderer {
    canHandle(particleType) {
        return [
            PARTICLE_TYPES.STAR,
            PARTICLE_TYPES.FIREFLY,
            PARTICLE_TYPES.ANIMATED_PARTICLE
        ].includes(particleType);
    }

    doRender(particle, context) {
        const alpha = this.calculateAlpha(particle, context.time);
        const particleColor = this.applyAlpha(particle.color, alpha);
        this.renderer.drawCircle(particle.x, particle.y, particle.radius, particleColor);
    }

    calculateAlpha(particle, time) {
        if (particle.type === PARTICLE_TYPES.STAR) {
            return Math.abs(Math.sin(particle.twinkle || 0)) * 
                   (STAR_PARTICLE_CONFIG.ALPHA_MAX - STAR_PARTICLE_CONFIG.ALPHA_MIN) + 
                   STAR_PARTICLE_CONFIG.ALPHA_MIN;
        }
        
        if (particle.type === PARTICLE_TYPES.FIREFLY) {
            return Math.abs(Math.sin(time / FIREFLY_CONFIG.GLOW_PERIOD + (particle.glowPhase || 0))) * 
                   (FIREFLY_CONFIG.ALPHA_MAX - FIREFLY_CONFIG.ALPHA_MIN) + 
                   FIREFLY_CONFIG.ALPHA_MIN;
        }
        
        return particle.color[3];
    }
}
