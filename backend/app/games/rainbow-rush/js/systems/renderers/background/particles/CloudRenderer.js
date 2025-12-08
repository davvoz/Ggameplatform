import { BaseParticleRenderer } from '../BaseParticleRenderer.js';
import { PARTICLE_TYPES, CLOUD_CONFIG } from '../BackgroundRendererConfig.js';

/**
 * Renderer for cloud particles with puffs
 * Single Responsibility: Rendering complex cloud structures
 */
export class CloudRenderer extends BaseParticleRenderer {
    canHandle(particleType) {
        return particleType === PARTICLE_TYPES.CLOUD;
    }

    doRender(particle, context) {
        if (!particle.puffs || particle.puffs.length === 0) {
            return;
        }

        this.renderShadows(particle);
        this.renderPuffs(particle);
        this.renderHighlights(particle);
    }

    renderShadows(particle) {
        for (const puff of particle.puffs) {
            this.renderer.drawCircle(
                particle.x + puff.offsetX + CLOUD_CONFIG.SHADOW_OFFSET,
                particle.y + puff.offsetY + CLOUD_CONFIG.SHADOW_OFFSET,
                puff.radius,
                CLOUD_CONFIG.SHADOW_COLOR
            );
        }
    }

    renderPuffs(particle) {
        for (const puff of particle.puffs) {
            this.renderer.drawCircle(
                particle.x + puff.offsetX,
                particle.y + puff.offsetY,
                puff.radius,
                particle.color
            );
        }
    }

    renderHighlights(particle) {
        const highlightCount = Math.min(CLOUD_CONFIG.HIGHLIGHT_COUNT, particle.puffs.length);
        
        for (let i = 0; i < highlightCount; i++) {
            const puff = particle.puffs[i];
            this.renderer.drawCircle(
                particle.x + puff.offsetX - puff.radius * CLOUD_CONFIG.HIGHLIGHT_OFFSET_RATIO,
                particle.y + puff.offsetY - puff.radius * CLOUD_CONFIG.HIGHLIGHT_OFFSET_RATIO,
                puff.radius * CLOUD_CONFIG.HIGHLIGHT_SIZE_RATIO,
                CLOUD_CONFIG.HIGHLIGHT_COLOR
            );
        }
    }
}
