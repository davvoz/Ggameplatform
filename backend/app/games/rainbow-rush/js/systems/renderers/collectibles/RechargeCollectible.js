/**
 * RechargeCollectible - Renders energy recharge bonus collectibles
 */
import { BaseCollectible } from './BaseCollectible.js';

export class RechargeCollectible extends BaseCollectible {
    renderVisual(entity, context) {
        const { time } = context;
        const pulse = Math.sin(entity.pulsePhase) * 0.35 + 1.0;
        const size = entity.radius * pulse;
        const energyPhase = entity.energyPhase;

        this.renderEnergyRings(entity.x, entity.y, size, energyPhase);
        this.renderConcentricCircles(entity.x, entity.y, size, entity.color);
        this.renderBattery(entity.x, entity.y, size, energyPhase);
        this.renderOrbitingParticles(entity.x, entity.y, size, entity.orbitPhase, energyPhase);
        this.renderLightning(entity.x, entity.y, size);
        this.renderCore(entity.x, entity.y, size, time);
    }

    renderEnergyRings(x, y, size, energyPhase) {
        for (let i = 0; i < 3; i++) {
            const ringPhase = (energyPhase + i * 2) % 6;
            const ringSize = size * (0.8 + ringPhase * 0.4);
            const ringAlpha = (1 - ringPhase / 6) * 0.8;
            this.renderer.drawCircle(x, y, ringSize, [0.2, 1.0, 0.4, ringAlpha]);
        }
    }

    renderConcentricCircles(x, y, size, color) {
        this.renderer.drawCircle(x, y, size * 1.8, [0.1, 0.8, 0.3, 0.4]);
        this.renderer.drawCircle(x, y, size * 1.4, [0.2, 1.0, 0.4, 0.6]);
        this.renderer.drawCircle(x, y, size, color);
    }

    renderBattery(x, y, size, energyPhase) {
        const batteryWidth = size * 0.8;
        const batteryHeight = size * 1.2;
        const batteryX = x - batteryWidth / 2;
        const batteryY = y - batteryHeight / 2;

        // Battery body
        this.renderer.drawRect(batteryX, batteryY, batteryWidth, batteryHeight, [0.15, 0.8, 0.3, 1.0]);

        // Positive terminal
        this.renderer.drawRect(x - size * 0.2, batteryY - size * 0.2, size * 0.4, size * 0.2, [0.2, 1.0, 0.4, 1.0]);

        // Energy bars
        const barCount = 4;
        const barHeight = (batteryHeight - 8) / barCount;
        for (let i = 0; i < barCount; i++) {
            const barPulse = Math.sin(energyPhase * 2 + i * 0.5) * 0.3 + 0.7;
            this.renderer.drawRect(
                batteryX + 4,
                batteryY + 4 + i * barHeight,
                batteryWidth - 8,
                barHeight - 2,
                [0.4, 1.0, 0.5, barPulse]
            );
        }
    }

    renderOrbitingParticles(x, y, size, orbitPhase, energyPhase) {
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
            const orbitAngle = (i / particleCount) * Math.PI * 2 + orbitPhase;
            const orbitRadius = size * (1.8 + Math.sin(energyPhase + i) * 0.2);
            const px = x + Math.cos(orbitAngle) * orbitRadius;
            const py = y + Math.sin(orbitAngle) * orbitRadius;
            const particleSize = 2.5 + Math.sin(energyPhase * 3 + i) * 1;

            this.renderer.drawCircle(px, py, particleSize, [0.5, 1.0, 0.6, 1.0]);

            // Trail
            const trailAngle = orbitAngle + Math.PI;
            const tx = px + Math.cos(trailAngle) * particleSize * 2;
            const ty = py + Math.sin(trailAngle) * particleSize * 2;
            this.renderer.drawCircle(tx, ty, particleSize * 0.5, [0.3, 0.8, 0.4, 0.5]);
        }
    }

    renderLightning(x, y, size) {
        if (Math.random() < 0.3) {
            const boltCount = 3;
            for (let i = 0; i < boltCount; i++) {
                const boltAngle = Math.random() * Math.PI * 2;
                const boltLength = size * (1.5 + Math.random() * 0.8);
                const boltX = x + Math.cos(boltAngle) * boltLength;
                const boltY = y + Math.sin(boltAngle) * boltLength;

                const steps = 5;
                for (let s = 0; s < steps; s++) {
                    const t = s / steps;
                    const sx = x + (boltX - x) * t;
                    const sy = y + (boltY - y) * t;
                    this.renderer.drawCircle(sx, sy, 2, [1.0, 1.0, 1.0, 1 - t]);
                }
            }
        }
    }

    renderCore(x, y, size, time) {
        this.renderer.drawCircle(x, y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);

        const sparkleSize = size * 0.25;
        this.renderer.drawCircle(
            x - sparkleSize * 0.2,
            y - sparkleSize * 0.2,
            sparkleSize,
            [1.0, 1.0, 1.0, 0.95 + Math.sin(time * 12) * 0.05]
        );
    }
}
