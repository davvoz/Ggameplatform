/**
 * FlightCollectible - Renders flight/instant flight bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class FlightCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.3 + 1.0;
        const size = entity.radius * pulse;
        const wingPhase = Math.sin(entity.wingPhase);

        this.renderMainCircle(entity.x, entity.y, size, entity.color);
        this.renderWings(entity.x, entity.y, size, wingPhase);
        this.renderFeathers(entity.x, entity.y, size, wingPhase);
        this.renderCore(entity.x, entity.y, size, time);
    }

    renderMainCircle(x, y, size, color) {
        this.renderer.drawCircle(x, y, size * 1.5, [...color, 0.4]);
        this.renderer.drawCircle(x, y, size * 1.2, [...color, 0.7]);
        this.renderer.drawCircle(x, y, size * 0.9, color);
    }

    renderWings(x, y, size, wingPhase) {
        const wingWidth = size * 1.2;
        const wingY = wingPhase * 8;

        // Left wing
        this.renderer.drawCircle(
            x - size * 1.0,
            y + wingY,
            wingWidth,
            [0.8, 0.95, 1.0, 0.4 + wingPhase * 0.15]
        );

        // Right wing
        this.renderer.drawCircle(
            x + size * 1.0,
            y - wingY,
            wingWidth,
            [0.8, 0.95, 1.0, 0.4 - wingPhase * 0.15]
        );
    }

    renderFeathers(x, y, size, wingPhase) {
        for (let i = 0; i < 3; i++) {
            const featherAngle = (i / 3) * Math.PI * 0.5 - Math.PI * 0.25;
            const featherDist = size * 1.8;

            // Left feathers
            const fx1 = x - size * 1.2 + Math.cos(featherAngle) * featherDist;
            const fy1 = y + wingPhase * 8 + Math.sin(featherAngle) * featherDist;
            this.renderer.drawCircle(fx1, fy1, 3, [1.0, 1.0, 1.0, 0.5]);

            // Right feathers
            const fx2 = x + size * 1.2 + Math.cos(Math.PI - featherAngle) * featherDist;
            const fy2 = y - wingPhase * 8 + Math.sin(Math.PI - featherAngle) * featherDist;
            this.renderer.drawCircle(fx2, fy2, 3, [1.0, 1.0, 1.0, 0.5]);
        }
    }

    renderCore(x, y, size, time) {
        this.renderer.drawCircle(x, y, size * 0.5, [1.0, 1.0, 1.0, 1.0]);

        const sparkleSize = size * 0.3;
        this.renderer.drawCircle(
            x - sparkleSize * 0.3,
            y - sparkleSize * 0.3,
            sparkleSize,
            [1.0, 1.0, 1.0, 0.9 + Math.sin(time * 10) * 0.1]
        );
    }
}
