/**
 * GoalFlagRenderer - Renderizza la zona goal finale del livello
 */
import { IEntityRenderer } from './IEntityRenderer.js';

export class GoalFlagRenderer extends IEntityRenderer {
    /**
     * @param {WebGLRenderer} renderer - WebGL renderer
     */
    constructor(renderer) {
        super();
        this.renderer = renderer;
    }

    /**
     * Render goal zone - finish line area
     */
    render(flag, context) {
        if (!flag) return;

        const time = context.time || 0;
        const canvasHeight = context.canvasHeight || 800;
        const canvasWidth = context.canvasWidth || 1200;
        
        // Goal zone covers entire height and extends to the right edge of screen
        const zoneX = flag.x - 75; // Start a bit before the flag position
        const zoneWidth = 4000; // Extend far to the right (beyond visible area)
        const zoneHeight = canvasHeight;
        const zoneY = 0;
        
        // Animated checkered pattern background (classic finish line)
        const checkerSize = 40;
        const animOffset = (time * 100) % (checkerSize * 2);
        
        for (let row = 0; row < Math.ceil(zoneHeight / checkerSize); row++) {
            for (let col = 0; col < Math.ceil(zoneWidth / checkerSize); col++) {
                const isBlack = (row + col) % 2 === 0;
                const color = isBlack ? [0.1, 0.1, 0.1, 0.8] : [1.0, 1.0, 1.0, 0.8];
                
                const x = zoneX + col * checkerSize;
                const y = zoneY + row * checkerSize - animOffset;
                
                this.renderer.drawRect(
                    x,
                    y,
                    checkerSize,
                    checkerSize,
                    color
                );
            }
        }
        
        // Left border - bright yellow/gold stripe
        const borderWidth = 8;
        const borderPulse = 0.8 + Math.sin(time * 4) * 0.2;
        this.renderer.drawRect(
            zoneX,
            zoneY,
            borderWidth,
            zoneHeight,
            [1.0 * borderPulse, 0.8 * borderPulse, 0.0, 1.0]
        );
        
        // Right border - bright yellow/gold stripe
        this.renderer.drawRect(
            zoneX + zoneWidth - borderWidth,
            zoneY,
            borderWidth,
            zoneHeight,
            [1.0 * borderPulse, 0.8 * borderPulse, 0.0, 1.0]
        );
        
        // Glow effect if not reached
        if (!flag.reached) {
            const glowAlpha = 0.2 + Math.sin(time * 3) * 0.15;
            
            // Multiple glow layers for depth
            for (let i = 3; i > 0; i--) {
                const glowWidth = 30 * i;
                const alpha = glowAlpha / i;
                
                this.renderer.drawRect(
                    zoneX - glowWidth / 2,
                    zoneY,
                    glowWidth,
                    zoneHeight,
                    [1.0, 0.9, 0.2, alpha]
                );
                
                this.renderer.drawRect(
                    zoneX + zoneWidth - glowWidth / 2,
                    zoneY,
                    glowWidth,
                    zoneHeight,
                    [1.0, 0.9, 0.2, alpha]
                );
            }
        }
        
        // Animated particles/confetti rising from bottom
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
            const particlePhase = (time * 2 + i * 0.5) % 3;
            const particleX = zoneX + (i / numParticles) * zoneWidth + Math.sin(time * 3 + i) * 15;
            const particleY = zoneHeight - particlePhase * (zoneHeight / 3);
            const particleSize = 4 + Math.sin(time * 5 + i) * 2;
            const particleAlpha = 1 - (particlePhase / 3);
            
            // Rainbow colored particles
            const hue = (i / numParticles + time * 0.2) % 1;
            const color = this.hslToRgb(hue, 0.8, 0.6);
            
            this.renderer.drawCircle(
                particleX,
                particleY,
                particleSize,
                [...color, particleAlpha * 0.8]
            );
        }
        
        // "GOAL" text in center (using simple rectangles)
        if (!flag.reached) {
            const textY = zoneHeight / 2;
            const textScale = 1 + Math.sin(time * 4) * 0.1;
            this.drawGoalText(zoneX + zoneWidth / 2, textY, textScale);
        }
    }
    
    /**
     * Draw "GOAL" text using rectangles
     */
    drawGoalText(centerX, centerY, scale) {
        const letterSpacing = 25 * scale;
        const startX = centerX - letterSpacing * 1.5;
        const blockSize = 6 * scale;
        const color = [1.0, 1.0, 1.0, 1.0];
        
        // Draw simple block letters for "GOAL"
        // G
        this.drawBlockLetter('G', startX, centerY, blockSize, color);
        // O
        this.drawBlockLetter('O', startX + letterSpacing, centerY, blockSize, color);
        // A
        this.drawBlockLetter('A', startX + letterSpacing * 2, centerY, blockSize, color);
        // L
        this.drawBlockLetter('L', startX + letterSpacing * 3, centerY, blockSize, color);
    }
    
    /**
     * Draw simple block letters
     */
    drawBlockLetter(letter, x, y, size, color) {
        const height = size * 5;
        const width = size * 3;
        
        switch (letter) {
            case 'G':
                // Vertical left
                this.renderer.drawRect(x, y - height/2, size, height, color);
                // Top horizontal
                this.renderer.drawRect(x, y - height/2, width, size, color);
                // Bottom horizontal
                this.renderer.drawRect(x, y + height/2 - size, width, size, color);
                // Middle horizontal (short)
                this.renderer.drawRect(x + width - size * 2, y, size * 2, size, color);
                // Right bottom
                this.renderer.drawRect(x + width - size, y, size, height/2, color);
                break;
            case 'O':
                // Vertical left
                this.renderer.drawRect(x, y - height/2, size, height, color);
                // Vertical right
                this.renderer.drawRect(x + width - size, y - height/2, size, height, color);
                // Top horizontal
                this.renderer.drawRect(x, y - height/2, width, size, color);
                // Bottom horizontal
                this.renderer.drawRect(x, y + height/2 - size, width, size, color);
                break;
            case 'A':
                // Vertical left
                this.renderer.drawRect(x, y - height/2, size, height, color);
                // Vertical right
                this.renderer.drawRect(x + width - size, y - height/2, size, height, color);
                // Top horizontal
                this.renderer.drawRect(x, y - height/2, width, size, color);
                // Middle horizontal
                this.renderer.drawRect(x, y, width, size, color);
                break;
            case 'L':
                // Vertical left
                this.renderer.drawRect(x, y - height/2, size, height, color);
                // Bottom horizontal
                this.renderer.drawRect(x, y + height/2 - size, width, size, color);
                break;
        }
    }
    
    /**
     * Convert HSL to RGB
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [r, g, b];
    }
}

