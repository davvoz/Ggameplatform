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

        // Wings if flying (flight button o instant flight)
        if (player.isFlightActive || player.instantFlightActive) {
            this.renderWings(player, time, centerX, centerY);
        }

        // Circular progress bar per instant flight
        if (player.instantFlightActive && player.instantFlightDuration > 0) {
            this.renderInstantFlightProgress(player, centerX, centerY, avgRadius);
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
            particleColor[3] = alpha * 0.4; // Ridotto da 0.7 per meno luminosità
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 8, particleColor); // Ridotto radius da 12 a 8
        }
    }

    renderBoostParticles(player, cameraShake) {
        if (!player.boostActive || !player.getBoostParticles) return;
        
        const boostParticles = player.getBoostParticles();
        for (const particle of boostParticles) {
            const alpha = particle.life / particle.maxLife;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.6; // Ridotto da 0.9 per meno luminosità
            
            const glowColor = [...particle.color];
            glowColor[3] = alpha * 0.15; // Ridotto da 0.3
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size * 1.5, glowColor); // Ridotto da *2
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, particle.size, particleColor);
        }
    }

    renderTurboParticles(player, cameraShake) {
        if (!player.isTurboActive || !player.getTurboTrailParticles) return;
        
        const turboParticles = player.getTurboTrailParticles();
        for (const particle of turboParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.5; // Ridotto da 0.8
            
            const glowColor = [1.0, 0.9, 0.3, alpha * 0.2]; // Ridotto da 0.4
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 10, glowColor); // Ridotto da 15
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 6, particleColor); // Ridotto da 8
        }
    }

    renderFlightParticles(player, cameraShake) {
        if (!player.isFlightActive || !player.getFlightTrailParticles) return;
        
        const flightParticles = player.getFlightTrailParticles();
        for (const particle of flightParticles) {
            const alpha = particle.life;
            const particleColor = [...particle.color];
            particleColor[3] = alpha * 0.5; // Ridotto da 0.7
            
            const glowColor = [0.3, 0.8, 1.0, alpha * 0.15]; // Ridotto da 0.3
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 8, glowColor); // Ridotto da 12
            this.renderer.drawCircle(particle.x + cameraShake.x, particle.y + cameraShake.y, 5, particleColor); // Ridotto da 6
        }
    }

    renderDamageFlash(x, y, radius, flashValue) {
        const flashIntensity = Math.min(flashValue * 2, 1.0);
        const redFlash = [1.0, 0.1, 0.1, flashIntensity * 0.3]; // Ridotto da 0.6
        this.renderer.drawCircle(x, y, radius * 1.8, redFlash); // Ridotto da 2.5

        const redOverlay = [1.0, 0.2, 0.2, flashIntensity * 0.5]; // Ridotto da 0.8
        this.renderer.drawCircle(x, y, radius * 1.3, redOverlay); // Ridotto da 1.5
    }

    renderDeadState(x, y, radius, color) {
        const fadedColor = [...color];
        fadedColor[3] = 0.3;
        this.renderer.drawCircle(x, y, radius, fadedColor);
    }

    renderTurboEffects(player, time, x, y, radius) {
        if (!player.isTurboActive) return;

        const turboPulse = RenderingUtils.getPulse(time, 8, 0.5, 0.8); // Range ridotto
        const turboFastPulse = RenderingUtils.getPulse(time, 12, 0.4, 0.7); // Range ridotto
        const superFastPulse = RenderingUtils.getPulse(time, 20, 0.3, 0.6); // Range ridotto
        
        // Rainbow halos - RIDOTTI drasticamente
        this.renderer.drawCircle(x, y, radius + 60 * turboPulse, [1.0, 0.3, 0.8, 0.2 * turboPulse]); // Ridotto radius e alpha
        this.renderer.drawCircle(x, y, radius + 45 * turboFastPulse, [1.0, 0.6, 0.2, 0.25 * turboFastPulse]); // Ridotto
        this.renderer.drawCircle(x, y, radius + 30 * superFastPulse, [1.0, 0.9, 0.3, 0.35 * superFastPulse]); // Ridotto
        
        // Speed lines - RIDOTTE
        for (let i = 0; i < 10; i++) { // Ridotto da 16
            const lineLength = 60 + i * 20; // Ridotto
            const lineY = y + (i - 5) * 5; // Ridotto spacing
            const lineAlpha = (1 - i / 10) * 0.5 * turboPulse; // Ridotto alpha
            const lineColor = [1.0, 0.7 + Math.random() * 0.3, 0.2, lineAlpha];
            
            for (let j = 0; j < 6; j++) { // Ridotto da 8
                const lx = x - lineLength + j * 3;
                this.renderer.drawCircle(lx, lineY, 4 - j * 0.4, lineColor); // Ridotto size
            }
        }

        // Energy rings
        this.renderEnergyRings(player, time, x, y, radius);
        
        // Sparkles
        this.renderSparkles(player, time, x, y, radius);
    }

    renderEnergyRings(player, time, x, y, radius) {
        for (let ring = 0; ring < 3; ring++) { // Ridotto da 5 a 3
            const ringRotation = player.animationTime * (5 + ring * 3);
            const ringRadius = 40 + ring * 15; // Ridotto spacing
            const numPoints = 12; // Ridotto da 16
            
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
                
                this.renderer.drawCircle(px, py, 8, [r, g, b, 0.45]); // Ridotto alpha da 0.6
                this.renderer.drawCircle(px, py, 4, [1.0, 1.0, 1.0, 0.7]); // Ridotto da 5 e alpha da 0.9
            }
        }
    }

    renderSparkles(player, time, x, y, radius) {
        for (let i = 0; i < 6; i++) { // Ridotto da 12 a 6
            const starAngle = player.animationTime * 6 + (i * Math.PI / 3); // Adattato spacing
            const starDist = 60 + Math.sin(player.animationTime * 8 + i) * 15; // Ridotto da 70+20
            const sx = x + Math.cos(starAngle) * starDist;
            const sy = y + Math.sin(starAngle) * starDist;
            const starSize = 6 + Math.sin(player.animationTime * 10 + i) * 3; // Ridotto da 8+4
            
            const sparkleAlpha = 0.4 + Math.sin(time * 8 + i) * 0.3; // Ridotto da 0.6+0.4
            this.renderer.drawCircle(sx, sy, starSize, [1.0, 1.0, 0.8, sparkleAlpha]);
            this.renderer.drawCircle(sx, sy, starSize * 0.5, [1.0, 1.0, 1.0, 0.8]); // Ridotto alpha da 1.0
        }
    }

    renderPowerupEffects(player, time, x, y, radius) {
        const activePowerups = this.getActivePowerups(player);
        if (activePowerups.length === 0) return;

        const pulse = Math.abs(Math.sin(player.animationTime * 5)) * 0.3 + 0.5; // Ridotto range
        const fastPulse = Math.abs(Math.sin(player.animationTime * 8)) * 0.2 + 0.6; // Ridotto

        activePowerups.forEach((powerup, index) => {
            const rotationOffset = player.animationTime * 3 + index * Math.PI * 2 / activePowerups.length;

            // 1. ALONE ESTERNO ridotto
            const outerGlowSize = 25 * pulse; // Ridotto da 50
            const outerGlow = [...powerup.color];
            outerGlow[3] = 0.12 * pulse; // Ridotto da 0.25
            this.renderer.drawCircle(x, y, radius + outerGlowSize, outerGlow);

            // 2. ALONE MEDIO ridotto
            const midGlowSize = 15 * fastPulse; // Ridotto da 30
            const midGlow = [...powerup.color];
            midGlow[3] = 0.2 * fastPulse; // Ridotto da 0.4
            this.renderer.drawCircle(x, y, radius + midGlowSize, midGlow);

            // 3. CONTORNO COLORATO più sottile
            const borderThickness = 3; // Ridotto da 5
            for (let i = 0; i < borderThickness; i++) {
                const borderColor = [...powerup.color];
                borderColor[3] = 0.7 - (i * 0.2); // Ridotto da 0.8
                this.renderer.drawCircle(x, y, radius + 6 + i, borderColor); // Ridotto da 8
            }

            // 4. PARTICELLE ORBITANTI ridotte
            this.renderOrbitingParticles(x, y, rotationOffset, powerup.color, index, pulse);
            
            // 5. RAGGI DI LUCE ridotti
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
        const numParticles = 6; // Ridotto da 8
        for (let i = 0; i < numParticles; i++) {
            const angle = rotation + (i * Math.PI * 2 / numParticles);
            const orbitRadius = 30 + indexOffset * 6; // Ridotto da 35 + 8
            const px = x + Math.cos(angle) * orbitRadius;
            const py = y + Math.sin(angle) * orbitRadius;

            const particleGlow = [...color];
            particleGlow[3] = 0.2; // Ridotto da 0.4
            this.renderer.drawCircle(px, py, 6, particleGlow); // Ridotto da 8

            const particleColor = [...color];
            particleColor[3] = 0.8; // Ridotto da 0.9
            this.renderer.drawCircle(px, py, 4, particleColor); // Ridotto da 5
        }
    }

    renderLightRays(player, time, x, y, radius, rotation, color, pulse) {
        for (let i = 0; i < 4; i++) { // Ridotto da 6 a 4
            const rayAngle = rotation * 0.7 + (i * Math.PI * 2 / 4);
            const rayLength = 18 + Math.sin(player.animationTime * 6 + i) * 6; // Ridotto da 25+8
            const rayEndX = x + Math.cos(rayAngle) * (radius + rayLength);
            const rayEndY = y + Math.sin(rayAngle) * (radius + rayLength);

            const rayColor = [...color];
            rayColor[3] = 0.35 * pulse; // Ridotto da 0.6

            for (let j = 0; j < 4; j++) { // Ridotto da 5 a 4
                const t = j / 4;
                const rx = x + (rayEndX - x) * t;
                const ry = y + (rayEndY - y) * t;
                const rSize = 3 - j * 0.5; // Ridotto da 4
                const rColor = [...rayColor];
                rColor[3] = rayColor[3] * (1 - t * 0.7);
                this.renderer.drawCircle(rx, ry, rSize, rColor);
            }
        }
    }

    renderBoostEffect(player, time, x, y, radius) {
        if (!player.boostActive) return;

        const boostPulse = Math.abs(Math.sin(player.animationTime * 10)) * 0.4 + 0.4; // Ridotto range
        
        // Aloni cyan ridotti
        this.renderer.drawCircle(x, y, radius * 2.5, [0.0, 1.0, 0.9, boostPulse * 0.2]); // Ridotto da *4 e 0.4
        this.renderer.drawCircle(x, y, radius * 1.8, [0.0, 0.8, 1.0, boostPulse * 0.18]); // Ridotto da *2.5 e 0.3
        
        // Strisce di velocità dietro (speed lines) - ridotte
        for (let i = 0; i < 4; i++) { // Ridotto da 5
            const lineX = x - radius - i * 12; // Ridotto spacing
            const lineLength = 15 + i * 4; // Ridotto da 20+5
            const lineAlpha = (1 - i * 0.2) * boostPulse;
            const lineColor = [0.0, 1.0, 0.9, lineAlpha];
            
            this.renderer.drawRect(lineX - lineLength, y - 2, lineLength, 4, lineColor);
        }
        
        // Tint cyan sul corpo del player - ridotto
        this.renderer.drawCircle(x, y, radius * 1.15, [0.0, 1.0, 0.9, 0.2 * boostPulse]); // Ridotto da *1.3 e 0.3
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
            'running': { eyeSize: 4, pupilSize: 2, pupilOffsetX: 0, pupilOffsetY: 0 },
            'lookingUp': { eyeSize: 7, pupilSize: 3, pupilOffsetX: 0, pupilOffsetY: -3 },
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
            case 'running':
                this.renderRunningMouth(x, mouthY, mouthColor);
                break;
            case 'lookingUp':
                this.renderLookingUpMouth(x, mouthY, mouthColor);
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

    renderRunningMouth(x, y, color) {
        // Bocca aperta ansimante - ovale verticale
        this.renderer.drawCircle(x, y + 2, 4, color);
        this.renderer.drawCircle(x, y + 4, 3.5, color);
        this.renderer.drawCircle(x, y + 2, 3, [0.3, 0.1, 0.1, 1.0]);
    }

    renderLookingUpMouth(x, y, color) {
        // Bocca aperta tipo "O" sorpresa/meraviglia
        this.renderer.drawCircle(x, y + 2, 5, color);
        this.renderer.drawCircle(x, y + 2, 4, [0.3, 0.1, 0.1, 1.0]);
    }

    renderWings(player, time, x, y) {
        const wingFlapPhase = player.wingFlapPhase || 0;
        const wingFlap = Math.sin(wingFlapPhase) * 0.5 + 0.5;
        
        this.renderWing(x, y, wingFlap, -1, time); // Left wing
        this.renderWing(x, y, wingFlap, 1, time); // Right wing
        
        const flightAura = Math.sin(player.flightFloatPhase || 0) * 0.2 + 0.5; // Ridotto range
        this.renderer.drawCircle(x, y, player.width, [0.4, 0.85, 1.0, 0.15 * flightAura]); // Ridotto alpha
        this.renderer.drawCircle(x, y, player.width * 0.75, [0.5, 0.9, 1.0, 0.2 * flightAura]); // Ridotto
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

    renderInstantFlightProgress(player, x, y, radius) {
        // Progress bar circolare per mostrare la durata del volo istantaneo
        const progress = player.instantFlightDuration / player.instantFlightMaxDuration;
        const progressRadius = radius * 2.2; // Cerchio esterno
        const thickness = 4; // Spessore della barra
        const segments = 60; // Segmenti per smoothness
        
        // Colore progressivo da cyan a blu
        const baseColor = [0.4, 0.85, 1.0]; // Cyan chiaro
        
        // Alone esterno sottile
        const glowRadius = progressRadius + 3;
        this.renderer.drawCircle(x, y, glowRadius, [0.3, 0.7, 1.0, 0.15]);
        
        // Disegna il cerchio di background (grigio scuro)
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments - Math.PI / 2; // Inizia dall'alto
            const px = x + Math.cos(angle) * progressRadius;
            const py = y + Math.sin(angle) * progressRadius;
            this.renderer.drawCircle(px, py, thickness * 0.6, [0.2, 0.2, 0.3, 0.4]);
        }
        
        // Disegna il progresso (parte piena)
        const filledSegments = Math.floor(segments * progress);
        for (let i = 0; i < filledSegments; i++) {
            const t = i / segments;
            const angle = (Math.PI * 2 * i) / segments - Math.PI / 2; // Inizia dall'alto
            const px = x + Math.cos(angle) * progressRadius;
            const py = y + Math.sin(angle) * progressRadius;
            
            // Gradiente di colore basato su progresso
            const alpha = 0.6 + (1 - progress) * 0.3; // Più opaco quando sta finendo
            const color = [
                baseColor[0] + (1 - progress) * 0.3, // Più rosso quando sta finendo
                baseColor[1] * progress, // Meno verde
                baseColor[2], // Blu costante
                alpha
            ];
            
            // Particella principale
            this.renderer.drawCircle(px, py, thickness, color);
            
            // Glow interno per dare profondità
            const glowColor = [...color];
            glowColor[3] = alpha * 0.3;
            this.renderer.drawCircle(px, py, thickness * 1.5, glowColor);
        }
        
        // Effetto "testa" della progress bar (particella brillante all'inizio)
        if (filledSegments > 0) {
            const headAngle = (Math.PI * 2 * filledSegments) / segments - Math.PI / 2;
            const headX = x + Math.cos(headAngle) * progressRadius;
            const headY = y + Math.sin(headAngle) * progressRadius;
            
            // Testa brillante che pulsa
            const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
            this.renderer.drawCircle(headX, headY, thickness * 1.8 * pulse, [1.0, 1.0, 1.0, 0.9 * pulse]);
            this.renderer.drawCircle(headX, headY, thickness * 1.2, [0.8, 0.95, 1.0, 1.0]);
        }
        
        // Sparkles attorno al cerchio (opzionale, per rendere più carino)
        if (progress > 0.2) { // Solo se c'è abbastanza progresso
            const numSparkles = 6;
            for (let i = 0; i < numSparkles; i++) {
                const sparkleAngle = (Math.PI * 2 * i / numSparkles) + (Date.now() / 1000);
                const sparkleRadius = progressRadius + Math.sin(Date.now() / 200 + i) * 4;
                const sx = x + Math.cos(sparkleAngle) * sparkleRadius;
                const sy = y + Math.sin(sparkleAngle) * sparkleRadius;
                const sparkleAlpha = (Math.sin(Date.now() / 300 + i) * 0.3 + 0.5) * progress;
                this.renderer.drawCircle(sx, sy, 2, [1.0, 1.0, 1.0, sparkleAlpha]);
            }
        }
    }

    renderShield(player, time, x, y, radius) {
        const shieldRadius = radius * 1.7; // Ridotto da 2
        const shieldPulse = Math.sin(player.animationTime * 8) * 0.1 + 0.9; // Ridotto range
        const sides = 8;
        
        // Outer auras - RIDOTTE drasticamente
        for (let i = 0; i < 2; i++) { // Solo 2 invece di 3
            const auraRadius = shieldRadius * (1.2 + i * 0.2) * shieldPulse; // Ridotto
            const auraColor = [0.0, 1.0, 0.5, (0.15 - i * 0.05) * shieldPulse]; // Ridotto opacità
            this.renderer.drawCircle(x, y, auraRadius, auraColor);
        }
        
        // Hexagon - più definito
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + player.shieldRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + player.shieldRotation;
            
            const x1 = x + Math.cos(angle1) * shieldRadius * shieldPulse;
            const y1 = y + Math.sin(angle1) * shieldRadius * shieldPulse;
            const x2 = x + Math.cos(angle2) * shieldRadius * shieldPulse;
            const y2 = y + Math.sin(angle2) * shieldRadius * shieldPulse;
            
            const shieldColor = [0.0, 1.0, 0.7, 0.65]; // Ridotto opacità da 0.8
            this.renderer.drawCircle(x1, y1, 3.5, shieldColor); // Ridotto da 4
            
            const steps = 4; // Ridotto da 5
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 1.8, shieldColor); // Ridotto da 2
            }
        }
        
        // Sparkles - RIDOTTE
        for (let i = 0; i < 8; i++) { // Ridotto da 12 a 8
            const sparkAngle = (Math.PI * 2 * i) / 8 + player.shieldRotation * 2;
            const sparkDist = shieldRadius * shieldPulse;
            const sx = x + Math.cos(sparkAngle) * sparkDist;
            const sy = y + Math.sin(sparkAngle) * sparkDist;
            this.renderer.drawCircle(sx, sy, 2.5, [1.0, 1.0, 1.0, 0.7 * shieldPulse]); // Ridotto size e opacità
        }
    }
}
