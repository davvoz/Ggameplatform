import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Rescue platform effect - simplified static rendering
 */
export class RescueEffectRenderer extends PlatformEffectRenderer {
    render(platform, x, y) {
        const shape = platform.shape || 'rect';
        
        if (shape === 'rounded') {
            this.renderRounded(platform, x, y);
        } else {
            this.renderDefault(platform, x, y);
        }
    }

    renderDefault(platform, x, y) {
        this.renderer.drawRect(x, y, platform.width, platform.height, platform.color);
        this.renderer.drawRect(x, y, platform.width, 2, [1.0, 1.0, 1.0, 0.3]);
    }

    renderRounded(platform, x, y) {
        const radius = platform.height / 2;
        
        this.renderer.drawCircle(x + radius, y + radius, radius, platform.color);
        this.renderer.drawCircle(x + platform.width - radius, y + radius, radius, platform.color);
        this.renderer.drawRect(x + radius, y, platform.width - radius * 2, platform.height, platform.color);
        
        const highlightColor = [1.0, 1.0, 1.0, 0.3];
        this.renderer.drawCircle(x + radius, y + radius * 0.6, radius * 0.5, highlightColor);
        this.renderer.drawCircle(x + platform.width - radius, y + radius * 0.6, radius * 0.5, highlightColor);
    }
}
