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
     * Render goal zone - finish line area (OPTIMIZED)
     */
    render(flag, context) {
        if (!flag) return;

        const time = context.time || 0;
        const canvasHeight = context.canvasHeight || 800;
        
        // Goal zone - much smaller and simpler
        const zoneX = flag.x - 50;
        const zoneHeight = canvasHeight;
        const zoneY = 0;
        
        // Simple checkered pattern (5 columns max instead of 100)
        const checkerSize = 40;
        const cols = 25; // Fixed number instead of calculated
        const rows = Math.ceil(zoneHeight / checkerSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isBlack = (row + col) % 2 === 0;
                const color = isBlack ? [0.1, 0.1, 0.1, 0.8] : [1.0, 1.0, 1.0, 0.8];
                
                this.renderer.drawRect(
                    zoneX + col * checkerSize,
                    zoneY + row * checkerSize,
                    checkerSize,
                    checkerSize,
                    color
                );
            }
        }
        
        // Single border (no animation)
        const borderWidth = 8;
        this.renderer.drawRect(
            zoneX,
            zoneY,
            borderWidth,
            zoneHeight,
            [1.0, 0.8, 0.0, 1.0]
        );
        
        // Simple glow (only 1 layer instead of 3)
        if (!flag.reached) {
            const glowAlpha = 0.3;
            this.renderer.drawRect(
                zoneX - 20,
                zoneY,
                20,
                zoneHeight,
                [1.0, 0.9, 0.2, glowAlpha]
            );
        }
        
        // Only 3 particles instead of 8 (no trigonometry)
        if (!flag.reached) {
            const numParticles = 3;
            for (let i = 0; i < numParticles; i++) {
                const particlePhase = (time * 2 + i * 0.5) % 3;
                const particleX = zoneX + (i * 60) + 30;
                const particleY = zoneHeight - particlePhase * (zoneHeight / 3);
                
                this.renderer.drawCircle(
                    particleX,
                    particleY,
                    5,
                    [1.0, 0.8, 0.2, 1 - (particlePhase / 3)]
                );
            }
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

