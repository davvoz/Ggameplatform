/**
 * UIRenderer - Handles UI elements (floating text, notifications)
 * Single Responsibility: UI visualization
 */

export class UIRenderer {
    constructor(renderer, textCtx, canvasWidth, canvasHeight) {
        this.renderer = renderer;
        this.textCtx = textCtx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    renderFloatingText(text) {
        if (!text || !this.textCtx) {
            console.warn('⚠️ Cannot render floating text:', !text ? 'text is null' : 'textCtx is null');
            return;
        }
        
        console.log('🎨 RENDERING FLOATING TEXT:', text.text, 'at', text.x, text.y, 'scale:', text.scale, 'alpha:', text.alpha);
        
        const alpha = text.alpha || 1.0;
        const scale = text.scale || 1.0;
        const fontSize = (text.fontSize || 48) * scale;
        const rotation = text.rotation || 0;
        const glowIntensity = text.glowIntensity || 1.0;
        
        // Dividi il testo per newline
        const lines = text.text.split('\n');
        const lineHeight = fontSize * 1.2; // Spazio tra le righe
        
        this.textCtx.save();
        
        // Trasforma con rotazione e scala
        this.textCtx.translate(text.x, text.y);
        this.textCtx.rotate(rotation * 0.1); // Rotazione leggera
        this.textCtx.scale(scale, scale);
        
        this.textCtx.globalAlpha = alpha;
        this.textCtx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
        this.textCtx.textAlign = 'center';
        this.textCtx.textBaseline = 'middle';
        
        // Renderizza ogni riga
        lines.forEach((line, index) => {
            const yOffset = (index - (lines.length - 1) / 2) * lineHeight;
            
            // BAGLIORE MULTIPLO EPICO - più layers = più glow
            const glowLayers = 5;
            for (let i = glowLayers; i > 0; i--) {
                const glowSize = (fontSize / 10) * i * glowIntensity;
                const glowAlpha = (alpha * 0.4 * glowIntensity) / i;
                this.textCtx.shadowColor = `rgba(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255}, ${glowAlpha})`;
                this.textCtx.shadowBlur = glowSize;
                this.textCtx.strokeStyle = `rgba(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255}, ${glowAlpha * 0.5})`;
                this.textCtx.lineWidth = i * 2;
                this.textCtx.strokeText(line, 0, yOffset);
            }
            
            // OMBRA NERA FORTE per contrasto
            this.textCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            this.textCtx.shadowBlur = fontSize / 8;
            this.textCtx.shadowOffsetX = 4;
            this.textCtx.shadowOffsetY = 4;
            this.textCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.textCtx.lineWidth = fontSize / 10;
            this.textCtx.strokeText(line, 0, yOffset);
            
            // GRADIENTE per il riempimento
            const gradient = this.textCtx.createLinearGradient(0, yOffset - fontSize/2, 0, yOffset + fontSize/2);
            gradient.addColorStop(0, `rgb(${Math.min(255, text.color[0] * 255 + 80)}, ${Math.min(255, text.color[1] * 255 + 80)}, ${Math.min(255, text.color[2] * 255 + 80)})`);
            gradient.addColorStop(0.5, `rgb(${text.color[0] * 255}, ${text.color[1] * 255}, ${text.color[2] * 255})`);
            gradient.addColorStop(1, `rgb(${text.color[0] * 255 * 0.7}, ${text.color[1] * 255 * 0.7}, ${text.color[2] * 255 * 0.7})`);
            
            this.textCtx.shadowBlur = 0;
            this.textCtx.shadowOffsetX = 0;
            this.textCtx.shadowOffsetY = 0;
            this.textCtx.fillStyle = gradient;
            this.textCtx.fillText(line, 0, yOffset);
            
            // BORDO BIANCO INTERNO per più pop
            this.textCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
            this.textCtx.lineWidth = fontSize / 20;
            this.textCtx.strokeText(line, 0, yOffset);
        });
        
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
