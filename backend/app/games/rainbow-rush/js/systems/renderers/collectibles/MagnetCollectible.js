/**
 * MagnetCollectible - Renders magnet bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class MagnetCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const pulse = Math.sin(entity.pulsePhase) * 0.3 + 1.0;
        const size = entity.radius * pulse;

        this.renderMagneticField(entity.x, entity.y, size);
        this.renderMagnet(entity.x, entity.y, size);
    }

    renderMagneticField(x, y, size) {
        this.renderer.drawCircle(x, y, size * 1.5, [1.0, 0.3, 0.9, 0.2]);
        this.renderer.drawCircle(x, y, size * 1.2, [1.0, 0.4, 0.9, 0.3]);
    }

    renderMagnet(x, y, size) {
        const magnetWidth = size * 0.6;
        const magnetHeight = size * 1.0;

        // Left pole (red)
        this.renderer.drawRect(
            x - magnetWidth - 2,
            y - magnetHeight / 2,
            magnetWidth,
            magnetHeight,
            [1.0, 0.2, 0.2, 1.0]
        );

        // Right pole (blue)
        this.renderer.drawRect(
            x + 2,
            y - magnetHeight / 2,
            magnetWidth,
            magnetHeight,
            [0.2, 0.3, 1.0, 1.0]
        );

        // Connector
        this.renderer.drawRect(
            x - 3,
            y - magnetHeight / 2 - 4,
            6,
            4,
            [0.7, 0.7, 0.7, 1.0]
        );

        // Center glow
        this.renderer.drawCircle(x, y, size * 0.3, [1.0, 1.0, 1.0, 0.9]);
    }
}
