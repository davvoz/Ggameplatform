/**
 * CollectibleRenderer - Renders collectibles, hearts, and various bonuses
 * Single Responsibility: Bonus items visualization
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';

export class CollectibleRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
    }

    render(entity, context) {
        const { time } = context;
        
        switch(entity.entityType || entity.type) {
            case 'collectible':
                this.renderCollectible(entity, time);
                break;
            case 'heart':
                this.renderHeart(entity, time);
                break;
            case 'boost':
                this.renderBoost(entity, time);
                break;
            case 'magnet':
                this.renderMagnetBonus(entity, time);
                break;
            case 'timeslow':
                this.renderTimeSlowBonus(entity, time);
                break;
            case 'shield':
                this.renderShieldBonus(entity, time);
                break;
            case 'multiplier':
                this.renderMultiplierBonus(entity, time);
                break;
            case 'rainbow':
                this.renderRainbowBonus(entity, time);
                break;
            case 'powerup':
                this.renderPowerup(entity, time);
                break;
        }
    }

    renderCollectible(collectible, time) {
        const offset = collectible.pulsePhase || 0;
        const pulseRadius = collectible.radius + Math.sin(time * 4 + offset) * 2;
        const rotation = time * 3 + offset;

        // Halos
        this.renderer.drawCircle(collectible.x, collectible.y, pulseRadius * 1.8, [...collectible.color, 0.3]);
        this.renderer.drawCircle(collectible.x, collectible.y, pulseRadius * 1.3, [...collectible.color, 0.5]);

        // Rainbow ring
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + rotation;
            const arcX = collectible.x + Math.cos(angle) * pulseRadius * 1.8;
            const arcY = collectible.y + Math.sin(angle) * pulseRadius * 1.8;
            const hue = (i / 8);
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.6);
            this.renderer.drawCircle(arcX, arcY, 2.5, [...rgb, 0.9]);
        }

        // Body layers
        for (let i = 0; i < 5; i++) {
            const layerRadius = pulseRadius * (1 - i * 0.2);
            const layerAlpha = 1.0 - i * 0.15;
            const layerColor = [...collectible.color];
            layerColor[0] = Math.min(layerColor[0] * (1 + i * 0.2), 1.0);
            layerColor[1] = Math.min(layerColor[1] * (1 + i * 0.2), 1.0);
            layerColor[2] = Math.min(layerColor[2] * (1 + i * 0.2), 1.0);
            layerColor[3] = layerAlpha;
            this.renderer.drawCircle(collectible.x, collectible.y, layerRadius, layerColor);
        }

        // Star
        this.renderStar(collectible.x, collectible.y, pulseRadius, time + offset);

        // Highlight
        const sparkleSize = pulseRadius * 0.35;
        this.renderer.drawCircle(collectible.x - sparkleSize * 0.2, collectible.y - sparkleSize * 0.2, 
                                sparkleSize, [1.0, 1.0, 1.0, 0.95 + Math.sin(time * 8) * 0.05]);
    }

    renderStar(x, y, radius, time) {
        const starPoints = 5;
        const starRotation = time * 2;
        for (let i = 0; i < starPoints * 2; i++) {
            const angle = (i / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const r = i % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            
            const nextI = (i + 1) % (starPoints * 2);
            const nextAngle = (nextI / (starPoints * 2)) * Math.PI * 2 + starRotation;
            const nextR = nextI % 2 === 0 ? radius * 0.6 : radius * 0.3;
            const nextPx = x + Math.cos(nextAngle) * nextR;
            const nextPy = y + Math.sin(nextAngle) * nextR;
            
            for (let j = 0; j < 3; j++) {
                const t = j / 3;
                const lx = px + (nextPx - px) * t;
                const ly = py + (nextPy - py) * t;
                this.renderer.drawCircle(lx, ly, 1.5, [1.0, 1.0, 0.5, 0.9]);
            }
        }
    }

    renderHeart(heart, time) {
        const offset = heart.pulsePhase || 0;
        const floatY = heart.y + Math.sin(offset + time * 2) * (heart.floatAmplitude || 8);
        const pulse = Math.sin(offset + time * 4) * 0.25 + 1.0;
        const size = heart.radius * pulse;

        // Glows
        RenderingUtils.drawGlow(this.renderer, heart.x, floatY, size * 3, heart.color, 3, 0.35 * pulse, 0.1);

        // Heart shape
        const lobeRadius = size * 0.55;
        const lobeOffset = size * 0.4;
        this.renderer.drawCircle(heart.x - lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);
        this.renderer.drawCircle(heart.x + lobeOffset, floatY - size * 0.15, lobeRadius, heart.color);
        this.renderer.drawRect(heart.x - size * 0.7, floatY, size * 1.4, size * 0.8, heart.color);

        // Point
        for (let i = 0; i < 5; i++) {
            const stepHeight = size * 0.25;
            const stepWidth = size * 1.4 * (1 - (i + 1) / 5);
            const stepY = floatY + size * 0.8 + i * stepHeight;
            this.renderer.drawRect(heart.x - stepWidth / 2, stepY, stepWidth, stepHeight + 2, heart.color);
        }

        // Highlights
        this.renderer.drawCircle(heart.x - lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);
        this.renderer.drawCircle(heart.x + lobeOffset * 0.6, floatY - size * 0.3, size * 0.2, [1.0, 1.0, 1.0, 0.5 * pulse]);

        // Sparkles
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 2.5;
            const orbitRadius = size * 2.2;
            const px = heart.x + Math.cos(angle) * orbitRadius;
            const py = floatY + Math.sin(angle) * orbitRadius;
            const sparkleSize = 2.5 + Math.sin(time * 5 + i) * 1;
            this.renderer.drawCircle(px, py, sparkleSize, [1.0, 1.0, 1.0, 0.9 * pulse]);
        }
    }

    renderBoost(boost, time) {
        const pulse = RenderingUtils.getPulse(time + boost.pulsePhase, 5, 0.6, 1.0);
        const currentRadius = boost.radius * pulse;
        
        // Halos
        RenderingUtils.drawGlow(this.renderer, boost.x, boost.y, currentRadius * 4.5, boost.color, 4, 0.35 * pulse, 0.08);
        
        // Trail particles
        if (boost.trailParticles) {
            for (const particle of boost.trailParticles) {
                const alpha = particle.life / particle.maxLife;
                const pColor = [...particle.color];
                pColor[3] = alpha * 0.6;
                this.renderer.drawCircle(particle.x, particle.y, particle.size, pColor);
            }
        }
        
        // Arrow shape
        const arrowWidth = currentRadius * 2.5;
        const arrowHeight = currentRadius * 1.8;
        const arrowX = boost.x - arrowWidth * 0.3;
        const arrowY = boost.y;
        
        this.renderer.drawRect(arrowX - arrowWidth * 0.3, arrowY - arrowHeight * 0.25, arrowWidth * 0.6, arrowHeight * 0.5, boost.color);
        
        // Arrow tip
        for (let i = 0; i < 6; i++) {
            const stepWidth = arrowWidth * 0.4 * (1 - i / 6);
            const stepHeight = arrowHeight * (1 - i / 6) * 0.5;
            const stepX = arrowX + arrowWidth * 0.3 + i * (arrowWidth * 0.15);
            this.renderer.drawRect(stepX, arrowY - stepHeight / 2, arrowWidth * 0.15, stepHeight, boost.color);
        }
    }

    renderPowerup(powerup, time) {
        const rotationPulse = Math.sin(powerup.rotationAngle * 2) * 0.3 + 1.0;
        const bigPulse = RenderingUtils.getPulse(powerup.rotationAngle, 3, 0.5, 1.0);
        const currentRadius = powerup.radius * rotationPulse;

        RenderingUtils.drawGlow(this.renderer, powerup.x, powerup.y, currentRadius * 4, powerup.glowColor, 3, 0.3 * bigPulse, 0.08);

        // Body
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius, powerup.color);
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius * 0.7, [1.0, 1.0, 1.0, 0.9]);
        this.renderer.drawCircle(powerup.x, powerup.y, currentRadius * 0.5, [...powerup.color, 1.0]);
    }

    renderMagnetBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.3 + 1.0;
        const size = bonus.radius * pulse;
        
        this.renderer.drawCircle(bonus.x, bonus.y, size * 2.5, [1.0, 0.3, 0.9, 0.3]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 1.8, [1.0, 0.4, 0.9, 0.5]);
        
        const magnetWidth = size * 0.6;
        const magnetHeight = size * 1.0;
        
        this.renderer.drawRect(bonus.x - magnetWidth - 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [1.0, 0.2, 0.2, 1.0]);
        this.renderer.drawRect(bonus.x + 2, bonus.y - magnetHeight/2, magnetWidth, magnetHeight, [0.2, 0.3, 1.0, 1.0]);
        this.renderer.drawRect(bonus.x - 3, bonus.y - magnetHeight/2 - 4, 6, 4, [0.7, 0.7, 0.7, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.3, [1.0, 1.0, 1.0, 0.9]);
    }

    renderTimeSlowBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.2 + 1.0;
        const size = bonus.radius * pulse;
        
        this.renderer.drawCircle(bonus.x, bonus.y, size * 2, [0.3, 0.6, 1.0, 0.3]);
        this.renderer.drawCircle(bonus.x, bonus.y, size, bonus.color);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.8, [0.3, 0.5, 0.8, 1.0]);
        
        // Clock hands
        const slowRotation = time * 0.3;
        const hourAngle = slowRotation - Math.PI / 2;
        const minuteAngle = slowRotation * 3 - Math.PI / 2;
        
        this.drawClockHand(bonus.x, bonus.y, hourAngle, size * 0.5, 2.5, [1.0, 1.0, 1.0, 1.0]);
        this.drawClockHand(bonus.x, bonus.y, minuteAngle, size * 0.7, 1.8, [0.9, 0.95, 1.0, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, 4, [1.0, 1.0, 1.0, 1.0]);
    }

    drawClockHand(x, y, angle, length, width, color) {
        for (let i = 0; i < 3; i++) {
            const t = i / 3;
            const px = x + Math.cos(angle) * length * t;
            const py = y + Math.sin(angle) * length * t;
            this.renderer.drawCircle(px, py, width, color);
        }
    }

    renderShieldBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.25 + 1.0;
        const size = bonus.radius * pulse;
        
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 3.5, bonus.glowColor, 5, 0.6 * pulse, 0.1);
        
        // Hexagon
        const sides = 6;
        const hexRotation = (bonus.rotation || 0) + time * 1.5;
        
        for (let i = 0; i < sides; i++) {
            const angle1 = (Math.PI * 2 * i) / sides + hexRotation;
            const angle2 = (Math.PI * 2 * (i + 1)) / sides + hexRotation;
            const x1 = bonus.x + Math.cos(angle1) * size * 1.3;
            const y1 = bonus.y + Math.sin(angle1) * size * 1.3;
            const x2 = bonus.x + Math.cos(angle2) * size * 1.3;
            const y2 = bonus.y + Math.sin(angle2) * size * 1.3;
            
            for (let j = 0; j < 8; j++) {
                const t = j / 8;
                const px = x1 + (x2 - x1) * t;
                const py = y1 + (y2 - y1) * t;
                this.renderer.drawCircle(px, py, 4, [0.3, 1.0, 0.5, 1.0]);
            }
            this.renderer.drawCircle(x1, y1, 6, [0.6, 1.0, 0.7, 1.0]);
            this.renderer.drawCircle(x1, y1, 4, [1.0, 1.0, 1.0, 0.9]);
        }
        
        // Center
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.7, [0.2, 0.8, 0.4, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5, [0.4, 1.0, 0.6, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.15, [1.0, 1.0, 1.0, 1.0]);
    }

    renderMultiplierBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.35 + 1.0;
        const size = bonus.radius * pulse;
        
        // Light rays
        for (let i = 0; i < 8; i++) {
            const rayAngle = (i / 8) * Math.PI * 2 + (bonus.rotation || 0);
            const rayLength = size * (3 + Math.sin(time * 5 + i * 0.5) * 1.5);
            
            for (let j = 0; j < 8; j++) {
                const t = j / 8;
                const px = bonus.x + Math.cos(rayAngle) * rayLength * t;
                const py = bonus.y + Math.sin(rayAngle) * rayLength * t;
                const rayAlpha = (1 - t) * 0.8;
                this.renderer.drawCircle(px, py, 4 * (1 - t * 0.5), [1.0, 0.9, 0.3, rayAlpha]);
            }
        }
        
        RenderingUtils.drawGlow(this.renderer, bonus.x, bonus.y, size * 3.5, bonus.glowColor, 6, 0.7 * pulse, 0.1);
        
        // Star
        const starPoints = 8;
        for (let i = 0; i < starPoints; i++) {
            const angle = (Math.PI * 2 * i) / starPoints + (bonus.rotation || 0) + time * 2;
            const x = bonus.x + Math.cos(angle) * size * 1.4;
            const y = bonus.y + Math.sin(angle) * size * 1.4;
            this.renderer.drawCircle(x, y, 6, [1.0, 0.8, 0.2, 1.0]);
        }
        
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.9, [1.0, 0.9, 0.3, 1.0]);
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.4, [1.0, 1.0, 1.0, 1.0]);
    }

    renderRainbowBonus(bonus, time) {
        const pulse = Math.sin(bonus.pulsePhase) * 0.4 + 1.0;
        const size = bonus.radius * pulse;
        
        // Rainbow layers
        for (let i = 0; i < 10; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 36) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(bonus.x, bonus.y, size * (4 + i * 0.35), [...rgb, (0.7 - i * 0.06) * pulse]);
        }
        
        // Concentric rings
        for (let i = 0; i < 7; i++) {
            const hue = ((bonus.rainbowPhase * 100 + i * 51.4) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.5);
            this.renderer.drawCircle(bonus.x, bonus.y, size * (1.2 - i * 0.15), [...rgb, 1.0]);
        }
        
        // Orbiting particles
        for (let i = 0; i < 30; i++) {
            const orbitAngle = (i / 30) * Math.PI * 2 + time * 4;
            const orbitRadius = size * (2.8 + Math.sin(time * 6 + i) * 0.5);
            const px = bonus.x + Math.cos(orbitAngle) * orbitRadius;
            const py = bonus.y + Math.sin(orbitAngle) * orbitRadius;
            const hue = ((bonus.rainbowPhase * 100 + i * 12) % 360) / 360;
            const rgb = RenderingUtils.hslToRgb(hue, 1.0, 0.7);
            this.renderer.drawCircle(px, py, 2.5 + Math.sin(time * 10 + i) * 1.2, [...rgb, 0.95]);
        }
        
        // Core
        this.renderer.drawCircle(bonus.x, bonus.y, size * 0.5 * pulse, [1.0, 1.0, 1.0, 1.0]);
    }
}
