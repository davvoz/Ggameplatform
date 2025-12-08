import { BaseParticleRenderer } from '../BaseParticleRenderer.js';
import { PARTICLE_TYPES, BIRD_CONFIG, FISH_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for animated creature particles (birds, fish)
 * Single Responsibility: Rendering moving creatures
 */
export class CreatureRenderer extends BaseParticleRenderer {
    canHandle(particleType) {
        return [
            PARTICLE_TYPES.BIRD, 
            PARTICLE_TYPES.FISH,
            PARTICLE_TYPES.CREATURE
        ].includes(particleType);
    }

    doRender(particle, context) {
        if (particle.type === PARTICLE_TYPES.BIRD) {
            this.renderBird(particle, context.time);
        } else if (particle.type === PARTICLE_TYPES.FISH) {
            this.renderFish(particle, context.time);
        } else if (particle.type === PARTICLE_TYPES.CREATURE) {
            this.renderCreature(particle);
        }
    }

    renderBird(particle, time) {
        const wingFlap = Math.sin(time / BIRD_CONFIG.WING_FLAP_PERIOD + (particle.wingPhase || 0)) * 
                        BIRD_CONFIG.WING_FLAP_AMPLITUDE;
        
        // Left wing
        this.renderer.drawRect(
            particle.x - particle.size,
            particle.y + wingFlap,
            particle.size,
            1,
            particle.color
        );
        
        // Right wing
        this.renderer.drawRect(
            particle.x,
            particle.y - wingFlap,
            particle.size,
            1,
            particle.color
        );
    }

    renderFish(particle, time) {
        const swimWave = Math.sin(time / FISH_CONFIG.SWIM_PERIOD + (particle.swimPhase || 0)) * 
                        FISH_CONFIG.SWIM_AMPLITUDE;
        
        // Body
        this.renderer.drawCircle(
            particle.x,
            particle.y,
            particle.size / 2,
            particle.color
        );
        
        // Tail
        this.renderer.drawRect(
            particle.x - particle.size,
            particle.y + swimWave,
            particle.size * FISH_CONFIG.TAIL_WIDTH_RATIO,
            FISH_CONFIG.TAIL_HEIGHT,
            particle.color
        );
    }

    renderCreature(particle) {
        // Generic creature (e.g., flying vehicle)
        this.renderer.drawCircle(
            particle.x,
            particle.y,
            particle.size / 2,
            particle.color
        );
        
        // Trail effect if present
        if (particle.trailColor) {
            this.renderer.drawRect(
                particle.x - particle.size,
                particle.y - 1,
                particle.size * 0.8,
                2,
                particle.trailColor
            );
        }
    }
}
