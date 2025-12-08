/**
 * HeartRechargeCollectible - Renders heart recharge bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class HeartRechargeCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.4 + 1.0;
        const size = entity.radius * pulse;
        const heartPhase = entity.heartPhase;
        const glowPhase = entity.glowPhase;

        this.renderConcentricRings(entity.x, entity.y, size, glowPhase, pulse);
        this.renderOrbitingHearts(entity.x, entity.y, size, heartPhase);
        this.renderMainCircle(entity.x, entity.y, size, entity.color);
        this.renderCenterHeart(entity.x, entity.y, size, heartPhase);
        this.renderMedicalCross(entity.x, entity.y, size);
        this.renderCore(entity.x, entity.y, size, time);
        this.renderEmoji(entity.x, entity.y, size);
    }

    renderConcentricRings(x, y, size, glowPhase, pulse) {
        for (let i = 0; i < 4; i++) {
            const ringPulse = Math.sin(glowPhase + i * 0.8) * 0.3 + 1.0;
            const ringSize = size * (1.3 + i * 0.4) * ringPulse;
            const ringAlpha = (0.6 - i * 0.12) * pulse;
            this.renderer.drawCircle(x, y, ringSize, [1.0, 0.3 + i * 0.1, 0.5, ringAlpha]);
        }
    }

    renderOrbitingHearts(x, y, size, heartPhase) {
        const heartCount = 8;
        for (let i = 0; i < heartCount; i++) {
            const orbitAngle = (i / heartCount) * Math.PI * 2 + heartPhase;
            const orbitRadius = size * (2.5 + Math.sin(heartPhase * 2 + i) * 0.4);
            const hx = x + Math.cos(orbitAngle) * orbitRadius;
            const hy = y + Math.sin(orbitAngle) * orbitRadius;
            const heartSize = 6 + Math.sin(heartPhase * 3 + i) * 2;
            const heartPulse = Math.sin(heartPhase * 4 + i * 0.5) * 0.3 + 1.0;

            // Small hearts
            this.renderer.drawCircle(hx - heartSize * 0.25, hy - heartSize * 0.15, heartSize * 0.5 * heartPulse, [1.0, 0.2, 0.4, 0.9]);
            this.renderer.drawCircle(hx + heartSize * 0.25, hy - heartSize * 0.15, heartSize * 0.5 * heartPulse, [1.0, 0.2, 0.4, 0.9]);
            this.renderer.drawCircle(hx, hy + heartSize * 0.2, heartSize * 0.6 * heartPulse, [1.0, 0.2, 0.4, 0.9]);

            // Glow
            this.renderer.drawCircle(hx, hy, heartSize * 1.2, [1.0, 0.5, 0.7, 0.3]);
        }
    }

    renderMainCircle(x, y, size, color) {
        this.renderer.drawCircle(x, y, size * 1.6, [1.0, 0.15, 0.4, 0.5]);
        this.renderer.drawCircle(x, y, size * 1.2, [1.0, 0.2, 0.45, 0.7]);
        this.renderer.drawCircle(x, y, size, color);
    }

    renderCenterHeart(x, y, size, heartPhase) {
        const heartBeat = Math.sin(heartPhase * 5) * 0.2 + 1.0;
        const centerHeartSize = size * 0.7 * heartBeat;

        this.renderer.drawCircle(
            x - centerHeartSize * 0.3,
            y - centerHeartSize * 0.2,
            centerHeartSize * 0.6,
            [1.0, 1.0, 1.0, 1.0]
        );
        this.renderer.drawCircle(
            x + centerHeartSize * 0.3,
            y - centerHeartSize * 0.2,
            centerHeartSize * 0.6,
            [1.0, 1.0, 1.0, 1.0]
        );
        this.renderer.drawCircle(
            x,
            y + centerHeartSize * 0.3,
            centerHeartSize * 0.8,
            [1.0, 1.0, 1.0, 1.0]
        );
    }

    renderMedicalCross(x, y, size) {
        const crossSize = size * 0.35;
        const crossThickness = crossSize * 0.35;

        // Horizontal bar
        this.renderer.drawRect(
            x - crossSize,
            y - crossThickness / 2,
            crossSize * 2,
            crossThickness,
            [1.0, 0.9, 0.95, 0.9]
        );

        // Vertical bar
        this.renderer.drawRect(
            x - crossThickness / 2,
            y - crossSize,
            crossThickness,
            crossSize * 2,
            [1.0, 0.9, 0.95, 0.9]
        );
    }

    renderCore(x, y, size, time) {
        this.renderer.drawCircle(x, y, size * 0.25, [1.0, 1.0, 1.0, 1.0]);

        const sparkleSize = size * 0.3;
        const sparkleOffset = Math.sin(time * 8) * sparkleSize * 0.15;
        this.renderer.drawCircle(
            x + sparkleOffset,
            y - sparkleOffset,
            sparkleSize * 0.8,
            [1.0, 1.0, 1.0, 0.85 + Math.sin(time * 10) * 0.15]
        );
    }

    renderEmoji(x, y, size) {
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            this.textCtx.font = `bold ${size * 1.2}px Arial`;
            this.textCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.textCtx.shadowBlur = 4;
            this.textCtx.shadowOffsetX = 2;
            this.textCtx.shadowOffsetY = 2;
            this.textCtx.fillText('💕', x, y);
            this.textCtx.restore();
        }
    }
}
