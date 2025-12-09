/**
 * BoostCollectible - Renders speed boost collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class BoostCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.abs(Math.sin((entity.pulsePhase || 0) + time * 5)) * 0.3 + 0.7;
        const currentRadius = entity.radius * pulse;

        this.renderAura(entity.x, entity.y, currentRadius, entity.color, pulse);
        this.renderArrow(entity.x, entity.y, currentRadius, entity.color);
    }

    renderAura(x, y, radius, color, pulse) {
        const auraSize = radius * 1.5;
        const auraColor = [...color];
        auraColor[3] = 0.3 * pulse;
        this.renderer.drawCircle(x, y, auraSize, auraColor);
    }

    renderArrow(x, y, radius, color) {
        const arrowWidth = radius * 2;
        const arrowHeight = radius * 1.5;

        // Arrow body
        this.renderer.drawRect(
            x - arrowWidth * 0.3,
            y - arrowHeight * 0.2,
            arrowWidth * 0.5,
            arrowHeight * 0.4,
            color
        );

        // Arrow head
        for (let i = 0; i < 3; i++) {
            const stepHeight = arrowHeight * (1 - i / 3) * 0.4;
            const stepX = x + arrowWidth * 0.2 + i * (arrowWidth * 0.2);

            this.renderer.drawRect(
                stepX,
                y - stepHeight / 2,
                arrowWidth * 0.2,
                stepHeight,
                color
            );
        }
    }
}
