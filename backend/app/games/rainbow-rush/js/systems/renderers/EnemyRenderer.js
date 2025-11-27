/**
 * EnemyRenderer - Renderizza nemici con emoji, effetti, barre HP, proiettili
 * Implementa IEntityRenderer per consistenza con altri renderer
 */
import { IEntityRenderer } from './IEntityRenderer.js';
import { EntityLabelRenderer } from './EntityLabelRenderer.js';

export class EnemyRenderer extends IEntityRenderer {
    constructor() {
        super();
        this.textCanvas = document.getElementById('textCanvas');
        this.textCtx = this.textCanvas ? this.textCanvas.getContext('2d') : null;
        this.labelRenderer = null; // Will be set by RenderingSystem
    }
    
    setLabelRenderer(labelRenderer) {
        this.labelRenderer = labelRenderer;
    }

    /**
     * Render enemy (can be single entity or array)
     */
    render(entity, context) {
        if (!this.textCtx) return;

        const cameraOffset = context?.cameraX || 0;

        // Handle single enemy (called by RendererFactory)
        if (entity && !Array.isArray(entity)) {
            if (entity.alive) {
                this.renderEnemy(entity, cameraOffset);
                this.renderHealthBar(entity, cameraOffset);
            } else {
                this.renderDeathAnimation(entity, cameraOffset);
            }
            
            // Render projectiles
            if (entity.projectiles && entity.projectiles.length > 0) {
                entity.projectiles.forEach(proj => {
                    this.renderProjectile(proj, cameraOffset);
                });
            }
            return;
        }

        // Handle array of enemies (legacy support)
        const enemies = Array.isArray(entity) ? entity : entity?.enemies || [];
        
        enemies.forEach(enemy => {
            if (enemy.alive) {
                this.renderEnemy(enemy, cameraOffset);
                this.renderHealthBar(enemy, cameraOffset);
            } else {
                this.renderDeathAnimation(enemy, cameraOffset);
            }
            
            // Render projectiles
            if (enemy.projectiles && enemy.projectiles.length > 0) {
                enemy.projectiles.forEach(proj => {
                    this.renderProjectile(proj, cameraOffset);
                });
            }
        });
    }

    /**
     * Render single enemy
     */
    renderEnemy(enemy, cameraOffset) {
        const ctx = this.textCtx;
        ctx.save();

        // Hit flash effect
        if (enemy.hitFlashTimer > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(enemy.hitFlashTimer * 50) * 0.5;
        }

        // Animation parameters
        const time = enemy.animationTimer || 0;
        
        // Vertical oscillation (breathing/floating effect)
        let yOffset = 0;
        let scale = 1.0;
        let rotation = 0;
        
        // Different animations based on enemy type
        if (enemy.category === 'flying') {
            // Flying enemies: smooth up/down float
            yOffset = Math.sin(time * 3) * 8;
            scale = 1.0 + Math.sin(time * 4) * 0.08; // Gentle pulsing
        } else if (enemy.pattern === 'roll' || enemy.id === 'spikeball') {
            // Spike ball: NO rotation, just subtle breathing
            yOffset = Math.sin(time * 1.5) * 2;
            scale = 1.0 + Math.sin(time * 2) * 0.03; // Very subtle pulsing
        } else if (enemy.pattern === 'bounce' || enemy.pattern === 'jump') {
            // Bouncing enemies: squash and stretch
            const bouncePhase = Math.sin(time * 6);
            scale = 1.0 + bouncePhase * 0.15;
            yOffset = Math.abs(bouncePhase) * 5;
        } else if (enemy.id === 'slug' || enemy.category === 'ground') {
            // Ground enemies: gentle squirm/wiggle
            yOffset = Math.sin(time * 2) * 2;
            const wiggle = Math.sin(time * 8) * 0.05;
            rotation = wiggle;
        } else if (enemy.category === 'chaser') {
            // Chasers: aggressive bobbing
            yOffset = Math.sin(time * 5) * 4;
            scale = 1.0 + Math.sin(time * 6) * 0.1;
        } else {
            // Default: subtle breathing
            scale = 1.0 + Math.sin(time * 3) * 0.05;
        }

        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2 + yOffset;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height + 5,
            enemy.width * 0.4 * scale,
            enemy.height * 0.15,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Enemy body glow (based on category)
        const glowColor = this.getGlowColor(enemy);
        const gradient = ctx.createRadialGradient(
            enemyCenterX, enemyCenterY, 0,
            enemyCenterX, enemyCenterY,
            enemy.width * 0.8 * scale
        );
        gradient.addColorStop(0, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, 0.4)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            enemyCenterX - enemy.width * 0.8 * scale,
            enemyCenterY - enemy.height * 0.8 * scale,
            enemy.width * 1.6 * scale,
            enemy.height * 1.6 * scale
        );

        // Render label above enemy using centralized system
        if (this.labelRenderer) {
            this.labelRenderer.renderEnemyLabel(enemy, enemyCenterX, enemyCenterY - enemy.height / 2 - 20);
        }
        
        // Render custom graphics or emoji icon with animation
        ctx.save();
        ctx.translate(enemyCenterX, enemyCenterY);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        
        // Custom drawn enemies
        if (enemy.id === 'spikeball') {
            // Use actual width/height for varied sizes
            const radius = Math.max(enemy.width, enemy.height) / 2;
            this.drawSpikeBall(ctx, 0, 0, radius, time);
        } else if (enemy.id === 'slug') {
            this.drawHedgehog(ctx, 0, 0, enemy.width / 2, time, enemy.direction);
        } else {
            // Standard emoji rendering
            const fontSize = Math.max(enemy.width, enemy.height);
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.icon, 0, 0);
        }
        
        ctx.restore();

        // Charging indicator
        if (enemy.isCharging) {
            this.renderChargingEffect(enemy);
        }

        // Teleport effect
        if (enemy.pattern === 'teleport' && enemy.teleportTimer < 0.3) {
            this.renderTeleportEffect(enemy);
        }

        ctx.restore();
    }

    /**
     * Get glow color based on enemy category
     */
    getGlowColor(enemy) {
        const colorMap = {
            'ground': [200, 100, 50],
            'flying': [100, 150, 255],
            'chaser': [255, 100, 100],
            'jumper': [100, 200, 100],
            'turret': [150, 150, 150],
            'miniboss': [255, 50, 255]
        };

        const rgb = colorMap[enemy.category] || [255, 255, 255];
        return rgb;
    }

    /**
     * Render health bar above enemy
     */
    renderHealthBar(enemy, cameraOffset) {
        const ctx = this.textCtx;
        
        // Only show HP bar if damaged or boss
        if (enemy.hp >= enemy.maxHp && enemy.category !== 'miniboss') return;

        const barWidth = enemy.width;
        const barHeight = 5;
        const barX = enemy.x;
        const barY = enemy.y - 15;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health (green to red gradient based on HP)
        const hpPercent = enemy.hp / enemy.maxHp;
        const hue = hpPercent * 120; // 120 = green, 0 = red
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP text for bosses
        if (enemy.category === 'miniboss') {
            ctx.font = '12px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${Math.ceil(enemy.hp)}/${enemy.maxHp}`,
                barX + barWidth / 2,
                barY - 8
            );
        }
    }

    /**
     * Render death animation
     */
    renderDeathAnimation(enemy, cameraOffset) {
        const ctx = this.textCtx;
        const progress = enemy.deathTimer / enemy.deathDuration;
        
        ctx.save();
        ctx.globalAlpha = 1.0 - progress;
        
        // Fade out and scale up
        const scale = 1.0 + progress * 0.5;
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.scale(scale, scale);
        ctx.rotate(progress * Math.PI * 2);
        
        const fontSize = Math.max(enemy.width, enemy.height);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.icon, 0, 0);
        
        ctx.restore();
    }

    /**
     * Render charging effect
     */
    renderChargingEffect(enemy) {
        const ctx = this.textCtx;
        
        // Pulsating red glow
        const alpha = 0.3 + Math.sin(enemy.animationTimer * 20) * 0.3;
        const gradient = ctx.createRadialGradient(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            0,
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.width
        );
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            enemy.x - enemy.width * 0.5,
            enemy.y - enemy.height * 0.5,
            enemy.width * 2,
            enemy.height * 2
        );

        // Speed lines
        for (let i = 0; i < 3; i++) {
            const offset = i * 15;
            ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 - i * 0.15})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.x - offset, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x - offset - 20, enemy.y + enemy.height / 2);
            ctx.stroke();
        }
    }

    /**
     * Render teleport effect
     */
    renderTeleportEffect(enemy) {
        const ctx = this.textCtx;
        const progress = enemy.teleportTimer / 0.3;
        
        // Expanding circle
        const radius = enemy.width * (1.0 + progress * 2);
        const alpha = 1.0 - progress;
        
        ctx.strokeStyle = `rgba(200, 100, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            radius,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }

    /**
     * Render projectile
     */
    renderProjectile(projectile, cameraOffset) {
        const ctx = this.textCtx;
        
        ctx.save();

        // Glow effect
        const gradient = ctx.createRadialGradient(
            projectile.x, projectile.y, 0,
            projectile.x, projectile.y, projectile.radius * 2
        );
        
        const color = projectile.color;
        gradient.addColorStop(0, `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, 0.4)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, 1.0)`;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        const trailLength = 3;
        for (let i = 0; i < trailLength; i++) {
            const t = (i + 1) / trailLength;
            const trailX = projectile.x - projectile.vx * t * 0.05;
            const trailY = projectile.y - projectile.vy * t * 0.05;
            const trailAlpha = 0.5 * (1 - t);
            
            ctx.fillStyle = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, projectile.radius * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw custom spike ball (professional spiky threat)
     */
    drawSpikeBall(ctx, x, y, radius, time) {
        // Color palette - dark menacing green
        const bodyColor = '#2a4a1d';
        const darkColor = '#1a2e12';
        const lightColor = '#3d6b28';
        const highlightColor = '#5a9d3f';
        
        // NO circular body - draw only the spikes forming the shape
        // The body is implied by the overlapping spike bases
        
        // Draw spikes in layers for depth - back to front
        const numSpikes = 24; // More spikes for dense, professional look
        
        // Professional animation: subtle pulsing + menacing quiver
        const breatheEffect = Math.sin(time * 1.5) * 0.03; // Slow breathing
        const quiverEffect = Math.sin(time * 8) * 0.008; // Fast micro-movements
        
        // Layer 1: Back spikes (darker, smaller)
        for (let i = 0; i < numSpikes; i++) {
            const angle = (Math.PI * 2 * i) / numSpikes; // FIXED position - no rotation
            
            // Pseudo-random variation per spike
            const seedA = Math.sin(i * 12.9898) * 0.5 + 0.5;
            const seedB = Math.sin(i * 78.233) * 0.5 + 0.5;
            const seedC = Math.sin(i * 43.758) * 0.5 + 0.5;
            
            const lengthVariation = 0.75 + seedA * 0.5;
            const widthVariation = 0.7 + seedB * 0.6;
            const curveAmount = (seedC - 0.5) * 0.4;
            
            // Individual spike animation - slight independent movement
            const spikePhase = Math.sin(time * 5 + i * 0.8) * 0.015;
            const spikeLength = radius * (0.85 + breatheEffect + spikePhase + quiverEffect) * lengthVariation;
            const baseWidth = radius * 0.22 * widthVariation;
            
            const baseX = x;
            const baseY = y;
            const tipX = x + Math.cos(angle) * spikeLength;
            const tipY = y + Math.sin(angle) * spikeLength;
            
            // Control point for curve
            const controlDist = spikeLength * 0.6;
            const controlAngle = angle + curveAmount;
            const controlX = x + Math.cos(controlAngle) * controlDist;
            const controlY = y + Math.sin(controlAngle) * controlDist;
            
            // Dark gradient for back layer
            const spikeGradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
            spikeGradient.addColorStop(0, darkColor);
            spikeGradient.addColorStop(0.6, bodyColor);
            spikeGradient.addColorStop(1, lightColor);
            
            ctx.fillStyle = spikeGradient;
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 1.5;
            
            // Draw spike shape
            const perpAngle = angle + Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(
                baseX + Math.cos(perpAngle) * baseWidth,
                baseY + Math.sin(perpAngle) * baseWidth
            );
            
            // Curved left edge
            ctx.quadraticCurveTo(
                controlX + Math.cos(perpAngle) * baseWidth * 0.4,
                controlY + Math.sin(perpAngle) * baseWidth * 0.4,
                tipX,
                tipY
            );
            
            // Curved right edge
            ctx.quadraticCurveTo(
                controlX - Math.cos(perpAngle) * baseWidth * 0.4,
                controlY - Math.sin(perpAngle) * baseWidth * 0.4,
                baseX - Math.cos(perpAngle) * baseWidth,
                baseY - Math.sin(perpAngle) * baseWidth
            );
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        // Layer 2: Front spikes (brighter, longer, offset angle)
        const angleOffset = Math.PI / numSpikes; // Offset for layering
        
        for (let i = 0; i < numSpikes; i++) {
            const angle = (Math.PI * 2 * i) / numSpikes + angleOffset; // FIXED position - no rotation
            
            // Different seed for front spikes
            const seedA = Math.sin(i * 23.456 + 100) * 0.5 + 0.5;
            const seedB = Math.sin(i * 91.234 + 100) * 0.5 + 0.5;
            const seedC = Math.sin(i * 67.890 + 100) * 0.5 + 0.5;
            
            const lengthVariation = 0.8 + seedA * 0.4;
            const widthVariation = 0.75 + seedB * 0.5;
            const curveAmount = (seedC - 0.5) * 0.35;
            
            // Individual spike animation - slight independent pulsing
            const spikePhase = Math.sin(time * 4.5 + i * 1.2) * 0.02;
            const spikeLength = radius * (1.0 + breatheEffect + spikePhase + quiverEffect) * lengthVariation;
            const baseWidth = radius * 0.2 * widthVariation;
            
            const baseX = x;
            const baseY = y;
            const tipX = x + Math.cos(angle) * spikeLength;
            const tipY = y + Math.sin(angle) * spikeLength;
            
            const controlDist = spikeLength * 0.65;
            const controlAngle = angle + curveAmount;
            const controlX = x + Math.cos(controlAngle) * controlDist;
            const controlY = y + Math.sin(controlAngle) * controlDist;
            
            // Check if spike is on "lit" side (top-left illumination)
            const lightAngle = angle - Math.PI * 0.75; // Light from top-left
            const normalizedLight = Math.cos(lightAngle);
            const isLit = normalizedLight > 0;
            
            // Gradient based on lighting
            const spikeGradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
            
            if (isLit) {
                spikeGradient.addColorStop(0, bodyColor);
                spikeGradient.addColorStop(0.4, lightColor);
                spikeGradient.addColorStop(0.8, highlightColor);
                spikeGradient.addColorStop(1, '#7ab85d');
            } else {
                spikeGradient.addColorStop(0, darkColor);
                spikeGradient.addColorStop(0.5, bodyColor);
                spikeGradient.addColorStop(1, lightColor);
            }
            
            ctx.fillStyle = spikeGradient;
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 2;
            
            const perpAngle = angle + Math.PI / 2;
            
            ctx.beginPath();
            ctx.moveTo(
                baseX + Math.cos(perpAngle) * baseWidth,
                baseY + Math.sin(perpAngle) * baseWidth
            );
            
            ctx.quadraticCurveTo(
                controlX + Math.cos(perpAngle) * baseWidth * 0.35,
                controlY + Math.sin(perpAngle) * baseWidth * 0.35,
                tipX,
                tipY
            );
            
            ctx.quadraticCurveTo(
                controlX - Math.cos(perpAngle) * baseWidth * 0.35,
                controlY - Math.sin(perpAngle) * baseWidth * 0.35,
                baseX - Math.cos(perpAngle) * baseWidth,
                baseY - Math.sin(perpAngle) * baseWidth
            );
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add highlight edge on lit spikes
            if (isLit && normalizedLight > 0.3) {
                ctx.strokeStyle = `rgba(149, 209, 117, ${normalizedLight * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(
                    baseX + Math.cos(perpAngle) * baseWidth * 0.9,
                    baseY + Math.sin(perpAngle) * baseWidth * 0.9
                );
                ctx.quadraticCurveTo(
                    controlX + Math.cos(perpAngle) * baseWidth * 0.3,
                    controlY + Math.sin(perpAngle) * baseWidth * 0.3,
                    tipX,
                    tipY
                );
                ctx.stroke();
            }
        }
        
        // Small dark center to tie the spikes together
        const centerGradient = ctx.createRadialGradient(
            x - radius * 0.05, y - radius * 0.05, 0,
            x, y, radius * 0.15
        );
        centerGradient.addColorStop(0, bodyColor);
        centerGradient.addColorStop(1, darkColor);
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw hedgehog (cute but dangerous)
     */
    drawHedgehog(ctx, x, y, radius, time, direction = 1) {
        const bodyColor = '#8b6f47';
        const darkColor = '#5a4a35';
        const spikeColor = '#6b5840';
        const noseColor = '#4a3a2a';
        
        // Facing direction
        const flipX = direction < 0 ? -1 : 1;
        ctx.save();
        ctx.scale(flipX, 1);
        
        // Body (oval)
        const bodyWidth = radius * 1.4;
        const bodyHeight = radius * 0.9;
        
        const bodyGradient = ctx.createRadialGradient(
            x * flipX - bodyWidth * 0.2, y - bodyHeight * 0.2, 0,
            x * flipX, y, bodyWidth
        );
        bodyGradient.addColorStop(0, '#a58968');
        bodyGradient.addColorStop(0.7, bodyColor);
        bodyGradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = bodyGradient;
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x * flipX, y, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Spikes on back (animated quivering)
        const numSpikes = 10;
        const spikeStartAngle = Math.PI * 0.2;
        const spikeEndAngle = Math.PI * 0.8;
        
        for (let i = 0; i < numSpikes; i++) {
            const t = i / (numSpikes - 1);
            const angle = spikeStartAngle + (spikeEndAngle - spikeStartAngle) * t;
            const quiver = Math.sin(time * 8 + i * 0.5) * 0.1; // Quivering animation
            const spikeAngle = angle + quiver;
            const spikeLength = radius * (0.6 + Math.sin(time * 5 + i) * 0.1);
            
            const baseX = (x + Math.cos(angle) * bodyWidth * 0.8) * flipX;
            const baseY = y + Math.sin(angle) * bodyHeight * 0.7;
            const tipX = (x + Math.cos(spikeAngle) * (bodyWidth * 0.8 + spikeLength)) * flipX;
            const tipY = y + Math.sin(spikeAngle) * (bodyHeight * 0.7 + spikeLength);
            
            // Spike gradient
            const spikeGradient = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
            spikeGradient.addColorStop(0, darkColor);
            spikeGradient.addColorStop(0.5, spikeColor);
            spikeGradient.addColorStop(1, '#8b7355');
            
            ctx.fillStyle = spikeGradient;
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 1;
            
            const perpAngle = spikeAngle + Math.PI / 2;
            const spikeWidth = radius * 0.08;
            
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
                baseX + Math.cos(perpAngle) * spikeWidth * flipX,
                baseY + Math.sin(perpAngle) * spikeWidth
            );
            ctx.lineTo(
                baseX - Math.cos(perpAngle) * spikeWidth * flipX,
                baseY - Math.sin(perpAngle) * spikeWidth
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        // Head (lighter colored)
        const headX = (x + bodyWidth * 0.7) * flipX;
        const headY = y + bodyHeight * 0.3;
        const headRadius = radius * 0.5;
        
        const headGradient = ctx.createRadialGradient(
            headX - headRadius * 0.2 * flipX, headY - headRadius * 0.2, 0,
            headX, headY, headRadius
        );
        headGradient.addColorStop(0, '#c9ab88');
        headGradient.addColorStop(0.7, '#a58968');
        headGradient.addColorStop(1, bodyColor);
        
        ctx.fillStyle = headGradient;
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Eye (small black dot)
        const eyeX = (x + bodyWidth * 0.85) * flipX;
        const eyeY = y + bodyHeight * 0.2;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose (small triangle)
        const noseX = (x + bodyWidth * 1.0) * flipX;
        const noseY = y + bodyHeight * 0.35;
        const noseSize = radius * 0.12;
        
        ctx.fillStyle = noseColor;
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(noseX - noseSize * 0.5 * flipX, noseY - noseSize * 0.4);
        ctx.lineTo(noseX - noseSize * 0.5 * flipX, noseY + noseSize * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Feet (tiny ovals at bottom)
        const footY = y + bodyHeight * 0.85;
        const footRadius = radius * 0.15;
        const walkBob = Math.sin(time * 6) * 0.1; // Walking animation
        
        ctx.fillStyle = darkColor;
        // Front foot
        ctx.beginPath();
        ctx.ellipse((x + bodyWidth * 0.4) * flipX, footY + walkBob * radius, footRadius * 1.2, footRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Back foot
        ctx.beginPath();
        ctx.ellipse((x - bodyWidth * 0.2) * flipX, footY - walkBob * radius, footRadius * 1.2, footRadius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Resize handler
     */
    resize(width, height) {
        if (this.textCanvas) {
            this.textCanvas.width = width;
            this.textCanvas.height = height;
        }
    }
}
