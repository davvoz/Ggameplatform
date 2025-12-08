/**
 * CoinRainCollectible - Renders coin rain bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class CoinRainCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const pulse = Math.sin(entity.pulsePhase) * 0.3 + 1.0;
        const size = entity.radius * pulse;

        this.renderMainCircle(entity.x, entity.y, size, entity.color);
        this.renderOrbitingCoins(entity, size);
        this.renderSparkles(entity, size, context.time);
    }

    renderMainCircle(x, y, size, color) {
        this.renderer.drawCircle(x, y, size, color);
        this.renderer.drawCircle(x, y, size * 0.85, [1.0, 0.95, 0.6, 1.0]);
        this.renderer.drawCircle(x, y, size * 0.4, [1.0, 1.0, 1.0, 0.9]);
    }

    renderOrbitingCoins(entity, size) {
        const numCoins = 5;
        for (let i = 0; i < numCoins; i++) {
            const angle = (entity.coinOrbitPhase + i * (Math.PI * 2 / numCoins));
            const orbitRadius = size * 1.5;
            const coinX = entity.x + Math.cos(angle) * orbitRadius;
            const coinY = entity.y + Math.sin(angle) * orbitRadius;
            const coinSize = 6;

            this.renderer.drawCircle(coinX, coinY, coinSize, [1.0, 0.84, 0.0, 1.0]);
            this.renderer.drawCircle(coinX, coinY, coinSize * 0.7, [1.0, 0.95, 0.4, 1.0]);
        }
    }

    renderSparkles(entity, size, time) {
        for (let i = 0; i < 8; i++) {
            const sparkleAngle = entity.sparklePhase + i * (Math.PI / 4);
            const sparkleRadius = size * 1.2 + Math.sin(entity.sparklePhase * 3 + i) * 8;
            const sparkleX = entity.x + Math.cos(sparkleAngle) * sparkleRadius;
            const sparkleY = entity.y + Math.sin(sparkleAngle) * sparkleRadius;
            const sparkleAlpha = (Math.sin(entity.sparklePhase * 4 + i) + 1) * 0.5;

            this.renderer.drawCircle(sparkleX, sparkleY, 3, [1.0, 1.0, 0.8, sparkleAlpha]);
        }
    }
}
