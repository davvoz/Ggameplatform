/**
 * PowerupCollectible - Renders generic powerup collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class PowerupCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const radius = entity.radius || 20;
        const rotationPulse = Math.sin((entity.rotationAngle || 0) * 2) * 0.3 + 1.0;
        const bigPulse = Math.abs(Math.sin((entity.rotationAngle || 0) * 3)) * 0.5 + 0.5;
        const currentRadius = radius * rotationPulse;

        this.renderOuterAura(entity.x, entity.y, currentRadius, entity.glowColor, bigPulse);
        this.renderRotatingRing(entity.x, entity.y, currentRadius, entity.rotationAngle || 0, entity.color, bigPulse);
        this.renderMainBody(entity.x, entity.y, currentRadius, entity.color);
        this.renderOrbitingParticles(entity.x, entity.y, currentRadius, entity.rotationAngle || 0, entity.color);
        this.renderPulsingStar(entity.x, entity.y, currentRadius, entity.rotationAngle || 0, bigPulse);
    }

    renderOuterAura(x, y, radius, glowColor, pulse) {
        for (let i = 0; i < 2; i++) {
            const auraSize = radius * (2.2 - i * 0.5);
            const auraColor = [...glowColor];
            auraColor[3] = (0.15 - i * 0.05) * pulse;
            this.renderer.drawCircle(x, y, auraSize, auraColor);
        }
    }

    renderRotatingRing(x, y, radius, rotation, color, pulse) {
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
            const angle = rotation * 2 + (i * Math.PI * 2 / ringCount);
            const ringRadius = radius * 1.6;
            const rx = x + Math.cos(angle) * ringRadius;
            const ry = y + Math.sin(angle) * ringRadius;
            const ringColor = [...color];
            ringColor[3] = 0.5 * pulse;
            this.renderer.drawCircle(rx, ry, 4, ringColor);
        }
    }

    renderMainBody(x, y, radius, color) {
        this.renderer.drawCircle(x, y, radius, color);
        this.renderer.drawCircle(x, y, radius * 0.7, [1.0, 1.0, 1.0, 0.5]);

        const centerColor = [...color];
        centerColor[3] = 1.0;
        this.renderer.drawCircle(x, y, radius * 0.5, centerColor);
    }

    renderOrbitingParticles(x, y, radius, rotation, color) {
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const angle = (-rotation * 1.5 + (i * Math.PI * 2 / particleCount));
            const distance = radius * 1.5;
            const px = x + Math.cos(angle) * distance;
            const py = y + Math.sin(angle) * distance;

            const particleGlow = [...color];
            particleGlow[3] = 0.3;
            this.renderer.drawCircle(px, py, 5, particleGlow);

            const particleColor = [...color];
            particleColor[3] = 0.7;
            this.renderer.drawCircle(px, py, 3, particleColor);
        }
    }

    renderPulsingStar(x, y, radius, rotation, pulse) {
        const starPoints = 6;
        for (let i = 0; i < starPoints; i++) {
            const angle = rotation * 3 + (i * Math.PI * 2 / starPoints);
            const rayLength = radius * 0.3 * pulse;
            const sx = x + Math.cos(angle) * rayLength;
            const sy = y + Math.sin(angle) * rayLength;

            const starColor = [1.0, 1.0, 1.0, 0.5 * pulse];
            this.renderer.drawCircle(sx, sy, 2, starColor);
        }
    }
}
