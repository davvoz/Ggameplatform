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

        const baseWidth = 200;
        const baseHeight = 60;

        // Scala semplice senza fronzoli
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

        // RIMOSSO: Rays animati (troppo pesanti)
        
        // Badge background
        this.renderer.drawRect(x - 8, y - 8, width + 16, height + 16, [0.05, 0.05, 0.1, alpha * 0.85]);

        // Border semplice
        const borderColor = [1.0, 0.85, 0.3, alpha];
        this.renderer.drawRect(x - 8, y - 8, width + 16, 3, borderColor);
        this.renderer.drawRect(x - 8, y + height + 5, width + 16, 3, borderColor);
        this.renderer.drawRect(x - 8, y - 8, 3, height + 16, borderColor);
        this.renderer.drawRect(x + width + 5, y - 8, 3, height + 16, borderColor);

        // Body
        this.renderer.drawRect(x, y, width, height * 0.5, [1.0, 0.9, 0.3, alpha * 0.9]);
        this.renderer.drawRect(x, y + height * 0.5, width, height * 0.5, [1.0, 0.7, 0.2, alpha * 0.9]);
        this.renderer.drawRect(x, y, width, height * 0.25, [1.0, 1.0, 1.0, alpha * 0.25]);

        // RIMOSSO: Sparkles rotanti (troppo pesanti)
    }

    renderComboAnimation(animation) {
        if (!animation || !this.textCtx) return;
        
        const alpha = animation.life / animation.maxLife;
        const x = animation.x;
        const y = animation.floatY;
        const fontSize = animation.fontSize; // Nessuna scala dinamica
        
        // RIMOSSO: Glow multiplo (troppo pesante)
        
        // Background semplice
        const bgWidth = 180;
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, fontSize + 20, [0.05, 0.05, 0.15, alpha * 0.85]);
        
        // Border semplice
        const borderColor = [...animation.color];
        borderColor[3] = alpha;
        this.renderer.drawRect(x - 10, y - 10, bgWidth + 20, 3, borderColor);
        this.renderer.drawRect(x - 10, y + fontSize + 7, bgWidth + 20, 3, borderColor);
        
        // Text senza ombra
        this.textCtx.save();
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.textCtx.textAlign = 'left';
        this.textCtx.textBaseline = 'top';
        this.textCtx.fillStyle = `rgb(${animation.color[0] * 255}, ${animation.color[1] * 255}, ${animation.color[2] * 255})`;
        this.textCtx.fillText(animation.text, x, y);
        this.textCtx.restore();
    }

    renderLevelTransition(transition) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // RIMOSSO: Particles (troppo pesanti)
        
        // RIMOSSO: Rays animati (troppo pesanti)
        
        // Solo il testo
        if (this.textCtx) {
            this.textCtx.save();
            this.textCtx.translate(centerX, centerY);
            
            const fontSize = 120 * transition.scale;
            this.textCtx.font = `bold ${fontSize}px Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            
            // Ombra semplice
            this.textCtx.shadowColor = '#fff';
            this.textCtx.shadowBlur = 20;
            
            // Colore fisso invece di gradient
            this.textCtx.fillStyle = '#FFA500';
            this.textCtx.globalAlpha = transition.alpha;
            this.textCtx.fillText(transition.message, 0, 0);
            
            // Bordo semplice
            this.textCtx.strokeStyle = '#fff';
            this.textCtx.lineWidth = 3;
            this.textCtx.strokeText(transition.message, 0, 0);
            this.textCtx.restore();
        }
    }

    renderDeathAnimation(death) {
        // Fade to black semplice
        if (death.fadeAlpha > 0) {
            this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, [0, 0, 0, death.fadeAlpha * 0.7]);
        }
        
        // Death particles minimali
        death.particles.forEach(p => {
            const color = [...p.color];
            color[3] = p.alpha;
            this.renderer.drawCircle(p.x, p.y, p.size, color);
        });
        
        // RIMOSSO: Player fade con emoji (non necessario)
        
        // "YOU DIED" text - SEMPLIFICATO
        if (this.textCtx) {
            const fadeInTime = 0.2;
            const textAlpha = death.timer < fadeInTime 
                ? Math.min(1.0, death.timer / fadeInTime)
                : 1.0;
            
            const fontSize = Math.max(50, Math.min(this.canvasHeight * 0.12, 140));
            
            this.textCtx.save();
            this.textCtx.globalAlpha = textAlpha;
            this.textCtx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
            
            // Ombra semplice
            this.textCtx.shadowColor = '#8B0000';
            this.textCtx.shadowBlur = 20;
            
            this.textCtx.font = `bold ${fontSize}px Impact, Arial`;
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'middle';
            
            // Colore fisso rosso
            this.textCtx.fillStyle = '#FF0000';
            this.textCtx.fillText('YOU DIED', 0, 0);
            
            // Bordo nero
            this.textCtx.strokeStyle = '#000';
            this.textCtx.lineWidth = 4;
            this.textCtx.strokeText('YOU DIED', 0, 0);
            
            this.textCtx.restore();
        }
    }

    renderScreenFlash(flash) {
        this.renderer.drawRect(0, 0, this.canvasWidth, this.canvasHeight, [...flash.color, flash.alpha]);
    }
}
