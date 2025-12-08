import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Dissolving platform effect - particle dissolution
 */
export class DissolvingEffectRenderer extends PlatformEffectRenderer {
    static PARTICLE_COUNT = 8;

    render(platform, x, y, time) {
        if (platform.isDissolving) {
            this.renderDissolvingState(platform, x, y, time);
        } else {
            this.renderIdleState(platform, x, y, time);
        }
    }

    renderDissolvingState(platform, x, y, time) {
        const dissolveProgress = platform.dissolveTimer / platform.dissolveDuration;
        
        this.renderFallingParticles(platform, x, y, dissolveProgress);
        this.renderPulsingBorder(platform, x, y, time, dissolveProgress);
    }

    renderFallingParticles(platform, x, y, dissolveProgress) {
        for (let i = 0; i < DissolvingEffectRenderer.PARTICLE_COUNT; i++) {
            const particleX = x + (platform.width / DissolvingEffectRenderer.PARTICLE_COUNT) * i + Math.random() * 10;
            const particleY = y + platform.height + dissolveProgress * 40;
            const particleSize = 2 + Math.random() * 2;
            const alpha = (1 - dissolveProgress) * 0.8;
            this.renderer.drawCircle(particleX, particleY, particleSize, [1.0, 0.8, 0.3, alpha]);
        }
    }

    renderPulsingBorder(platform, x, y, time, dissolveProgress) {
        const pulse = Math.sin(time * 15 + dissolveProgress * 10) * 0.5 + 0.5;
        const alpha = pulse * (1 - dissolveProgress);
        this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.5, 0.0, alpha]);
        this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.5, 0.0, alpha]);
    }

    renderIdleState(platform, x, y, time) {
        const pulse = Math.sin(time * 4) * 0.3 + 0.6;
        this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.8, 0.2, pulse]);
        this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.8, 0.2, pulse]);
        
        this.renderSparkle(platform, x, y, time);
    }

    renderSparkle(platform, x, y, time) {
        const sparklePhase = (time * 3) % 1;
        if (sparklePhase < 0.3) {
            const sparkleX = x + Math.random() * platform.width;
            const sparkleY = y + Math.random() * platform.height;
            this.renderer.drawCircle(sparkleX, sparkleY, 2, [1.0, 1.0, 0.8, sparklePhase * 3]);
        }
    }
}
