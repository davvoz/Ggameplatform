import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Rotating platform effect - rotation visualization
 */
export class RotatingEffectRenderer extends PlatformEffectRenderer {
    static CIRCLE_COUNT = 6;
    static LINE_COUNT = 3;

    render(platform, x, y, time) {
        if (platform.isRotating) {
            this.renderRotatingState(platform, x, y, time);
        } else {
            this.renderIdleState(platform, x, y, time);
        }
    }

    renderRotatingState(platform, x, y, time) {
        const centerX = x + platform.width / 2;
        const centerY = y + platform.height / 2;
        
        this.renderRotatingCircles(platform, centerX, centerY, time);
        this.renderMotionLines(platform, x, y, time);
    }

    renderRotatingCircles(platform, centerX, centerY, time) {
        const rotationAngle = platform.rotationAngle || 0;
        
        for (let i = 0; i < RotatingEffectRenderer.CIRCLE_COUNT; i++) {
            const angle = rotationAngle + (i / RotatingEffectRenderer.CIRCLE_COUNT) * Math.PI * 2;
            const radius = platform.width / 2.5;
            const circleX = centerX + Math.cos(angle) * radius;
            const circleY = centerY + Math.sin(angle) * (platform.height / 2);
            const alpha = 0.6 + Math.sin(time * 10 + i) * 0.3;
            this.renderer.drawCircle(circleX, circleY, 3, [1.0, 0.5, 0.0, alpha]);
        }
    }

    renderMotionLines(platform, x, y, time) {
        for (let i = 0; i < RotatingEffectRenderer.LINE_COUNT; i++) {
            const linePhase = (time * 4 + i * 0.3) % 1;
            const lineX = x + linePhase * platform.width;
            const lineAlpha = Math.sin(linePhase * Math.PI) * 0.7;
            this.renderer.drawRect(lineX, y, 2, platform.height, [1.0, 0.6, 0.2, lineAlpha]);
        }
    }

    renderIdleState(platform, x, y, time) {
        const centerX = x + platform.width / 2;
        const centerY = y + platform.height / 2;
        const pulse = Math.sin(time * 3) * 0.3 + 0.5;
        
        this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.5, 0.0, pulse]);
        this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.5, 0.0, pulse]);
        
        this.renderArrows(x, platform.width, centerY, pulse);
    }

    renderArrows(x, width, centerY, pulse) {
        const arrowSize = 4;
        this.renderer.drawCircle(x + arrowSize, centerY, arrowSize, [1.0, 0.6, 0.2, pulse]);
        this.renderer.drawCircle(x + width - arrowSize, centerY, arrowSize, [1.0, 0.6, 0.2, pulse]);
    }
}
