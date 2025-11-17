/**
 * UIRenderer - Handles UI elements (floating text, notifications)
 * Single Responsibility: UI visualization
 */
import { RenderingUtils } from './RenderingUtils.js';

export class UIRenderer {
    constructor(renderer, textCtx, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    renderFloatingText(text) {
        if (!text || !this.textCtx) return;
        
        const alpha = text.alpha;
        const fontSize = text.fontSize;
        
        this.textCtx.save();
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.textCtx.textAlign = 'center';
        this.textCtx.textBaseline = 'middle';
        this.textCtx.shadowColor = `rgba(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255}, ${alpha * 0.8})`;
        this.textCtx.shadowBlur = 10;
        this.textCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.textCtx.fillText(text.text, text.x + 2, text.y + 2);
        this.textCtx.shadowBlur = 0;
        this.textCtx.fillStyle = `rgb(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255})`;
        this.textCtx.fillText(text.text, text.x, text.y);
        this.textCtx.restore();
    }

    renderAchievementNotifications(notifications) {
        if (!notifications || !this.textCtx) return;
        
        const startY = 120;
        const spacing = 70;
        const time = Date.now() / 1000;
        
        notifications.forEach((notif, index) => {
            const y = startY + index * spacing;
            const alpha = notif.alpha;
            
            let textColor, glowColor;
            switch(notif.type) {
                case 'achievement':
                    textColor = 'rgb(255, 215, 0)';
                    glowColor = [1.0, 0.84, 0.0, alpha];
                    break;
                case 'warning':
                    textColor = 'rgb(255, 77, 77)';
                    glowColor = [1.0, 0.3, 0.3, alpha];
                    break;
                case 'streak':
                    textColor = 'rgb(255, 128, 0)';
                    glowColor = [1.0, 0.5, 0.0, alpha];
                    break;
                default:
                    textColor = 'rgb(51, 153, 255)';
                    glowColor = [0.2, 0.6, 1.0, alpha];
            }
            
            const boxX = this.canvasWidth - 400;
            
            this.textCtx.save();
            this.textCtx.globalAlpha = alpha;
            this.textCtx.shadowColor = textColor;
            this.textCtx.shadowBlur = 20;
            this.textCtx.font = 'bold 26px Arial, sans-serif';
            this.textCtx.fillStyle = textColor;
            this.textCtx.textAlign = 'right';
            this.textCtx.fillText(notif.title, boxX + 350, y);
            this.textCtx.font = '18px Arial, sans-serif';
            this.textCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.textCtx.shadowBlur = 10;
            this.textCtx.fillText(notif.message, boxX + 350, y + 30);
            this.textCtx.restore();
            
            // Sparkles for achievements/streaks
            if (notif.type === 'achievement' || notif.type === 'streak') {
                const numParticles = notif.type === 'achievement' ? 12 : 8;
                for (let i = 0; i < numParticles; i++) {
                    const angle = (i / numParticles) * Math.PI * 2 + time * 2.5;
                    const radius = 30 + Math.sin(time * 3 + i) * 8;
                    const px = boxX + 20 + Math.cos(angle) * radius;
                    const py = y + 15 + Math.sin(angle) * radius;
                    const size = 2.5 + Math.sin(time * 4 + i) * 1.5;
                    const color = [...glowColor];
                    color[3] = alpha * (0.6 + Math.sin(time * 5 + i) * 0.4);
                    this.renderer.drawCircle(px, py, size, color);
                }
            }
            
            // Decorative line
            const lineWidth = 300 * alpha;
            const lineX = boxX + 350 - lineWidth;
            this.renderer.drawRect(lineX, y + 45, lineWidth, 2, [...glowColor, alpha * 0.5]);
        });
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
