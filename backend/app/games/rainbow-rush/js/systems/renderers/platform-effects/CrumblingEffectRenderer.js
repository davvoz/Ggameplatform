import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Crumbling platform effect - warning indicators
 */
export class CrumblingEffectRenderer extends PlatformEffectRenderer {
    render(platform, x, y, time) {
        const dangerPulse = Math.sin(time * 8) * 0.3 + 0.4;
        this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.3, 0.2, dangerPulse]);
        this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.3, 0.2, dangerPulse]);
    }
}
