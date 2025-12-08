/**
 * ShieldCollectible - Renders shield bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class ShieldCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.25 + 1.0;
        const size = entity.radius * pulse;
        const hexRotation = (entity.rotation || 0) + time * 1.5;

        this.renderHexagon(entity.x, entity.y, size, hexRotation);
        this.renderCenter(entity.x, entity.y, size);
    }

    renderHexagon(x, y, size, rotation) {
        const sides = 6;

        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + rotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + rotation;
            const x1 = x + Math.cos(angle1) * size * 1.3;
            const y1 = y + Math.sin(angle1) * size * 1.3;
            const x2 = x + Math.cos(angle2) * size * 1.3;
            const y2 = y + Math.sin(angle2) * size * 1.3;

            // Edge line
            for (let j = 0; j < 8; j++) {
                const t = j / 8;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 4, [0.3, 1.0, 0.5, 1.0]);
            }

            // Vertex glow
            this.renderer.drawCircle(x1, y1, 6, [0.6, 1.0, 0.7, 1.0]);
            this.renderer.drawCircle(x1, y1, 4, [1.0, 1.0, 1.0, 0.9]);
        }
    }

    renderCenter(x, y, size) {
        this.renderer.drawCircle(x, y, size * 0.7, [0.2, 0.8, 0.4, 1.0]);
        this.renderer.drawCircle(x, y, size * 0.5, [0.4, 1.0, 0.6, 1.0]);
        this.renderer.drawCircle(x, y, size * 0.15, [1.0, 1.0, 1.0, 1.0]);
    }
}
