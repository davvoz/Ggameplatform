/**
 * HeartCollectible - Renders heart/health collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class HeartCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const offset = entity.pulsePhase || 0;
        const floatY = entity.y + Math.sin(offset + time * 2) * (entity.floatAmplitude || 8);
        const pulse = Math.sin(offset + time * 4) * 0.25 + 1.0;
        const size = entity.radius * pulse;

        this.renderHeartShape(entity.x, floatY, size, entity.color, pulse);
        this.renderSparkles(entity.x, floatY, size, time, pulse);
    }

    renderHeartShape(x, y, size, color, pulse) {
        // Heart lobes
        const lobeRadius = size * 0.55;
        const lobeOffset = size * 0.4;
        this.renderer.drawCircle(x - lobeOffset, y - size * 0.15, lobeRadius, color);
        this.renderer.drawCircle(x + lobeOffset, y - size * 0.15, lobeRadius, color);
        
        // Heart body
        this.renderer.drawRect(x - size * 0.7, y, size * 1.4, size * 0.8, color);

        // Heart point
        for (let i = 0; i < 5; i++) {
            const stepHeight = size * 0.25;
            const stepWidth = size * 1.4 * (1 - (i + 1) / 5);
            const stepY = y + size * 0.8 + i * stepHeight;
            this.renderer.drawRect(x - stepWidth / 2, stepY, stepWidth, stepHeight + 2, color);
        }

        // Highlights
        this.renderer.drawCircle(x - lobeOffset * 0.6, y - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);
        this.renderer.drawCircle(x + lobeOffset * 0.6, y - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);
    }

    renderSparkles(x, y, size, time, pulse) {
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 2.5;
            const orbitRadius = size * 2.2;
            const px = x + Math.cos(angle) * orbitRadius;
            const py = y + Math.sin(angle) * orbitRadius;
            const sparkleSize = 2.5 + Math.sin(time * 5 + i) * 1;
            this.renderer.drawCircle(px, py, sparkleSize, [1.0, 1.0, 1.0, 0.9 * pulse]);
        }
    }
}
