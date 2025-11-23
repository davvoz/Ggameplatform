/**
 * GoalFlagRenderer - Renderizza la bandierina del traguardo
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
     * Render goal flag con animazione ondulante
     */
    render(flag, context) {
        if (!flag) return;

        const time = context.time || 0;
        
        // Palo della bandiera (grigio)
        this.renderer.drawRect(
            flag.x - 2,
            flag.y,
            4,
            flag.height,
            [0.4, 0.4, 0.4, 1.0]
        );
        
        // Bandiera a scacchi (come finish line racing)
        const flagWidth = flag.width;
        const flagHeight = flag.height * 0.6;
        const checkerSize = 8;
        
        // Animazione ondulante
        const waveAmplitude = 3;
        const waveFrequency = 4;
        
        for (let row = 0; row < Math.ceil(flagHeight / checkerSize); row++) {
            for (let col = 0; col < Math.ceil(flagWidth / checkerSize); col++) {
                // Pattern a scacchi
                const isBlack = (row + col) % 2 === 0;
                const color = isBlack ? [0.1, 0.1, 0.1, 1.0] : [1.0, 1.0, 1.0, 1.0];
                
                // Offset ondulante per ogni colonna
                const waveOffset = Math.sin(time * waveFrequency + col * 0.5) * waveAmplitude;
                
                const x = flag.x + col * checkerSize;
                const y = flag.y + row * checkerSize + waveOffset;
                
                this.renderer.drawRect(
                    x,
                    y,
                    Math.min(checkerSize, flagWidth - col * checkerSize),
                    Math.min(checkerSize, flagHeight - row * checkerSize),
                    color
                );
            }
        }
        
        // Glow effect se non ancora raggiunta
        if (!flag.reached) {
            const glowAlpha = 0.3 + Math.sin(time * 3) * 0.2;
            const glowColor = [1.0, 0.8, 0.0, glowAlpha];
            
            // Glow intorno alla bandiera
            this.renderer.drawRect(
                flag.x - 5,
                flag.y - 5,
                flagWidth + 10,
                flagHeight + 10,
                glowColor
            );
        }
    }
}
