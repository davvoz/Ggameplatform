import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Slow/Icy platform effect - ice crystals and snow
 */
export class SlowEffectRenderer extends PlatformEffectRenderer {
    static CRYSTAL_COUNT = 4;
    static SNOW_COUNT = 6;

    render(platform, x, y, time) {
        this.renderIceCrystals(platform, x, y, time);
        this.renderSnowParticles(platform, x, y, time);
    }

    renderIceCrystals(platform, x, y, time) {
        for (let i = 0; i < SlowEffectRenderer.CRYSTAL_COUNT; i++) {
            const crystalX = x + platform.width * 0.2 + (platform.width * 0.6 / 3) * i;
            const crystalY = y + platform.height / 2;
            const crystalSize = 3 + Math.abs(Math.sin(time * 3 + i * 0.5)) * 3;
            
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2 + time;
                const px = crystalX + Math.cos(angle) * crystalSize;
                const py = crystalY + Math.sin(angle) * crystalSize;
                this.renderer.drawCircle(px, py, 1.5, [0.7, 0.9, 1.0, 0.8]);
            }
            this.renderer.drawCircle(crystalX, crystalY, crystalSize * 0.5, [1.0, 1.0, 1.0, 0.9]);
        }
    }

    renderSnowParticles(platform, x, y, time) {
        for (let i = 0; i < SlowEffectRenderer.SNOW_COUNT; i++) {
            const snowX = x + platform.width * 0.15 + (platform.width * 0.7 / 5) * i + Math.sin(time * 2 + i) * 8;
            const snowY = y - ((time * 30 + i * 10) % 30);
            const snowSize = 1 + Math.sin(time * 5 + i) * 0.5;
            this.renderer.drawCircle(snowX, snowY, snowSize, [0.9, 0.95, 1.0, 0.7]);
        }
    }
}
