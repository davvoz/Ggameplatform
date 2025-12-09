import { PlatformEffectRenderer } from './PlatformEffectRenderer.js';

/**
 * Bouncing platform effect - vertical oscillation
 */
export class BouncingEffectRenderer extends PlatformEffectRenderer {
    static WAVE_COUNT = 3;
    static LINE_COUNT = 4;

    render(platform, x, y, time) {
        if (platform.isBouncing) {
            this.renderBouncingState(platform, x, y, time);
        } else {
            this.renderIdleState(platform, x, y, time);
        }
        this.renderIndicators(platform, x, y, time);
    }

    renderBouncingState(platform, x, y, time) {
        this.renderWaves(platform, x, y, time);
        this.renderMotionLines(platform, x, y, time);
    }

    renderWaves(platform, x, y, time) {
        for (let i = 0; i < BouncingEffectRenderer.WAVE_COUNT; i++) {
            const wavePhase = (time * 4 + i * 0.3) % 1;
            const waveY = y + platform.height + wavePhase * 25;
            const waveAlpha = (1 - wavePhase) * 0.6;
            this.renderer.drawRect(x - 5, waveY, platform.width + 10, 2, [0.5, 0.3, 1.0, waveAlpha]);
        }
    }

    renderMotionLines(platform, x, y, time) {
        for (let i = 0; i < BouncingEffectRenderer.LINE_COUNT; i++) {
            const lineX = x + (platform.width / 4) * i + platform.width / 8;
            const lineOffset = Math.sin(time * 8 + i) * 5;
            const lineAlpha = 0.4 + Math.sin(time * 6 + i) * 0.3;
            this.renderer.drawRect(lineX, y + lineOffset, 2, platform.height - Math.abs(lineOffset * 2), [0.6, 0.4, 1.0, lineAlpha]);
        }
    }

    renderIdleState(platform, x, y, time) {
        const pulse = Math.sin(time * 3) * 0.3 + 0.5;
        this.renderer.drawRect(x, y, platform.width, 2, [0.5, 0.3, 1.0, pulse]);
        this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [0.5, 0.3, 1.0, pulse]);
    }

    renderIndicators(platform, x, y, time) {
        const indicatorSize = 4;
        const indicatorPulse = Math.sin(time * 5) * 0.4 + 0.6;
        this.renderer.drawCircle(x + indicatorSize, y + platform.height / 2, indicatorSize, [0.7, 0.5, 1.0, indicatorPulse]);
        this.renderer.drawCircle(x + platform.width - indicatorSize, y + platform.height / 2, indicatorSize, [0.7, 0.5, 1.0, indicatorPulse]);
    }
}
