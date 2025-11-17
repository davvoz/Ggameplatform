/**
 * PlatformRenderer - Handles platform rendering with type-specific effects
 * Single Responsibility: Platform visualization
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { RenderingUtils } from './RenderingUtils.js';
import { PlatformTypes } from '../ProceduralLevelGenerator.js';

export class PlatformRenderer extends IEntityRenderer {
    constructor(renderer) {
        super(renderer);
    }

    render(platform, context) {
        const { time, currentCombo = 0 } = context;
        let renderColor = platform.color;
        let baseX = platform.x;
        let baseY = platform.y;

        // Crumbling effect
        if (platform.isCrumbling && platform.crumbleTimer) {
            this.renderCrumblingEffect(platform, baseX, baseY);
            const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
            renderColor = [...platform.color];
            renderColor[3] = 1.0 - crumbleProgress * 0.7;
            baseX += (Math.random() - 0.5) * crumbleProgress * 8;
            baseY += (Math.random() - 0.5) * crumbleProgress * 8;
        }
        
        // Combo color boost
        const comboBoost = Math.min(currentCombo / 50, 1.0);
        if (comboBoost > 0) {
            renderColor = [...renderColor];
            renderColor[0] = Math.min(renderColor[0] * (1.0 + comboBoost * 0.5), 1.0);
            renderColor[1] = Math.min(renderColor[1] * (1.0 + comboBoost * 0.5), 1.0);
            renderColor[2] = Math.min(renderColor[2] * (1.0 + comboBoost * 0.5), 1.0);
        }

        // Shadow
        RenderingUtils.drawShadow(this.renderer, baseX, baseY, platform.width, platform.height);

        // Main body with gradient
        this.renderPlatformBody(baseX, baseY, platform.width, platform.height, renderColor);
        this.renderHighlights(baseX, baseY, platform.width, platform.height, renderColor, time, comboBoost);

        // Type-specific effects
        if (platform.platformType && platform.platformType !== PlatformTypes.NORMAL) {
            this.renderTypeSpecificEffect(platform, baseX, baseY, time);
        }
    }

    renderCrumblingEffect(platform, baseX, baseY) {
        const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
        for (let i = 0; i < 6; i++) {
            const px = baseX + Math.random() * platform.width;
            const py = baseY + platform.height + Math.random() * 15 * crumbleProgress;
            const pSize = 1 + Math.random() * 2;
            this.renderer.drawCircle(px, py, pSize, [0.6, 0.5, 0.4, (1 - crumbleProgress) * 0.6]);
        }
    }

    renderPlatformBody(x, y, width, height, color) {
        const topColor = [...color];
        const bottomColor = [...color];
        bottomColor[0] *= 0.7;
        bottomColor[1] *= 0.7;
        bottomColor[2] *= 0.7;
        
        this.renderer.drawRect(x, y, width, height * 0.5, topColor);
        this.renderer.drawRect(x, y + height * 0.5, width, height * 0.5, bottomColor);
    }

    renderHighlights(x, y, width, height, color, time, comboBoost) {
        const highlightPulse = Math.sin(time * 3) * 0.1 + 0.5 + comboBoost * 0.3;
        this.renderer.drawRect(x + 3, y + 1, width - 6, 2, [1.0, 1.0, 1.0, highlightPulse]);
        
        const borderGlow = 0.4 + Math.sin(time * 4) * 0.2;
        const borderColor = [...color];
        borderColor[3] = borderGlow;
        this.renderer.drawRect(x, y, width, 1, borderColor);
        this.renderer.drawRect(x, y + height - 1, width, 1, borderColor);
        this.renderer.drawRect(x, y, 1, height, borderColor);
        this.renderer.drawRect(x + width - 1, y, 1, height, borderColor);
    }

    renderTypeSpecificEffect(platform, x, y, time) {
        switch (platform.platformType) {
            case PlatformTypes.FAST:
                this.renderFastEffect(x, y, platform.width, platform.height, time);
                break;
            case PlatformTypes.SLOW:
                this.renderSlowEffect(x, y, platform.width, platform.height, time);
                break;
            case PlatformTypes.BOUNCY:
                this.renderBouncyEffect(x, y, platform.width, platform.height, time);
                break;
            case PlatformTypes.CRUMBLING:
                this.renderCrumblingWarning(x, y, platform.width, platform.height, time);
                break;
            case PlatformTypes.SPRING:
                this.renderSpringEffect(platform, x, y, time);
                break;
            case 'RESCUE':
                this.renderRescueEffect(platform, x, y, time);
                break;
        }
    }

    renderFastEffect(x, y, width, height, time) {
        for (let i = 0; i < 2; i++) {
            const lineX = x + ((time * 300 + i * 40) % width);
            this.renderer.drawRect(lineX, y + 3, 2, height - 6, [1.0, 0.5, 0.2, 0.4]);
        }
    }

    renderSlowEffect(x, y, width, height, time) {
        // Ice crystals - centered on the platform
        for (let i = 0; i < 4; i++) {
            const crystalX = x + width * 0.2 + (width * 0.6 / 3) * i; // Distributed across 60% of width, centered
            const crystalY = y + height / 2;
            const crystalSize = 3 + Math.abs(Math.sin(time * 3 + i * 0.5)) * 3;
            
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2 + time;
                const px = crystalX + Math.cos(angle) * crystalSize;
                const py = crystalY + Math.sin(angle) * crystalSize;
                this.renderer.drawCircle(px, py, 1.5, [0.7, 0.9, 1.0, 0.8]);
            }
            this.renderer.drawCircle(crystalX, crystalY, crystalSize * 0.5, [1.0, 1.0, 1.0, 0.9]);
        }
        
        // Snow particles - centered
        for (let i = 0; i < 6; i++) {
            const snowX = x + width * 0.15 + (width * 0.7 / 5) * i + Math.sin(time * 2 + i) * 8; // Distributed across 70% of width
            const snowY = y - ((time * 30 + i * 10) % 30);
            const snowSize = 1 + Math.sin(time * 5 + i) * 0.5;
            this.renderer.drawCircle(snowX, snowY, snowSize, [0.9, 0.95, 1.0, 0.7]);
        }
    }

    renderBouncyEffect(x, y, width, height, time) {
        const wavePhase = (time * 4) % 1;
        const waveY = y + height + wavePhase * 30;
        const waveAlpha = (1 - wavePhase) * 0.6;
        this.renderer.drawRect(x, waveY, width, 2, [0.4, 1.0, 0.6, waveAlpha]);
        this.renderer.drawRect(x, waveY - 5, width, 1, [0.6, 1.0, 0.8, waveAlpha * 0.5]);
    }

    renderCrumblingWarning(x, y, width, height, time) {
        const dangerPulse = Math.sin(time * 8) * 0.3 + 0.4;
        this.renderer.drawRect(x, y, width, 2, [1.0, 0.3, 0.2, dangerPulse]);
        this.renderer.drawRect(x, y + height - 2, width, 2, [1.0, 0.3, 0.2, dangerPulse]);
    }

    renderSpringEffect(platform, x, y, time) {
        const springTime = platform.springAnimationTime || 0;
        const compression = platform.springCompression || 0;
        const numCoils = 8;
        const coilSpacing = platform.width / (numCoils + 1);
        const baseCoilHeight = platform.height * 1.2;
        
        for (let i = 0; i < numCoils; i++) {
            const coilX = x + coilSpacing * (i + 1);
            const oscillation = Math.sin(springTime * 8 + i * 0.5) * 2;
            const coilHeight = baseCoilHeight * (1 - compression * 0.7) + oscillation;
            const coilY = y + platform.height - coilHeight;
            const coilWidth = 1.8;
            
            this.renderer.drawRect(coilX - coilWidth/2, coilY, coilWidth, coilHeight * 0.5, [1.0, 0.6, 1.0, 1.0]);
            this.renderer.drawRect(coilX - coilWidth/2, coilY + coilHeight * 0.5, coilWidth, coilHeight * 0.5, [0.8, 0.3, 0.8, 1.0]);
            this.renderer.drawRect(coilX - 0.6, coilY + 1, 1.2, coilHeight * 0.3, [1.0, 1.0, 1.0, 0.5]);
        }
        
        if (compression > 0.3) {
            const energyPulse = Math.sin(springTime * 15) * 0.5 + 0.5;
            const energyColor = [1.0, 1.0, 0.3, compression * 0.8 * energyPulse];
            this.renderer.drawRect(x, y - 3, platform.width, 3, energyColor);
        }
    }

    renderRescueEffect(platform, x, y, time) {
        const phase = platform.laserPhase || 0;
        const pulse = Math.sin(time * 8 + phase) * 0.3 + 0.7;
        
        // Energy core lines
        for (let i = 0; i < 3; i++) {
            const offset = i * (platform.width / 3);
            const linePhase = time * 10 + phase + i * 0.5;
            const lineAlpha = (Math.sin(linePhase) * 0.5 + 0.5) * 0.8;
            this.renderer.drawRect(x + offset + 5, y + 2, 2, platform.height - 4, [0.3, 1.0, 0.5, lineAlpha]);
        }
        
        // Scanning line
        const scanPos = ((time * 2 + phase) % 1) * platform.width;
        this.renderer.drawRect(x + scanPos - 1, y, 2, platform.height, [1.0, 1.0, 1.0, 0.7]);
    }
}
