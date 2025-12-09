/**
 * EffectRenderer - Gestisce gli effetti visivi del player
 * Responsabilità: Shield, Magnet, Turbo, Boost, Powerup effects
 */
export class EffectRenderer {
    constructor(renderer) {
        this.renderer = renderer;
    }

    renderDamageFlash(x, y, radius, flashValue) {
        const flashIntensity = Math.min(flashValue * 2, 1.0);
        const redFlash = [1.0, 0.1, 0.1, flashIntensity * 0.3];
        this.renderer.drawCircle(x, y, radius * 1.8, redFlash);

        const redOverlay = [1.0, 0.2, 0.2, flashIntensity * 0.5];
        this.renderer.drawCircle(x, y, radius * 1.3, redOverlay);
    }

    renderDeadState(x, y, radius, color) {
        const fadedColor = [...color];
        fadedColor[3] = 0.3;
        this.renderer.drawCircle(x, y, radius, fadedColor);
    }

    renderShield(player, time, x, y, radius) {
        const shieldRadius = radius * 2.0; // PIÙ GRANDE
        const shieldPulse = Math.sin(player.animationTime * 4) * 0.15 + 0.85;
        const electricPulse = Math.sin(time * 10) * 0.5 + 0.5;
        const sides = 6;

        // ALONE MOLTO PIÙ VISIBILE
        for (let i = 0; i < 4; i++) {
            const auraRadius = shieldRadius * (1.3 + i * 0.15) * shieldPulse;
            const auraAlpha = (0.25 - i * 0.05) * shieldPulse;
            this.renderer.drawCircle(x, y, auraRadius, [0.0, 0.95, 1.0, auraAlpha]);
        }

        // Hexagon PIÙ LUMINOSO
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + player.shieldRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + player.shieldRotation;

            const x1 = x + Math.cos(angle1) * shieldRadius * shieldPulse;
            const y1 = y + Math.sin(angle1) * shieldRadius * shieldPulse;
            const x2 = x + Math.cos(angle2) * shieldRadius * shieldPulse;
            const y2 = y + Math.sin(angle2) * shieldRadius * shieldPulse;

            // Vertici elettrici PIÙ GRANDI
            const electricColor = [0.4 + electricPulse * 0.6, 1.0, 1.0, 0.9];
            this.renderer.drawCircle(x1, y1, 5, electricColor);
            this.renderer.drawCircle(x1, y1, 7, [0.0, 0.9, 1.0, 0.4]); // Alone

            // Linee PIÙ SPESSE
            const steps = 5;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 3, [0.0, 0.9, 1.0, 0.8]);
            }
        }

        // Fulmini PIÙ EVIDENTI
        for (let i = 0; i < sides; i += 2) {
            const sparkAngle = (Math.PI * 2 * i) / sides + player.shieldRotation * 1.5;
            const sparkDist = shieldRadius * shieldPulse;
            const sx = x + Math.cos(sparkAngle) * sparkDist;
            const sy = y + Math.sin(sparkAngle) * sparkDist;

            if (electricPulse > 0.7) {
                this.renderer.drawCircle(sx, sy, 5, [1.0, 1.0, 1.0, electricPulse]);
                this.renderer.drawCircle(sx, sy, 8, [0.0, 1.0, 1.0, electricPulse * 0.5]);
            }
        }

        // Centro LUMINOSO
        this.renderer.drawCircle(x, y, radius * 0.6, [0.0, 0.9, 1.0, 0.6]);
        this.renderer.drawCircle(x, y, radius * 0.4, [0.5, 1.0, 1.0, 0.9]);
        this.renderer.drawCircle(x, y, radius * 0.2, [1.0, 1.0, 1.0, 1.0]);
    }

    renderShieldBonus(player, time, x, y, avgRadius) {
        const shieldAlpha = 0.3 + Math.sin(time * 5) * 0.2;
        const shieldRadius = avgRadius + 8;

        this.renderer.drawCircle(x, y, shieldRadius + 4, [0.0, 0.75, 1.0, shieldAlpha * 0.3]);
        this.renderer.drawCircle(x, y, shieldRadius, [0.0, 0.75, 1.0, shieldAlpha]);
        this.renderer.drawCircle(x, y, shieldRadius - 2, [0.5, 0.9, 1.0, shieldAlpha * 0.5]);
    }

    renderMagnetBonus(player, time, x, y) {
        const magnetAlpha = 0.2 + Math.sin(time * 2.5) * 0.12;
        const range = player.magnetRange || 200;
        const rotationSpeed = time * 1.2;

        // Cerchi concentrici
        for (let i = 0; i < 3; i++) {
            const radius = range * (1 - i * 0.33);
            const alpha = magnetAlpha * (1 - i * 0.33);
            const pulseOffset = Math.sin(time * 3 - i * 0.6) * 0.08;
            this.renderer.drawCircle(x, y, radius * (1 + pulseOffset), [1.0, 0.5, 0.0, alpha]);
        }

        // Particelle orbitanti
        for (let i = 0; i < 6; i++) {
            const angle = (rotationSpeed + i * Math.PI / 3);
            const orbitRadius = range * 0.7 + Math.sin(time * 4 + i) * 12;
            const sx = x + Math.cos(angle) * orbitRadius;
            const sy = y + Math.sin(angle) * orbitRadius;
            const size = 3 + Math.sin(time * 5 + i) * 1;
            this.renderer.drawCircle(sx, sy, size, [1.0, 0.8, 0.2, magnetAlpha * 2]);
        }

        // Frecce
        for (let i = 0; i < 4; i++) {
            const arrowAngle = (Math.PI * 2 * i) / 4;
            const arrowDist = range * 0.85;
            const ax = x + Math.cos(arrowAngle) * arrowDist;
            const ay = y + Math.sin(arrowAngle) * arrowDist;

            const arrowSize = 5;
            const tipX = ax + Math.cos(arrowAngle + Math.PI) * arrowSize;
            const tipY = ay + Math.sin(arrowAngle + Math.PI) * arrowSize;
            this.renderer.drawCircle(tipX, tipY, 2.5, [1.0, 0.9, 0.3, magnetAlpha * 1.3]);
        }
    }

    renderTurboEffects(player, time, x, y, radius) {
        if (!player.isTurboActive) return;

        // STESSA ANIMAZIONE DELL'IMMORTALITÀ - Effetto dorato mega evidente
        const goldenPulse = 0.8 + Math.sin(time * 6) * 0.2;
        
        // Alone dorato gigante
        for (let i = 0; i < 5; i++) {
            const auraSize = radius + 25 + i * 8;
            const auraAlpha = (0.4 - i * 0.06) * goldenPulse;
            this.renderer.drawCircle(x, y, auraSize, [1.0, 0.9, 0.2, auraAlpha]);
        }
        
        // Cerchi dorati rotanti
        const rotation = time * 2;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8) + rotation;
            const orbitRadius = radius + 20;
            const ox = x + Math.cos(angle) * orbitRadius;
            const oy = y + Math.sin(angle) * orbitRadius;
            this.renderer.drawCircle(ox, oy, 4, [1.0, 0.95, 0.3, 0.9]);
            this.renderer.drawCircle(ox, oy, 7, [1.0, 0.85, 0.0, 0.4]);
        }
        
        // Bordo dorato spesso
        this.renderer.drawCircle(x, y, radius + 8, [1.0, 0.9, 0.1, 0.8]);
        this.renderer.drawCircle(x, y, radius + 5, [1.0, 0.95, 0.3, 1.0]);
        
        // Glow centrale dorato
        const pulse = 0.7 + Math.sin(player.animationTime * 5) * 0.3;
        this.renderer.drawCircle(x, y, radius * 1.3, [1.0, 0.9, 0.3, 0.3 * pulse]);
    }

    renderPowerupEffects(player, time, x, y, radius) {
        const activePowerups = this.getActivePowerups(player);
        if (activePowerups.length === 0) return;

        const pulse = 0.7 + Math.sin(player.animationTime * 5) * 0.3;

        activePowerups.forEach((powerup) => {
            if (powerup.type === 'immortality') {
                // IMMORTALITÀ - EFFETTO DORATO MEGA EVIDENTE
                const goldenPulse = 0.8 + Math.sin(time * 6) * 0.2;
                
                // Alone dorato gigante
                for (let i = 0; i < 5; i++) {
                    const auraSize = radius + 25 + i * 8;
                    const auraAlpha = (0.4 - i * 0.06) * goldenPulse;
                    this.renderer.drawCircle(x, y, auraSize, [1.0, 0.9, 0.2, auraAlpha]);
                }
                
                // Cerchi dorati rotanti
                const rotation = time * 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i / 8) + rotation;
                    const orbitRadius = radius + 20;
                    const ox = x + Math.cos(angle) * orbitRadius;
                    const oy = y + Math.sin(angle) * orbitRadius;
                    this.renderer.drawCircle(ox, oy, 4, [1.0, 0.95, 0.3, 0.9]);
                    this.renderer.drawCircle(ox, oy, 7, [1.0, 0.85, 0.0, 0.4]);
                }
                
                // Bordo dorato spesso
                this.renderer.drawCircle(x, y, radius + 8, [1.0, 0.9, 0.1, 0.8]);
                this.renderer.drawCircle(x, y, radius + 5, [1.0, 0.95, 0.3, 1.0]);
                
                // Glow centrale dorato
                this.renderer.drawCircle(x, y, radius * 1.3, [1.0, 0.9, 0.3, 0.3 * pulse]);
                
            } else {
                // Altri powerup (flight, superJump)
                const glowSize = 20 * pulse;
                const glow = [...powerup.color];
                glow[3] = 0.2 * pulse;
                this.renderer.drawCircle(x, y, radius + glowSize, glow);

                const borderColor = [...powerup.color];
                borderColor[3] = 0.7;
                this.renderer.drawCircle(x, y, radius + 5, borderColor);
            }
        });
    }

    renderBoostEffect(player, time, x, y, radius) {
        if (!player.boostActive) return;

        const boostPulse = Math.abs(Math.sin(player.animationTime * 10)) * 0.4 + 0.4;

        // Aloni cyan
        this.renderer.drawCircle(x, y, radius * 2.5, [0.0, 1.0, 0.9, boostPulse * 0.2]);
        this.renderer.drawCircle(x, y, radius * 1.8, [0.0, 0.8, 1.0, boostPulse * 0.18]);

        // Speed lines
        for (let i = 0; i < 4; i++) {
            const lineX = x - radius - i * 12;
            const lineLength = 15 + i * 4;
            const lineAlpha = (1 - i * 0.2) * boostPulse;
            const lineColor = [0.0, 1.0, 0.9, lineAlpha];

            this.renderer.drawRect(lineX - lineLength, y - 2, lineLength, 4, lineColor);
        }

        // Tint cyan
        this.renderer.drawCircle(x, y, radius * 1.15, [0.0, 1.0, 0.9, 0.2 * boostPulse]);
    }

    getActivePowerups(player) {
        const activePowerups = [];
        if (player.powerups.immortality) activePowerups.push({ type: 'immortality', color: [1.0, 0.84, 0.0, 1.0] });
        if (player.powerups.flight) activePowerups.push({ type: 'flight', color: [0.4, 0.85, 1.0, 1.0] });
        if (player.powerups.superJump) activePowerups.push({ type: 'superJump', color: [1.0, 0.2, 0.6, 1.0] });
        return activePowerups;
    }
}
