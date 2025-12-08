import { BaseParticleRenderer } from '../BaseParticleRenderer.js';
import { PARTICLE_TYPES, SHOOTING_STAR_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for shooting star particles
 * Single Responsibility: Rendering shooting stars with trails
 */
export class ShootingStarRenderer extends BaseParticleRenderer {
    canHandle(particleType) {
        return particleType === PARTICLE_TYPES.SHOOTING_STAR;
    }

    doRender(particle, context) {
        // Main star body
        this.renderer.drawRect(
            particle.x,
            particle.y,
            particle.length,
            2,
            particle.color
        );
        
        // Trail
        const trailColor = this.applyAlpha(
            particle.color,
            particle.color[3] * SHOOTING_STAR_CONFIG.TRAIL_ALPHA_MULTIPLIER
        );
        
        this.renderer.drawRect(
            particle.x + particle.length,
            particle.y,
            particle.length * SHOOTING_STAR_CONFIG.TRAIL_LENGTH_RATIO,
            1,
            trailColor
        );
    }
}
