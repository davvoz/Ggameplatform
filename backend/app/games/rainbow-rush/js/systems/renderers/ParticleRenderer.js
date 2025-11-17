/**
 * ParticleRenderer - Handles particle rendering (powerup, boost, etc.)
 * Single Responsibility: Particle visualization
 */
export class ParticleRenderer {
    constructor(renderer) {
        this.renderer = renderer;
    }

    renderPowerupParticle(particle) {
        const alpha = particle.life / particle.maxLife;
        const color = [...particle.color];
        color[3] *= alpha;
        
        if (particle.shape === 'circle') {
            if (particle.glow) {
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 3.5, [...color, alpha * 0.12]);
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 2.3, [...color, alpha * 0.25]);
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.4, [...color, alpha * 0.4]);
            }
            
            this.renderer.drawCircle(particle.x, particle.y, particle.size, color);
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 0.5, [1.0, 1.0, 1.0, alpha * 0.9]);
        } else {
            if (particle.glow) {
                this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.8, [...color, alpha * 0.3]);
            }
            
            const halfSize = particle.size / 2;
            this.renderer.drawRect(particle.x - halfSize, particle.y - halfSize, particle.size, particle.size, color);
        }
    }

    renderBoostParticle(particle) {
        const alpha = particle.life / particle.maxLife;
        const color = [...particle.color];
        color[3] *= alpha;
        
        if (particle.glow) {
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 4, [...color, alpha * 0.15]);
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 2.5, [...color, alpha * 0.3]);
            this.renderer.drawCircle(particle.x, particle.y, particle.size * 1.5, [...color, alpha * 0.5]);
        }
        
        this.renderer.drawCircle(particle.x, particle.y, particle.size, color);
        this.renderer.drawCircle(particle.x, particle.y, particle.size * 0.4, [1.0, 1.0, 1.0, alpha * 0.8]);
    }
}
