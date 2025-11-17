/**
 * AnimationRenderer - Handles special animations (level-up, combo, death, transitions)
 * Single Responsibility: Animation visualization
 */
import { RenderingUtils } from './RenderingUtils.js';

export class AnimationRenderer {
    constructor(renderer, textCtx, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    renderLevelUpAnimation(animation) {
        if (!animation || !animation.active) return;

        const progress = animation.progress;
        const level = animation.level;
        const easedProgress = RenderingUtils.easeInOut(progress);

        const baseWidth = 200;
        const baseHeight = 60;

        let scale;
        if (progress < 0.2) {
            scale = progress / 0.2;
        } else if (progress < 0.8) {
            scale = 1.0;
        } else {
            scale = 1.0 - (progress - 0.8) / 0.2;
        }

        const width = baseWidth * scale;
        const height = baseHeight * scale;
        const x = 400 - width / 2;
        const y = 200 - height / 2;
        const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1.0 - progress) / 0.2 : 1.0);

        // Rays
        const numRays = 12;
        const rayLength = Math.min(width, height) * 1.5;
        const rotation = (Date.now() % 3000) / 3000 * Math.PI * 2;

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2 + rotation;
            const rayAlpha = alpha * 0.15 * (1 + Math.sin(Date.now() / 200 + i) * 0.3);
            RenderingUtils.drawLine(this.renderer, 400, 200, 
                                   400 + Math.cos(angle) * rayLength, 200 + Math.sin(angle) * rayLength, 
                                   [1.0, 0.9, 0.4, rayAlpha], 2);
        }

        // Badge background
        this.renderer.drawRect(x - 8, y - 8, width + 16, height + 16, [0.05, 0.05, 0.1, alpha * 0.85]);

        // Border
        const borderColor = [1.0, 0.85, 0.3, alpha];
        this.renderer.drawRect(x - 8, y - 8, width + 16, 3, borderColor);
        this.renderer.drawRect(x - 8, y + height + 5, width + 16, 3, borderColor);
        this.renderer.drawRect(x - 8, y - 8, 3, height + 16, borderColor);
        this.renderer.drawRect(x + width + 5, y - 8, 3, height + 16, borderColor);

        // Body
        this.renderer.drawRect(x, y, width, height * 0.5, [1.0, 0.9, 0.3, alpha * 0.9]);
        this.renderer.drawRect(x, y + height * 0.5, width, height * 0.5, [1.0, 0.7, 0.2, alpha * 0.9]);
        this.renderer.drawRect(x, y, width, height * 0.25, [1.0, 1.0, 1.0, alpha * 0.25]);

        // Sparkles
        const numSparkles = 8;
        const sparkleRadius = Math.max(width, height) * 0.5;
        const sparkleRotation = (Date.now() % 2000) / 2000 * Math.PI * 2;

        for (let i = 0; i < numSparkles; i++) {
            const angle = (i / numSparkles) * Math.PI * 2 + sparkleRotation;
            const sparkleX = 400 + Math.cos(angle) * sparkleRadius;
            const sparkleY = 200 + Math.sin(angle) * sparkleRadius;
            const sparkleSize = 4 * scale;
            RenderingUtils.drawStar(this.renderer, sparkleX, sparkleY, sparkleSize, [1.0, 1.0, 0.8, alpha * (0.6 + Math.sin(Date.now() / 150 + i) * 0.4)]);
        }
    }

    renderComboAnimation(animation) {
        if (!animation || !this.textCtx) return;
        
        const alpha = animation.life / animation.maxLife;
        const x = animation.x;
        const y = animation.floatY;
        const fontSize = animation.fontSize * animation.scale;
        
        // Glow
        const glowSize = fontSize * 1.5;
        const glowColor = [...animation.color];
        glowColor[3] = alpha * 0.3 * (0.7 + Math.sin(animation.pulsePhase) * 0.3);
        
        for (let i = 0; i < 3; i++) {
            const size = glowSize + i * 15;
            const layerAlpha = glowColor[3] / (i + 1);
            const layerColor = [...animation.color];
            layerColor[3] = layerAlpha;
            this.renderer.drawCircle(x + 80, y + fontSize/2, size, layerColor);
        }
        
        // Background
        const bgWidth = 180;
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, fontSize + 20, [0.05, 0.05, 0.15, alpha * 0.85]);
        
        // Border
        const borderColor = [...animation.color];
        borderColor[3] = alpha;
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, 3, borderColor);
        this.renderer.drawRect(x - 10, y + fontSize + 7, bgWidth + 20, 3, borderColor);
        
        // Text
        this.textCtx.save();
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.textCtx.textAlign = 'left';
        this.textCtx.textBaseline = 'top';
        this.textCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.textCtx.fillText(animation.text, x + 2, y + 2);
        this.textCtx.fillStyle = `rgb(${animation.color[0] * 255}, ${animation.color[1] * 255}, ${animation.color[2] * 255})`;
        this.textCtx.fillText(animation.text, x, y);
        this.textCtx.restore();
    }

    renderLevelTransition(transition) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Particles
        transition.particles.forEach(p => {
            const alpha = (p.life / p.maxLife) * transition.alpha;
            const pColor = [...p.color];
            pColor[3] = alpha;
            this.renderer.drawCircle(p.x, p.y, p.size, pColor);
        });
        
        // Rays
        transition.rays.forEach(ray => {
            const rayColor = [1.0, 1.0, 0.5, transition.alpha * 0.3];
            for (let i = 0; i < ray.length; i += 20) {
                const x = centerX + Math.cos(ray.angle) * i;
                const y = centerY + Math.sin(ray.angle) * i;
                this.renderer.drawCircle(x, y, 3, rayColor);
            }
        });
        
        // Text
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.translate(centerX, centerY);
            this.textCtx.rotate(transition.rotation * 0.1);
            
            const fontSize = 120 * transition.scale;
            this.textCtx.font = `bold ${fontSize}px Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            this.textCtx.shadowColor = '#fff';
            this.textCtx.shadowBlur = 40 * transition.scale;
            
            const gradient = this.textCtx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFA500');
            gradient.addColorStop(1, '#FF4500');
            
            this.textCtx.fillStyle = gradient;
            this.textCtx.globalAlpha = transition.alpha;
            this.textCtx.fillText(transition.message, 0, 0);
            this.textCtx.strokeStyle = '#fff';
            this.textCtx.lineWidth = 4;
            this.textCtx.strokeText(transition.message, 0, 0);
            this.textCtx.restore();
        }
    }

    renderDeathAnimation(death) {
        // Fade to black
        if (death.fadeAlpha > 0) {
            this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, [0, 0, 0, death.fadeAlpha * 0.7]);
        }
        
        // Death particles
        death.particles.forEach(p => {
            const color = [...p.color];
            color[3] = p.alpha;
            this.renderer.drawCircle(p.x, p.y, p.size, color);
        });
        
        // Player fade
        if (death.playerAlpha > 0 && this.textCtx) {
            this.textCtx.save();
            const centerX = death.playerX + death.playerWidth / 2;
            const centerY = death.playerY + death.playerHeight / 2;
            this.textCtx.translate(centerX, centerY);
            this.textCtx.rotate(death.rotation);
            this.textCtx.scale(death.scale, death.scale);
            this.textCtx.globalAlpha = death.playerAlpha;
            this.textCtx.font = `${death.playerWidth}px Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            this.textCtx.fillText('💀', 0, 0);
            this.textCtx.restore();
        }
        
        // "YOU DIED" text
        if (death.timer > 0.5 && this.textCtx) {
            const textAlpha = Math.min(1.0, (death.timer - 0.5) / 0.8);
            // Font size proporzionale al canvas (10% dell'altezza)
            const fontSize = Math.max(40, Math.min(this.canvasHeight * 0.1, 120));
            const shadowBlur = fontSize / 4;
            const strokeWidth = fontSize / 26;
            
            this.textCtx.save();
            this.textCtx.globalAlpha = textAlpha;
            this.textCtx.shadowColor = '#000';
            this.textCtx.shadowBlur = shadowBlur;
            this.textCtx.font = `bold ${fontSize}px Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            this.textCtx.fillStyle = '#8B0000';
            this.textCtx.fillText('YOU DIED', this.canvasWidth / 2, this.canvasHeight / 2);
            this.textCtx.strokeStyle = '#000';
            this.textCtx.lineWidth = strokeWidth;
            this.textCtx.strokeText('YOU DIED', this.canvasWidth / 2, this.canvasHeight / 2);
            this.textCtx.restore();
        }
    }

    renderScreenFlash(flash) {
        this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, [...flash.color, flash.alpha]);
    }
}
