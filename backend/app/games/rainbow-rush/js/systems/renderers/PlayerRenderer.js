/**
 * PlayerRenderer - Handles player entity rendering with all visual effects
 * Single Responsibility: Player visualization only
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';
import { RenderingConfig } from './RenderingConfig.js';

export class PlayerRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
    }

    render(player, context) {
        const { time } = context;
        const centerX = player.x + player.width / 2;
        const idleOffset = player.getIdleOffset ? player.getIdleOffset() : 0;
        const centerY = player.y + player.height / 2 + idleOffset;
        
        const squashStretch = player.getSquashStretch ? player.getSquashStretch() : { squash: 0, stretch: 0 };
        const cameraShake = player.getCameraShake ? player.getCameraShake() : { x: 0, y: 0 };
        
        const shakenX = centerX + cameraShake.x;
        const shakenY = centerY + cameraShake.y;
        
        const baseRadius = player.width / 2;
        const radiusX = baseRadius * (1 + squashStretch.squash * 0.1 - squashStretch.stretch * 0.05);
        const radiusY = baseRadius * (1 - squashStretch.squash * 0.1 + squashStretch.stretch * 0.05);
        const avgRadius = (radiusX + radiusY) / 2;

        // Render trail and particles first
        this.renderTrailParticles(player, cameraShake);
        this.renderBoostParticles(player, cameraShake);
        this.renderTurboParticles(player, cameraShake);
        this.renderFlightParticles(player, cameraShake);

        // Damage flash
        if (player.damageFlash && player.damageFlash > 0) {
            this.renderDamageFlash(centerX, centerY, avgRadius, player.damageFlash);
        }

        if (!player.alive) {
            this.renderDeadState(centerX, centerY, avgRadius, player.color);
            return;
        }

        // Power-up effects
        this.renderTurboEffects(player, time, shakenX, shakenY, avgRadius);
        this.renderPowerupEffects(player, time, shakenX, shakenY, avgRadius);
        this.renderBoostEffect(player, time, shakenX, shakenY, avgRadius);

        // Player body
        this.renderBody(player, shakenX, shakenY, avgRadius);
        
        // Face
        this.renderEyes(player, shakenX, shakenY, radiusY);
        this.renderMouth(player, shakenX, shakenY, radiusY);

        // Wings if flying
        if (player.isFlightActive) {
            this.renderWings(player, time, centerX, centerY);
        }

        // Shield
        if (player.shieldActive) {
            this.renderShield(player, time, centerX, centerY, avgRadius);
        }
    }

    renderTrailParticles(player, cameraShake) {
        const trailParticles = player.getTrailParticles ? player.getTrailParticles() : [];
        for (const particle of trailParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.7;
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 12, particleColor);
        }
    }

    renderBoostParticles(player, cameraShake) {
        if (!player.boostActive || !player.getBoostParticles) return;
        
        const boostParticles = player.getBoostParticles();
        for (const particle of boostParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.9;
            
            const glowColor = [...particle.color];
            glowColor[3] = alpha * 0.3;
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size * 2, glowColor);
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size, particleColor);
        }
    }

    renderTurboParticles(player, cameraShake) {
        if (!player.isTurboActive || !player.getTurboTrailParticles) return;
        
        const turboParticles = player.getTurboTrailParticles();
        for (const particle of turboParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.8;
            
            const glowColor = [1.0, 0.9, 0.3, alpha * 0.4];
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 15, glowColor);
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 8, particleColor);
        }
    }

    renderFlightParticles(player, cameraShake) {
        if (!player.isFlightActive || !player.getFlightTrailParticles) return;
        
        const flightParticles = player.getFlightTrailParticles();
        for (const particle of flightParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.7;
            
            const glowColor = [0.3, 0.8, 1.0, alpha * 0.3];
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 12, glowColor);
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 6, particleColor);
        }
    }

    renderDamageFlash(x, y, radius, flashValue) {
        const flashIntensity = Math.min(flashValue * 2, 1.0);
        const redFlash = [1.0, 0.1, 0.1, flashIntensity * 0.6];
        this.renderer.drawCircle(x, y, radius * 2.5, redFlash);

        const redOverlay = [1.0, 0.2, 0.2, flashIntensity * 0.8];
        this.renderer.drawCircle(x, y, radius * 1.5, redOverlay);
    }

    renderDeadState(x, y, radius, color) {
        const fadedColor = [...color];
        fadedColor[3] = 0.3;
        this.renderer.drawCircle(x, y, radius, fadedColor);
    }

    renderTurboEffects(player, time, x, y, radius) {
        if (!player.isTurboActive) return;

        const turboPulse = RenderingUtils.getPulse(time, 8, 0.7, 1.0);
        const turboFastPulse = RenderingUtils.getPulse(time, 12, 0.6, 1.0);
        const superFastPulse = RenderingUtils.getPulse(time, 20, 0.5, 1.0);
        
        // Rainbow halos
        this.renderer.drawCircle(x, y, radius + 100 * turboPulse, [1.0, 0.3, 0.8, 0.4 * turboPulse]);
        this.renderer.drawCircle(x, y, radius + 80 * turboFastPulse, [1.0, 0.6, 0.2, 0.5 * turboFastPulse]);
        this.renderer.drawCircle(x, y, radius + 50 * superFastPulse, [1.0, 0.9, 0.3, 0.7 * superFastPulse]);
        
        // Speed lines
        for (let i = 0; i < 16; i++) {
            const lineLength = 80 + i * 30;
            const lineY = y + (i - 8) * 6;
            const lineAlpha = (1 - i / 16) * 0.8 * turboPulse;
            const lineColor = [1.0, 0.7 + Math.random() * 0.3, 0.2, lineAlpha];
            
            for (let j = 0; j < 8; j++) {
                const lx = x - lineLength + j * 4;
                this.renderer.drawCircle(lx, lineY, 5 - j * 0.5, lineColor);
            }
        }

        // Energy rings
        this.renderEnergyRings(player, time, x, y, radius);
        
        // Sparkles
        this.renderSparkles(player, time, x, y, radius);
    }

    renderEnergyRings(player, time, x, y, radius) {
        for (let ring = 0; ring < 5; ring++) {
            const ringRotation = player.animationTime * (5 + ring * 3);
            const ringRadius = 50 + ring * 18;
            const numPoints = 16;
            
            for (let i = 0; i < numPoints; i++) {
                const angle = ringRotation + (i * Math.PI * 2 / numPoints);
                const px = x + Math.cos(angle) * ringRadius;
                const py = y + Math.sin(angle) * ringRadius;
                
                let r, g, b;
                if (ring % 3 === 0) {
                    r = 1.0; g = 0.3; b = 0.3;
                } else if (ring % 3 === 1) {
                    r = 1.0; g = 0.9; b = 0.2;
                } else {
                    r = 0.3; g = 1.0; b = 0.9;
                }
                
                this.renderer.drawCircle(px, py, 10, [r, g, b, 0.6]);
                this.renderer.drawCircle(px, py, 5, [1.0, 1.0, 1.0, 0.9]);
            }
        }
    }

    renderSparkles(player, time, x, y, radius) {
        for (let i = 0; i < 12; i++) {
            const starAngle = player.animationTime * 6 + (i * Math.PI / 6);
            const starDist = 70 + Math.sin(player.animationTime * 8 + i) * 20;
            const sx = x + Math.cos(starAngle) * starDist;
            const sy = y + Math.sin(starAngle) * starDist;
            const starSize = 8 + Math.sin(player.animationTime * 10 + i) * 4;
            
            const sparkleAlpha = 0.6 + Math.sin(time * 8 + i) * 0.4;
            this.renderer.drawCircle(sx, sy, starSize, [1.0, 1.0, 0.8, sparkleAlpha]);
            this.renderer.drawCircle(sx, sy, starSize * 0.5, [1.0, 1.0, 1.0, 1.0]);
        }
    }

    renderPowerupEffects(player, time, x, y, radius) {
        const activePowerups = this.getActivePowerups(player);
        if (activePowerups.length === 0) return;

        const pulse = Math.abs(Math.sin(player.animationTime * 5)) * 0.4 + 0.6;
        const fastPulse = Math.abs(Math.sin(player.animationTime * 8)) * 0.3 + 0.7;

        activePowerups.forEach((powerup, index) => {
            const rotationOffset = player.animationTime * 3 + index * Math.PI * 2 / activePowerups.length;

            // 1. ENORME ALONE ESTERNO pulsante
            const outerGlowSize = 50 * pulse;
            const outerGlow = [...powerup.color];
            outerGlow[3] = 0.25 * pulse;
            this.renderer.drawCircle(x, y, radius + outerGlowSize, outerGlow);

            // 2. ALONE MEDIO
            const midGlowSize = 30 * fastPulse;
            const midGlow = [...powerup.color];
            midGlow[3] = 0.4 * fastPulse;
            this.renderer.drawCircle(x, y, radius + midGlowSize, midGlow);

            // 3. CONTORNO COLORATO SPESSO
            const borderThickness = 5;
            for (let i = 0; i < borderThickness; i++) {
                const borderColor = [...powerup.color];
                borderColor[3] = 0.8 - (i * 0.15);
                this.renderer.drawCircle(x, y, radius + 8 + i, borderColor);
            }

            // 4. PARTICELLE ORBITANTI GRANDI
            this.renderOrbitingParticles(x, y, rotationOffset, powerup.color, index, pulse);
            
            // 5. RAGGI DI LUCE rotanti
            this.renderLightRays(player, time, x, y, radius, rotationOffset, powerup.color, pulse);
        });
    }

    getActivePowerups(player) {
        const activePowerups = [];
        if (player.powerups.immortality) activePowerups.push({ type: 'immortality', color: [1.0, 0.84, 0.0, 1.0] });
        if (player.powerups.flight) activePowerups.push({ type: 'flight', color: [0.4, 0.85, 1.0, 1.0] });
        if (player.powerups.superJump) activePowerups.push({ type: 'superJump', color: [1.0, 0.2, 0.6, 1.0] });
        return activePowerups;
    }

    renderOrbitingParticles(x, y, rotation, color, indexOffset, pulse) {
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const angle = rotation + (i * Math.PI * 2 / numParticles);
            const orbitRadius = 35 + indexOffset * 8;
            const px = x + Math.cos(angle) * orbitRadius;
            const py = y + Math.sin(angle) * orbitRadius;

            const particleGlow = [...color];
            particleGlow[3] = 0.4;
            this.renderer.drawCircle(px, py, 8, particleGlow);

            const particleColor = [...color];
            particleColor[3] = 0.9;
            this.renderer.drawCircle(px, py, 5, particleColor);
        }
    }

    renderLightRays(player, time, x, y, radius, rotation, color, pulse) {
        for (let i = 0; i < 6; i++) {
            const rayAngle = rotation * 0.7 + (i * Math.PI * 2 / 6);
            const rayLength = 25 + Math.sin(player.animationTime * 6 + i) * 8;
            const rayEndX = x + Math.cos(rayAngle) * (radius + rayLength);
            const rayEndY = y + Math.sin(rayAngle) * (radius + rayLength);

            const rayColor = [...color];
            rayColor[3] = 0.6 * pulse;

            for (let j = 0; j < 5; j++) {
                const t = j / 5;
                const rx = x + (rayEndX - x) * t;
                const ry = y + (rayEndY - y) * t;
                const rSize = 4 - j * 0.6;
                const rColor = [...rayColor];
                rColor[3] = rayColor[3] * (1 - t * 0.7);
                this.renderer.drawCircle(rx, ry, rSize, rColor);
            }
        }
    }

    renderBoostEffect(player, time, x, y, radius) {
        if (!player.boostActive) return;

        const boostPulse = Math.abs(Math.sin(player.animationTime * 10)) * 0.5 + 0.5;
        
        // Enormi aloni cyan pulsanti
        this.renderer.drawCircle(x, y, radius * 4, [0.0, 1.0, 0.9, boostPulse * 0.4]);
        this.renderer.drawCircle(x, y, radius * 2.5, [0.0, 0.8, 1.0, boostPulse * 0.3]);
        
        // Strisce di velocità dietro (speed lines)
        for (let i = 0; i < 5; i++) {
            const lineX = x - radius - i * 15;
            const lineLength = 20 + i * 5;
            const lineAlpha = (1 - i * 0.15) * boostPulse;
            const lineColor = [0.0, 1.0, 0.9, lineAlpha];
            
            this.renderer.drawRect(lineX - lineLength, y - 2, lineLength, 4, lineColor);
        }
        
        // Tint cyan sul corpo del player
        this.renderer.drawCircle(x, y, radius * 1.3, [0.0, 1.0, 0.9, 0.3 * boostPulse]);
    }

    renderBody(player, x, y, radius) {
        let bodyColor = this.getBodyColor(player);
        
        if (player.invulnerable) {
            const flicker = Math.floor(Date.now() / 100) % 2;
            if (flicker === 0) {
                bodyColor[3] = 0.4;
            }
        }

        const size = player.width;
        const rectX = x - size / 2;
        const rectY = y - size / 2;

        // Ombra più pronunciata
        RenderingUtils.drawShadow(this.renderer, rectX, rectY - 3, size, size);
        
        // Bordo scuro per contrasto SBAM
        const borderColor = [0.0, 0.0, 0.0, 0.6];
        this.renderer.drawRect(rectX - 2, rectY - 2, size + 4, size + 4, borderColor);
        
        // Corpo principale con colore brillante
        this.renderer.drawRect(rectX, rectY, size, size, bodyColor);
        
        // Highlight più intenso
        const highlightColor = [1.0, 1.0, 1.0, 0.7];
        this.renderer.drawCircle(x - size * 0.2, y - size * 0.2, size * 0.25, highlightColor);
    }

    getBodyColor(player) {
        if (player.isTurboActive) return RenderingConfig.COLORS.PLAYER_TURBO;
        if (player.powerups.immortality) return RenderingConfig.COLORS.PLAYER_IMMORTALITY;
        if (player.powerups.flight) return RenderingConfig.COLORS.PLAYER_FLIGHT;
        if (player.powerups.superJump) return RenderingConfig.COLORS.PLAYER_SUPER_JUMP;
        return RenderingConfig.COLORS.PLAYER_DEFAULT;
    }

    renderEyes(player, x, y, radiusY) {
        const expression = player.getExpression ? player.getExpression() : 'happy';
        const isBlinking = player.isEyeBlinking ? player.isEyeBlinking() : false;
        
        const eyeY = y - radiusY * 0.2;
        const eyeConfig = this.getEyeConfig(expression);

        if (!isBlinking) {
            this.renderOpenEyes(x, eyeY, eyeConfig);
        } else {
            this.renderClosedEyes(x, eyeY);
        }
    }

    getEyeConfig(expression) {
        const configs = {
            'worried': { eyeSize: 7, pupilSize: 4, pupilOffsetX: 0, pupilOffsetY: 2 },
            'excited': { eyeSize: 8, pupilSize: 4, pupilOffsetX: 0, pupilOffsetY: 0 },
            'surprised': { eyeSize: 9, pupilSize: 5, pupilOffsetX: 0, pupilOffsetY: 0 },
            'determined': { eyeSize: 5, pupilSize: 3, pupilOffsetX: 0, pupilOffsetY: -1 },
            'happy': { eyeSize: 6, pupilSize: 3, pupilOffsetX: 0, pupilOffsetY: 0 }
        };
        return configs[expression] || configs['happy'];
    }

    renderOpenEyes(x, eyeY, config) {
        const eyeWhite = [1.0, 1.0, 1.0, 1.0];
        const eyeOutline = [0.0, 0.0, 0.0, 0.4];
        const pupilColor = [0.0, 0.0, 0.0, 1.0];
        const glintColor = [1.0, 1.0, 1.0, 0.8];

        // Left eye
        this.renderer.drawCircle(x - 7, eyeY, config.eyeSize + 1, eyeOutline);
        this.renderer.drawCircle(x - 7, eyeY, config.eyeSize, eyeWhite);
        this.renderer.drawCircle(x - 7 + config.pupilOffsetX, eyeY + config.pupilOffsetY, config.pupilSize, pupilColor);
        this.renderer.drawCircle(x - 8, eyeY - 1, 1.5, glintColor);

        // Right eye
        this.renderer.drawCircle(x + 7, eyeY, config.eyeSize + 1, eyeOutline);
        this.renderer.drawCircle(x + 7, eyeY, config.eyeSize, eyeWhite);
        this.renderer.drawCircle(x + 7 + config.pupilOffsetX, eyeY + config.pupilOffsetY, config.pupilSize, pupilColor);
        this.renderer.drawCircle(x + 6, eyeY - 1, 1.5, glintColor);
    }

    renderClosedEyes(x, eyeY) {
        const blinkColor = [0.0, 0.0, 0.0, 0.8];
        this.renderer.drawRect(x - 10, eyeY, 6, 2, blinkColor);
        this.renderer.drawCircle(x - 7, eyeY, 3, blinkColor);
        this.renderer.drawRect(x + 4, eyeY, 6, 2, blinkColor);
        this.renderer.drawCircle(x + 7, eyeY, 3, blinkColor);
    }

    renderMouth(player, x, y, radiusY) {
        const expression = player.getExpression ? player.getExpression() : 'happy';
        const mouthY = y + radiusY * 0.4;
        const mouthColor = [0.0, 0.0, 0.0, 0.7];

        switch(expression) {
            case 'worried':
                this.renderWorriedMouth(x, mouthY, mouthColor);
                break;
            case 'excited':
                this.renderExcitedMouth(x, mouthY, mouthColor);
                break;
            case 'surprised':
                this.renderSurprisedMouth(x, mouthY, mouthColor);
                break;
            case 'determined':
                this.renderDeterminedMouth(x, mouthY, mouthColor);
                break;
            default:
                this.renderHappyMouth(x, mouthY, mouthColor);
        }
    }

    renderHappyMouth(x, y, color) {
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const angle = Math.PI * 0.2 + (t * Math.PI * 0.6);
            const smileRadius = 8;
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + Math.sin(angle) * smileRadius * 0.6;
            this.renderer.drawCircle(sx, sy, 1.5, color);
        }
    }

    renderWorriedMouth(x, y, color) {
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const angle = Math.PI * 0.7 + (t * Math.PI * 0.6);
            const smileRadius = 8;
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + 3 + Math.sin(angle) * smileRadius * 0.6;
            this.renderer.drawCircle(sx, sy, 1.5, color);
        }
    }

    renderExcitedMouth(x, y, color) {
        for (let i = 0; i < 9; i++) {
            const t = i / 8;
            const angle = Math.PI * 0.15 + (t * Math.PI * 0.7);
            const smileRadius = 10;
            const sx = x + Math.cos(angle) * smileRadius;
            const sy = y + Math.sin(angle) * smileRadius * 0.7;
            this.renderer.drawCircle(sx, sy, 2, color);
        }
    }

    renderSurprisedMouth(x, y, color) {
        this.renderer.drawCircle(x, y + 2, 5, color);
        this.renderer.drawCircle(x, y + 2, 4, [0.4, 0.2, 0.2, 1.0]);
    }

    renderDeterminedMouth(x, y, color) {
        this.renderer.drawRect(x - 6, y, 12, 2, color);
    }

    renderWings(player, time, x, y) {
        const wingFlapPhase = player.wingFlapPhase || 0;
        const wingFlap = Math.sin(wingFlapPhase) * 0.5 + 0.5;
        
        this.renderWing(x, y, wingFlap, -1, time); // Left wing
        this.renderWing(x, y, wingFlap, 1, time); // Right wing
        
        const flightAura = Math.sin(player.flightFloatPhase || 0) * 0.3 + 0.7;
        this.renderer.drawCircle(x, y, player.width, [0.4, 0.85, 1.0, 0.3 * flightAura]);
        this.renderer.drawCircle(x, y, player.width * 0.75, [0.5, 0.9, 1.0, 0.4 * flightAura]);
    }

    renderWing(x, y, wingFlap, side, time) {
        const baseAngle = side < 0 ? -Math.PI / 6 : -Math.PI + Math.PI / 6;
        const wingAngle = baseAngle + (side * wingFlap * Math.PI / 4);
        const wingLength = 25 + wingFlap * 10;
        const xOffset = side < 0 ? -15 : 15;
        
        for (let i = 0; i < 5; i++) {
            const featherOffset = i * 7;
            const featherAngle = wingAngle + (side * i * 0.15);
            const featherLength = wingLength - i * 3;
            const fx = x + xOffset + Math.cos(featherAngle) * featherOffset;
            const fy = y - 5 + Math.sin(featherAngle) * featherOffset;
            const featherEndX = fx + Math.cos(featherAngle) * featherLength;
            const featherEndY = fy + Math.sin(featherAngle) * featherLength;
            
            const steps = 3 + i;
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const px = fx + (featherEndX - fx) * t;
                const py = fy + (featherEndY - fy) * t;
                const featherRadius = (5 - i) * (1 - t * 0.5);
                const featherAlpha = (0.8 - i * 0.1) * (1 - t * 0.3);
                this.renderer.drawCircle(px, py, featherRadius, [0.9, 0.95 + i * 0.01, 1.0, featherAlpha]);
            }
        }
    }

    renderShield(player, time, x, y, radius) {
        const shieldRadius = radius * 2;
        const shieldPulse = Math.sin(player.animationTime * 8) * 0.15 + 1.0;
        const sides = 8;
        
        // Outer auras
        for (let i = 0; i < 3; i++) {
            const auraRadius = shieldRadius * (1.5 + i * 0.3) * shieldPulse;
            const auraColor = [0.0, 1.0, 0.5, (0.3 - i * 0.08) * shieldPulse];
            this.renderer.drawCircle(x, y, auraRadius, auraColor);
        }
        
        // Hexagon
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + player.shieldRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + player.shieldRotation;
            
            const x1 = x + Math.cos(angle1) * shieldRadius * shieldPulse;
            const y1 = y + Math.sin(angle1) * shieldRadius * shieldPulse;
            const x2 = x + Math.cos(angle2) * shieldRadius * shieldPulse;
            const y2 = y + Math.sin(angle2) * shieldRadius * shieldPulse;
            
            const shieldColor = [0.0, 1.0, 0.7, 0.8];
            this.renderer.drawCircle(x1, y1, 4, shieldColor);
            
            const steps = 5;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 2, shieldColor);
            }
        }
        
        // Sparkles
        for (let i = 0; i < 12; i++) {
            const sparkAngle = (Math.PI * 2 * i) / 12 + player.shieldRotation * 2;
            const sparkDist = shieldRadius * shieldPulse;
            const sx = x + Math.cos(sparkAngle) * sparkDist;
            const sy = y + Math.sin(sparkAngle) * sparkDist;
            this.renderer.drawCircle(sx, sy, 3, [1.0, 1.0, 1.0, 0.9 * shieldPulse]);
        }
    }
}
