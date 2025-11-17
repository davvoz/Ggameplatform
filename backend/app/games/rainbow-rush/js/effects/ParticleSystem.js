/**
 * ParticleSystem - Unified particle management for all visual effects
 * Handles boost/powerup/death particles, explosions, sparkles, trails
 */
export class ParticleSystem {
    constructor() {
        // Particle collections managed by EntityManager
        // This class provides creation methods
    }

    /**
     * Create boost particles explosion - Simple and elegant
     */
    createBoostExplosion(x, y, entityManager) {
        // 15 particelle cyan piccole e semplici
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const speed = 100 + Math.random() * 60;
            
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.2,
                maxLife: 0.7,
                size: 2 + Math.random() * 1,
                color: [0.0, 0.85, 1.0, 1.0],
                type: 'boostParticle',
                glow: true
            };
            
            entityManager.addEntity('boostParticles', particle);
        }
    }

    /**
     * Create powerup particles explosion
     */
    createPowerupExplosion(x, y, powerupType, entityManager) {
        const particleCount = 60;
        
        // Get powerup-specific colors
        let particleColors = [];
        let ringColor = [];
        
        switch (powerupType) {
            case 'immortality':
                particleColors = [
                    [1.0, 0.84, 0.0, 1.0],
                    [1.0, 0.95, 0.6, 1.0],
                    [1.0, 0.75, 0.0, 1.0],
                    [1.0, 1.0, 0.3, 1.0]
                ];
                ringColor = [1.0, 0.84, 0.0, 1.0];
                break;
            case 'flight':
                particleColors = [
                    [0.4, 0.7, 1.0, 1.0],
                    [0.6, 0.85, 1.0, 1.0],
                    [0.3, 0.6, 0.9, 1.0],
                    [0.5, 0.9, 1.0, 1.0]
                ];
                ringColor = [0.4, 0.7, 1.0, 1.0];
                break;
            case 'superJump':
                particleColors = [
                    [1.0, 0.3, 0.5, 1.0],
                    [1.0, 0.5, 0.7, 1.0],
                    [1.0, 0.2, 0.4, 1.0],
                    [1.0, 0.4, 0.8, 1.0]
                ];
                ringColor = [1.0, 0.3, 0.5, 1.0];
                break;
            default:
                particleColors = [[1.0, 1.0, 1.0, 1.0]];
                ringColor = [1.0, 1.0, 1.0, 1.0];
        }
        
        // Multi-layer explosion
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const layer = Math.floor(i / (particleCount / 3));
            const speed = 120 + Math.random() * 180 + layer * 40;
            const size = 4 + Math.random() * 6;
            
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                gravity: 200,
                life: 1.0 + Math.random() * 0.5,
                maxLife: 1.5,
                size: size,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 12,
                type: 'powerupParticle',
                shape: Math.random() > 0.5 ? 'circle' : 'square',
                glow: true
            };
            
            entityManager.addEntity('powerupParticles', particle);
        }
        
        // Add explosion ring and sparkles
        this.createExplosionRing(x, y, ringColor, 100, entityManager);
        this.createSparkles(x, y, ringColor, 20, entityManager);
    }

    /**
     * Create explosion ring effect
     */
    createExplosionRing(x, y, color, maxRadius, entityManager) {
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const particle = {
                x, y,
                vx: Math.cos(angle) * 300,
                vy: Math.sin(angle) * 300,
                life: 0.3,
                maxLife: 0.3,
                size: 3,
                color: [...color],
                type: 'ringParticle',
                glow: true
            };
            entityManager.addEntity('boostParticles', particle);
        }
    }

    /**
     * Create sparkle particles
     */
    createSparkles(x, y, color, count, entityManager) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                gravity: 150,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                size: 2 + Math.random() * 3,
                color: [...color],
                type: 'sparkle',
                glow: true
            };
            entityManager.addEntity('powerupParticles', particle);
        }
    }

    /**
     * Create bonus explosion (magnet, shield, etc.)
     */
    createBonusExplosion(x, y, color, count, entityManager) {
        count = count || 80;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 200 + Math.random() * 200;
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + Math.random() * 0.4,
                maxLife: 1.2,
                size: 5 + Math.random() * 4,
                color: [...color],
                type: 'bonusParticle',
                glow: true
            };
            entityManager.addEntity('boostParticles', particle);
        }
        
        // Multiple explosion rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createExplosionRing(x, y, color, 80 + i * 20, entityManager);
            }, i * 100);
        }
        
        // Super sparkles
        this.createSparkles(x, y, color, 30, entityManager);
    }

    /**
     * Create death animation particles
     */
    createDeathParticles(x, y, playerWidth, playerHeight) {
        const particles = [];
        const particleCount = 40;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + Math.random() * 150;
            
            particles.push({
                x: x + playerWidth / 2,
                y: y + playerHeight / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 1.5,
                maxLife: 1.5,
                alpha: 1.0,
                size: 3 + Math.random() * 4,
                color: [1.0, 0.3, 0.3, 1.0]
            });
        }
        
        return particles;
    }
}
