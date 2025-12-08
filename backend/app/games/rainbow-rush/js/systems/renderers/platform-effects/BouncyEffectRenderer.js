import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Bouncy platform effect - energy waves
 */
export class BouncyEffectRenderer extends PlatformEffectRenderer {
    render(platform, x, y, time) {
        const wavePhase = (time * 4) % 1;
        const waveY = y + platform.height + wavePhase * 30;
        const waveAlpha = (1 - wavePhase) * 0.6;
        this.renderer.drawRect(x, waveY, platform.width, 2, [0.4, 1.0, 0.6, waveAlpha]);
        this.renderer.drawRect(x, waveY - 5, platform.width, 1, [0.6, 1.0, 0.8, waveAlpha * 0.5]);
    }
}
