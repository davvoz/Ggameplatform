/**
 * RainbowCollectible - Renders rainbow bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';
import { RenderingUtils } from '../RenderingUtils.js';

export class RainbowCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.4 + 1.0;
        const size = entity.radius * pulse;

        this.renderRainbowLayers(entity.x, entity.y, size, entity.rainbowPhase, pulse);
        this.renderConcentricRings(entity.x, entity.y, size, entity.rainbowPhase);
        this.renderOrbitingParticles(entity.x, entity.y, size, entity.rainbowPhase, time);
        this.renderCore(entity.x, entity.y, size, pulse);
    }

    renderRainbowLayers(x, y, size, rainbowPhase, pulse) {
        for (let i = 0; i < 6; i++) {
            const hue = ((rainbowPhase * 100 + i * 60) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(x, y, size * (2.5 + i * 0.2), [...rgb, (0.4 - i * 0.05) * pulse]);
        }
    }

    renderConcentricRings(x, y, size, rainbowPhase) {
        for (let i = 0; i < 7; i++) {
            const hue = ((rainbowPhase * 100 + i * 51.4) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(x, y, size * (1.2 - i * 0.15), [...rgb, 1.0]);
        }
    }

    renderOrbitingParticles(x, y, size, rainbowPhase, time) {
        for (let i = 0; i < 15; i++) {
            const orbitAngle = (i / 15) * Math.PI * 2 + time * 4;
            const orbitRadius = size * (2.0 + Math.sin(time * 6 + i) * 0.3);
            const px = x + Math.cos(orbitAngle) * orbitRadius;
            const py = y + Math.sin(orbitAngle) * orbitRadius;
            const hue = ((rainbowPhase * 100 + i * 24) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.7);
            this.renderer.drawCircle(px, py, 2 + Math.sin(time * 10 + i) * 0.8, [...rgb, 0.8]);
        }
    }

    renderCore(x, y, size, pulse) {
        this.renderer.drawCircle(x, y, size * 0.5 * pulse, [1.0, 1.0, 1.0, 1.0]);
    }
}
