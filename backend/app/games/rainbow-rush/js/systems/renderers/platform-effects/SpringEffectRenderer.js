import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Spring platform effect - coil animation
 */
export class SpringEffectRenderer extends PlatformEffectRenderer {
    static NUM_COILS = 8;

    render(platform, x, y, time) {
        const springTime = platform.springAnimationTime || 0;
        const compression = platform.springCompression || 0;
        const coilSpacing = platform.width / (SpringEffectRenderer.NUM_COILS + 1);
        const baseCoilHeight = platform.height * 1.2;
        
        this.renderCoils(platform, x, y, springTime, compression, coilSpacing, baseCoilHeight);
        this.renderEnergyEffect(platform, x, y, springTime, compression);
    }

    renderCoils(platform, x, y, springTime, compression, coilSpacing, baseCoilHeight) {
        for (let i = 0; i < SpringEffectRenderer.NUM_COILS; i++) {
            const coilX = x + coilSpacing * (i + 1);
            const oscillation = Math.sin(springTime * 8 + i * 0.5) * 2;
            const coilHeight = baseCoilHeight * (1 - compression * 0.7) + oscillation;
            const coilY = y + platform.height - coilHeight;
            const coilWidth = 1.8;
            
            this.renderer.drawRect(coilX - coilWidth/2, coilY, coilWidth, coilHeight * 0.5, [1.0, 0.6, 1.0, 1.0]);
            this.renderer.drawRect(coilX - coilWidth/2, coilY + coilHeight * 0.5, coilWidth, coilHeight * 0.5, [0.8, 0.3, 0.8, 1.0]);
            this.renderer.drawRect(coilX - 0.6, coilY + 1, 1.2, coilHeight * 0.3, [1.0, 1.0, 1.0, 0.5]);
        }
    }

    renderEnergyEffect(platform, x, y, springTime, compression) {
        if (compression > 0.3) {
            const energyPulse = Math.sin(springTime * 15) * 0.5 + 0.5;
            const energyColor = [1.0, 1.0, 0.3, compression * 0.8 * energyPulse];
            this.renderer.drawRect(x, y - 3, platform.width, 3, energyColor);
        }
    }
}
