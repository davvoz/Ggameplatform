/**
 * MultiplierCollectible - Renders score multiplier collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class MultiplierCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.35 + 1.0;
        const size = entity.radius * pulse;

        this.renderLightRays(entity.x, entity.y, size, entity.rotation || 0, time);
        this.renderStar(entity.x, entity.y, size, entity.rotation || 0, time);
        this.renderCore(entity.x, entity.y, size);
    }

    renderLightRays(x, y, size, rotation, time) {
        for (let i = 0; i < 6; i++) {
            const rayAngle = (i / 6) * Math.PI * 2 + rotation;
            const rayLength = size * (2 + Math.sin(time * 5 + i * 0.5) * 0.8);

            for (let j = 0; j < 6; j++) {
                const t = j / 6;
                const px = x + Math.cos(rayAngle) * rayLength * t;
                const py = y + Math.sin(rayAngle) * rayLength * t;
                const rayAlpha = (1 - t) * 0.5;
                this.renderer.drawCircle(px, py, 3 * (1 - t * 0.5), [1.0, 0.9, 0.3, rayAlpha]);
            }
        }
    }

    renderStar(x, y, size, rotation, time) {
        const starPoints = 8;
        for (let i = 0; i < starPoints; i++) {
            const angle = (Math.PI * 2 * i) / starPoints + rotation + time * 2;
            const px = x + Math.cos(angle) * size * 1.4;
            const py = y + Math.sin(angle) * size * 1.4;
            this.renderer.drawCircle(px, py, 6, [1.0, 0.8, 0.2, 1.0]);
        }
    }

    renderCore(x, y, size) {
        this.renderer.drawCircle(x, y, size * 0.9, [1.0, 0.9, 0.3, 1.0]);
        this.renderer.drawCircle(x, y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);
    }
}
