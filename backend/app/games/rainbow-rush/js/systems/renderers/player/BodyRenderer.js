/**
 * BodyRenderer - Gestisce il rendering del corpo del player con animazioni professionali
 * Mantiene forma quadrata e espressioni originali, aggiunge movimento fluido
 */
import { RenderingUtils } from '../RenderingUtils.js';
import { RenderingConfig } from '../RenderingConfig.js';
import { PlayerAnimationController } from './PlayerAnimationController.js';

export class BodyRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        this.animationController = new PlayerAnimationController();
        
        // Get text canvas context for effects
        this.textCanvas = document.getElementById('textCanvas');
        this.textCtx = this.textCanvas ? this.textCanvas.getContext('2d') : null;
    }

    renderBody(player, x, y, radius, scale = 1.0) {
        // Update animations
        this.animationController.update(player);
        
        // Get animation effects
        const squashStretch = this.animationController.getSquashStretch();
        const motionBlur = this.animationController.getMotionBlur(player);
        
        // Apply squash and stretch
        const finalScaleX = scale * squashStretch.scaleX;
        const finalScaleY = scale * squashStretch.scaleY;
        const finalY = y + (squashStretch.offsetY || 0);
        
        // Draw motion blur if needed
        if (motionBlur.enabled && this.textCtx) {
            this.drawMotionBlur(player, x, finalY, radius, squashStretch, motionBlur);
        }
        
        // Draw main body with animations - forma quadrata originale
        let bodyColor = [...this.getBodyColor(player)];

        if (player.invulnerable) {
            const flicker = Math.floor(Date.now() / 100) % 2;
            bodyColor[3] = flicker === 0 ? 0.4 : 1.0;
        } else {
            bodyColor[3] = 1.0;
        }

        const sizeX = player.width * finalScaleX;
        const sizeY = player.height * finalScaleY;
        const rectX = x - sizeX / 2;
        const rectY = finalY - sizeY / 2;

        // Ombra (adattata allo squash)
        RenderingUtils.drawShadow(this.renderer, rectX, rectY - 3 * finalScaleY, sizeX, sizeY);

        // Apply rotation if needed
        const rotation = squashStretch.rotation || 0;
        if (rotation !== 0 && this.textCtx) {
            this.textCtx.save();
            this.textCtx.translate(x, finalY);
            this.textCtx.rotate(rotation);
            this.textCtx.translate(-x, -finalY);
        }

        // Bordo
        const borderColor = [0.0, 0.0, 0.0, 0.6];
        this.renderer.drawRect(rectX - 2 * finalScaleX, rectY - 2 * finalScaleY, sizeX + 4 * finalScaleX, sizeY + 4 * finalScaleY, borderColor);

        // Corpo - con gradiente dissoluzione se turbo
        if (squashStretch.bodyGradient && this.textCtx) {
            // Effetto bolide: NON usare canvas 2D, usa WebGL con multiple draw per simulare gradiente
            // Dividi il corpo in segmenti che vanno da trasparente (dietro) a solido (davanti)
            const segments = 8;
            for (let i = 0; i < segments; i++) {
                const segmentWidth = sizeX / segments;
                const segmentX = rectX + (i * segmentWidth);
                
                // Alpha da 0.3 (dietro) a 1.0 (davanti)
                const alpha = 0.3 + (i / segments) * 0.7;
                
                // Colore che sfuma da arancione/rosso (dietro) a colore player (davanti)
                let segmentColor;
                if (i < segments * 0.3) {
                    // Parte posteriore: fiamme arancioni/rosse
                    const flameProgress = i / (segments * 0.3);
                    segmentColor = [
                        1.0,
                        0.3 + flameProgress * (bodyColor[1] - 0.3),
                        0.1 + flameProgress * (bodyColor[2] - 0.1),
                        alpha * 0.6
                    ];
                } else {
                    // Parte centrale/anteriore: colore player
                    segmentColor = [...bodyColor];
                    segmentColor[3] = alpha;
                }
                
                this.renderer.drawRect(segmentX, rectY, segmentWidth, sizeY, segmentColor);
            }
        } else {
            // Rendering normale
            this.renderer.drawRect(rectX, rectY, sizeX, sizeY, bodyColor);
        }

        // Highlight (adattato)
        const highlightColor = [1.0, 1.0, 1.0, 0.7];
        this.renderer.drawCircle(x - sizeX * 0.2, finalY - sizeY * 0.2, Math.min(sizeX, sizeY) * 0.25, highlightColor);

        if (rotation !== 0 && this.textCtx) {
            this.textCtx.restore();
        }
    }

    drawMotionBlur(player, x, y, radius, squashStretch, motionBlur) {
        const ctx = this.textCtx;
        const trailCount = 3;
        const direction = motionBlur.direction;
        const strength = motionBlur.strength;
        
        let bodyColor = [...this.getBodyColor(player)];
        
        for (let i = 1; i <= trailCount; i++) {
            const trailX = x - Math.cos(direction) * i * 8 * strength;
            const trailY = y - Math.sin(direction) * i * 8 * strength;
            const alpha = (0.3 / i) * strength;
            
            const trailColor = [...bodyColor];
            trailColor[3] = alpha;
            
            const sizeX = player.width * squashStretch.scaleX * 0.95;
            const sizeY = player.height * squashStretch.scaleY * 0.95;
            
            this.renderer.drawRect(
                trailX - sizeX / 2,
                trailY - sizeY / 2,
                sizeX,
                sizeY,
                trailColor
            );
        }
    }

    getBodyColor(player) {
        if (player.isTurboActive) return RenderingConfig.COLORS.PLAYER_TURBO;
        if (player.powerups.immortality) return RenderingConfig.COLORS.PLAYER_IMMORTALITY;
        if (player.powerups.flight) return RenderingConfig.COLORS.PLAYER_FLIGHT;
        if (player.powerups.superJump) return RenderingConfig.COLORS.PLAYER_SUPER_JUMP;
        return RenderingConfig.COLORS.PLAYER_DEFAULT;
    }

    renderWings(player, time, x, y) {
        const wingFlapPhase = player.wingFlapPhase || 0;
        const wingFlap = Math.sin(wingFlapPhase) * 0.5 + 0.5;

        this.renderWing(x, y, wingFlap, -1, time);
        this.renderWing(x, y, wingFlap, 1, time);

        const flightAura = Math.sin(player.flightFloatPhase || 0) * 0.2 + 0.5;
        this.renderer.drawCircle(x, y, player.width, [0.4, 0.85, 1.0, 0.15 * flightAura]);
        this.renderer.drawCircle(x, y, player.width * 0.75, [0.5, 0.9, 1.0, 0.2 * flightAura]);
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
        const progress = player.instantFlightDuration / player.instantFlightMaxDuration;
        const progressRadius = radius * 2.2;
        const thickness = 4;
        const segments = 60;

        const baseColor = [0.4, 0.85, 1.0];

        // Glow
        const glowRadius = progressRadius + 3;
        this.renderer.drawCircle(x, y, glowRadius, [0.3, 0.7, 1.0, 0.15]);

        // Background
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments - Math.PI / 2;
            const px = x + Math.cos(angle) * progressRadius;
            const py = y + Math.sin(angle) * progressRadius;
            this.renderer.drawCircle(px, py, thickness * 0.6, [0.2, 0.2, 0.3, 0.4]);
        }

        // Progress
        const filledSegments = Math.floor(segments * progress);
        for (let i = 0; i < filledSegments; i++) {
            const angle = (Math.PI * 2 * i) / segments - Math.PI / 2;
            const px = x + Math.cos(angle) * progressRadius;
            const py = y + Math.sin(angle) * progressRadius;

            const alpha = 0.6 + (1 - progress) * 0.3;
            const color = [
                baseColor[0] + (1 - progress) * 0.3,
                baseColor[1] * progress,
                baseColor[2],
                alpha
            ];

            this.renderer.drawCircle(px, py, thickness, color);
        }

        // Head
        if (filledSegments > 0) {
            const headAngle = (Math.PI * 2 * filledSegments) / segments - Math.PI / 2;
            const headX = x + Math.cos(headAngle) * progressRadius;
            const headY = y + Math.sin(headAngle) * progressRadius;

            const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
            this.renderer.drawCircle(headX, headY, thickness * 1.8 * pulse, [1.0, 1.0, 1.0, 0.9 * pulse]);
            this.renderer.drawCircle(headX, headY, thickness * 1.2, [0.8, 0.95, 1.0, 1.0]);
        }

        // Sparkles
        if (progress > 0.2) {
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
}
