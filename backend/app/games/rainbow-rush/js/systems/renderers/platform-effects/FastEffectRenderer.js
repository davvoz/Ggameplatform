import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Fast platform effect - speed lines
 */
export class FastEffectRenderer extends PlatformEffectRenderer {
    render(platform, x, y, time) {
        for (let i = 0; i < 2; i++) {
            const lineX = x + ((time * 300 + i * 40) % platform.width);
            this.renderer.drawRect(lineX, y + 3, 2, platform.height - 6, [1.0, 0.5, 0.2, 0.4]);
        }
    }
}
