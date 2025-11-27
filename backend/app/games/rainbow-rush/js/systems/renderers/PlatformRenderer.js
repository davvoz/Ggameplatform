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
        this.labelRenderer = null; // Will be set by RenderingSystem
    }
    
    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
    }

    render(platform, context) {
        const { time, currentCombo = 0 } = context;
        let renderColor = platform.color;
        let baseX = platform.x;
        let baseY = platform.y;
        
        // Render label using centralized system
        if (this.labelRenderer) {
            this.labelRenderer.renderPlatformLabel(platform, baseX + platform.width / 2, baseY);
        }

        // Crumbling effect
        if (platform.isCrumbling && platform.crumbleTimer) {
            this.renderCrumblingEffect(platform, baseX, baseY);
            const crumbleProgress = platform.crumbleTimer / platform.crumbleDuration;
            renderColor = [...platform.color];
            renderColor[3] = 1.0 - crumbleProgress * 0.7;
            baseX += (Math.random() - 0.5) * crumbleProgress * 8;
            baseY += (Math.random() - 0.5) * crumbleProgress * 8;
        }
        
        // Dissolving effect - applica alpha
        if (platform.isDissolving && platform.dissolveAlpha !== undefined) {
            renderColor = [...renderColor];
            renderColor[3] = platform.dissolveAlpha;
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
            case PlatformTypes.DISSOLVING:
            case 'dissolving':
                this.renderDissolvingEffect(platform, x, y, time);
                break;
            case PlatformTypes.BOUNCING:
            case 'bouncing':
                this.renderBouncingEffect(platform, x, y, time);
                break;
            case PlatformTypes.ROTATING:
            case 'rotating':
                this.renderRotatingEffect(platform, x, y, time);
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
        const glowIntensity = platform.glowIntensity || 0.8;
        const pulsePhase = platform.pulsePhase || 0;
        
        // Platform pulsing effect
        const currentPulse = Math.sin(time * 3 + pulsePhase) * 0.15 + 1.0;
        
        // Glow effetto halo
        const glowSize = 6 * currentPulse;
        const glowColor = [...platform.color];
        glowColor[3] = 0.3 * glowIntensity * currentPulse;
        this.renderer.drawRect(x - glowSize/2, y - glowSize/2, platform.width + glowSize, platform.height + glowSize, glowColor);
        
        // Shape-specific rendering (solo forme simili a barre)
        const shape = platform.shape || 'rect';
        
        switch(shape) {
            case 'rounded':
                this.renderRoundedRescue(platform, x, y, time, currentPulse);
                break;
            default:
                this.renderDefaultRescue(platform, x, y, time, currentPulse);
        }
        
        // Sparkles
        if (platform.sparkles) {
            this.renderSparkles(platform, x, y, time);
        }
        
        // Particle trail
        if (platform.particleTrail) {
            this.renderParticleTrail(platform, x, y, time);
        }
        
        // Scanning line
        const scanPos = ((time * 2 + phase) % 1) * platform.width;
        this.renderer.drawRect(x + scanPos - 1, y, 2, platform.height, [1.0, 1.0, 1.0, 0.7 * currentPulse]);
    }
    
    renderDefaultRescue(platform, x, y, time, pulse) {
        const phase = platform.laserPhase || 0;
        
        // Energy core lines
        for (let i = 0; i < 3; i++) {
            const offset = i * (platform.width / 3);
            const linePhase = time * 10 + phase + i * 0.5;
            const lineAlpha = (Math.sin(linePhase) * 0.5 + 0.5) * 0.8 * pulse;
            this.renderer.drawRect(x + offset + 5, y + 2, 2, platform.height - 4, [0.3, 1.0, 0.5, lineAlpha]);
        }
    }
    
    renderRoundedRescue(platform, x, y, time, pulse) {
        // Render as rounded edges with circles
        const radius = platform.height / 2;
        
        // Left circle
        this.renderer.drawCircle(x + radius, y + radius, radius * pulse, platform.color);
        // Right circle
        this.renderer.drawCircle(x + platform.width - radius, y + radius, radius * pulse, platform.color);
        // Center rectangle
        this.renderer.drawRect(x + radius, y, platform.width - radius * 2, platform.height, platform.color);
        
        // Highlight
        const highlightColor = [1.0, 1.0, 1.0, 0.4 * pulse];
        this.renderer.drawCircle(x + radius, y + radius * 0.6, radius * 0.5 * pulse, highlightColor);
        this.renderer.drawCircle(x + platform.width - radius, y + radius * 0.6, radius * 0.5 * pulse, highlightColor);
    }
    
    renderStarRescue(platform, x, y, time, pulse) {
        const centerX = x + platform.width / 2;
        const centerY = y + platform.height / 2;
        const points = 5;
        const outerRadius = platform.width / 2 * pulse;
        const innerRadius = outerRadius * 0.4;
        const rotation = time + (platform.rotationSpeed || 0) * time;
        
        // Draw star with triangles
        for (let i = 0; i < points * 2; i++) {
            const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const nextAngle = ((i + 1) / (points * 2)) * Math.PI * 2 + rotation;
            const nextRadius = (i + 1) % 2 === 0 ? outerRadius : innerRadius;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(nextAngle) * nextRadius;
            const y2 = centerY + Math.sin(nextAngle) * nextRadius;
            
            // Draw line approximation
            this.renderer.drawRect(Math.min(x1, x2), Math.min(y1, y2), 
                                 Math.abs(x2 - x1) || 2, Math.abs(y2 - y1) || 2, 
                                 platform.color);
        }
        
        // Center glow
        this.renderer.drawCircle(centerX, centerY, outerRadius * 0.3 * pulse, [1.0, 1.0, 1.0, 0.8]);
    }
    
    renderCloudRescue(platform, x, y, time, pulse) {
        const cloudColor = [...platform.color];
        cloudColor[3] = 0.9;
        
        // 3 bumps for cloud effect
        const bump1X = x + platform.width * 0.25;
        const bump2X = x + platform.width * 0.5;
        const bump3X = x + platform.width * 0.75;
        const bumpY = y + platform.height / 2;
        const bumpRadius = platform.height * 0.6 * pulse;
        
        this.renderer.drawCircle(bump1X, bumpY, bumpRadius, cloudColor);
        this.renderer.drawCircle(bump2X, bumpY - 2, bumpRadius * 1.2, cloudColor);
        this.renderer.drawCircle(bump3X, bumpY, bumpRadius, cloudColor);
        
        // Base cloud body
        this.renderer.drawRect(x, y + platform.height / 2, platform.width, platform.height / 2, cloudColor);
        
        // Shimmer effect
        const shimmer = Math.sin(time * 6) * 0.3 + 0.5;
        this.renderer.drawCircle(bump2X, bumpY - 2, bumpRadius * 0.4, [1.0, 1.0, 1.0, shimmer]);
    }
    
    renderSparkles(platform, x, y, time) {
        const sparkleCount = 5;
        for (let i = 0; i < sparkleCount; i++) {
            const sparklePhase = (time * 4 + i * 0.8) % 1;
            const sparkleAlpha = Math.sin(sparklePhase * Math.PI) * 0.9;
            
            const sparkleX = x + (platform.width / sparkleCount) * i + platform.width / (sparkleCount * 2);
            const sparkleY = y - 5 - Math.sin(sparklePhase * Math.PI) * 10;
            const sparkleSize = 1.5 + Math.sin(sparklePhase * Math.PI) * 1.5;
            
            // Cross sparkle
            this.renderer.drawRect(sparkleX - sparkleSize, sparkleY, sparkleSize * 2, 1, [1.0, 1.0, 0.8, sparkleAlpha]);
            this.renderer.drawRect(sparkleX, sparkleY - sparkleSize, 1, sparkleSize * 2, [1.0, 1.0, 0.8, sparkleAlpha]);
        }
    }
    
    renderParticleTrail(platform, x, y, time) {
        // Update trail (limit to 8 particles)
        if (!platform.lastTrailTime || time - platform.lastTrailTime > 0.05) {
            platform.lastTrailTime = time;
            
            if (platform.particleTrail.length > 8) {
                platform.particleTrail.shift();
            }
            
            platform.particleTrail.push({
                x: x + platform.width / 2,
                y: y + platform.height / 2,
                life: 1.0,
                color: [...platform.color]
            });
        }
        
        // Render trail
        for (let i = 0; i < platform.particleTrail.length; i++) {
            const particle = platform.particleTrail[i];
            particle.life -= 0.015;
            
            if (particle.life > 0) {
                const size = 3 * particle.life;
                particle.color[3] = particle.life * 0.7;
                this.renderer.drawCircle(particle.x, particle.y, size, particle.color);
            }
        }
        
        // Clean up dead particles
        platform.particleTrail = platform.particleTrail.filter(p => p.life > 0);
    }
    
    renderDissolvingEffect(platform, x, y, time) {
        // Effetto particelle che cadono e dissolvenza
        if (platform.isDissolving) {
            const dissolveProgress = platform.dissolveTimer / platform.dissolveDuration;
            
            // Particelle che cadono dal bordo
            for (let i = 0; i < 8; i++) {
                const particleX = x + (platform.width / 8) * i + Math.random() * 10;
                const particleY = y + platform.height + dissolveProgress * 40;
                const particleSize = 2 + Math.random() * 2;
                const alpha = (1 - dissolveProgress) * 0.8;
                this.renderer.drawCircle(particleX, particleY, particleSize, [1.0, 0.8, 0.3, alpha]);
            }
            
            // Bordo che pulsa
            const pulse = Math.sin(time * 15 + dissolveProgress * 10) * 0.5 + 0.5;
            this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.5, 0.0, pulse * (1 - dissolveProgress)]);
            this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.5, 0.0, pulse * (1 - dissolveProgress)]);
        } else {
            // Animazione idle - bordo dorato pulsante
            const pulse = Math.sin(time * 4) * 0.3 + 0.6;
            this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.8, 0.2, pulse]);
            this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.8, 0.2, pulse]);
            
            // Sparkle effect
            const sparklePhase = (time * 3) % 1;
            if (sparklePhase < 0.3) {
                const sparkleX = x + Math.random() * platform.width;
                const sparkleY = y + Math.random() * platform.height;
                this.renderer.drawCircle(sparkleX, sparkleY, 2, [1.0, 1.0, 0.8, sparklePhase * 3]);
            }
        }
    }
    
    renderBouncingEffect(platform, x, y, time) {
        // Effetto piattaforma che rimbalza
        const bounceOffset = platform.bounceOffset || 0;
        const isBouncing = platform.isBouncing;
        
        if (isBouncing) {
            // Onde concentriche quando rimbalza
            const numWaves = 3;
            for (let i = 0; i < numWaves; i++) {
                const wavePhase = (time * 4 + i * 0.3) % 1;
                const waveY = y + platform.height + wavePhase * 25;
                const waveAlpha = (1 - wavePhase) * 0.6;
                this.renderer.drawRect(x - 5, waveY, platform.width + 10, 2, [0.5, 0.3, 1.0, waveAlpha]);
            }
            
            // Linee di movimento verticale
            for (let i = 0; i < 4; i++) {
                const lineX = x + (platform.width / 4) * i + platform.width / 8;
                const lineOffset = Math.sin(time * 8 + i) * 5;
                const lineAlpha = 0.4 + Math.sin(time * 6 + i) * 0.3;
                this.renderer.drawRect(lineX, y + lineOffset, 2, platform.height - Math.abs(lineOffset * 2), [0.6, 0.4, 1.0, lineAlpha]);
            }
        } else {
            // Idle: bordo viola pulsante
            const pulse = Math.sin(time * 3) * 0.3 + 0.5;
            this.renderer.drawRect(x, y, platform.width, 2, [0.5, 0.3, 1.0, pulse]);
            this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [0.5, 0.3, 1.0, pulse]);
        }
        
        // Indicatori di rimbalzo ai lati
        const indicatorSize = 4;
        const indicatorPulse = Math.sin(time * 5) * 0.4 + 0.6;
        this.renderer.drawCircle(x + indicatorSize, y + platform.height / 2, indicatorSize, [0.7, 0.5, 1.0, indicatorPulse]);
        this.renderer.drawCircle(x + platform.width - indicatorSize, y + platform.height / 2, indicatorSize, [0.7, 0.5, 1.0, indicatorPulse]);
    }
    
    renderRotatingEffect(platform, x, y, time) {
        // Effetto rotazione visibile
        const rotationAngle = platform.rotationAngle || 0;
        const isRotating = platform.isRotating;
        
        // Indicatori di rotazione ai lati
        const centerX = x + platform.width / 2;
        const centerY = y + platform.height / 2;
        
        if (isRotating) {
            // Cerchi rotanti quando in movimento
            const numCircles = 6;
            for (let i = 0; i < numCircles; i++) {
                const angle = rotationAngle + (i / numCircles) * Math.PI * 2;
                const radius = platform.width / 2.5;
                const circleX = centerX + Math.cos(angle) * radius;
                const circleY = centerY + Math.sin(angle) * (platform.height / 2);
                const alpha = 0.6 + Math.sin(time * 10 + i) * 0.3;
                this.renderer.drawCircle(circleX, circleY, 3, [1.0, 0.5, 0.0, alpha]);
            }
            
            // Linee di movimento
            for (let i = 0; i < 3; i++) {
                const linePhase = (time * 4 + i * 0.3) % 1;
                const lineX = x + linePhase * platform.width;
                const lineAlpha = Math.sin(linePhase * Math.PI) * 0.7;
                this.renderer.drawRect(lineX, y, 2, platform.height, [1.0, 0.6, 0.2, lineAlpha]);
            }
        } else {
            // Idle: bordo arancione pulsante
            const pulse = Math.sin(time * 3) * 0.3 + 0.5;
            this.renderer.drawRect(x, y, platform.width, 2, [1.0, 0.5, 0.0, pulse]);
            this.renderer.drawRect(x, y + platform.height - 2, platform.width, 2, [1.0, 0.5, 0.0, pulse]);
            
            // Frecce circolari statiche che indicano la rotazione
            const arrowSize = 4;
            const arrowX1 = x + arrowSize;
            const arrowX2 = x + platform.width - arrowSize;
            const arrowY = centerY;
            
            // Freccia sinistra (ruota senso antiorario)
            this.renderer.drawCircle(arrowX1, arrowY, arrowSize, [1.0, 0.6, 0.2, pulse]);
            // Freccia destra (ruota senso orario)
            this.renderer.drawCircle(arrowX2, arrowY, arrowSize, [1.0, 0.6, 0.2, pulse]);
        }
    }
}

