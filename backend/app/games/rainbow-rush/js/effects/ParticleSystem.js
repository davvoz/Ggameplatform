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
     * Create projectile hit explosion
     */
    createProjectileHitExplosion(x, y, projectileColor, entityManager) {
        // 8 particles in radial pattern
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 80 + Math.random() * 60;
            
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4,
                maxLife: 0.4,
                size: 3 + Math.random() * 2,
                color: [...projectileColor],
                gravity: 150,
                type: 'projectile-hit'
            };
            
            entityManager.addEntity('powerupParticles', particle);
        }
    }

    /**
     * Create boost particles explosion - Ultra minimal
     */
    createBoostExplosion(x, y, entityManager) {
        // 3 particelle cyan minime (ridotto 50% da 6)
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const speed = 80 + Math.random() * 40;
            
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.1,
                maxLife: 0.4,
                size: 2,
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
        const particleCount = 8; // Ridotto 50% da 15
        
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
                life: 0.5 + Math.random() * 0.15, // Vita più breve
                maxLife: 0.65,
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
        
        // Solo sparkles, no explosion ring per performance
        this.createSparkles(x, y, ringColor, 3, entityManager); // Ridotto 50% da 5 a 3
    }

    /**
     * Create explosion ring effect
     */
    createExplosionRing(x, y, color, maxRadius, entityManager) {
        for (let i = 0; i < 5; i++) { // Ridotto 50% da 10 a 5
            const angle = (Math.PI * 2 * i) / 10;
            const particle = {
                x, y,
                vx: Math.cos(angle) * 250,
                vy: Math.sin(angle) * 250,
                life: 0.2, // Vita più breve
                maxLife: 0.2,
                size: 2,
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
                life: 0.4 + Math.random() * 0.2, // Ridotto da 0.5+0.3
                maxLife: 0.6,
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
        count = count || 9; // Ridotto 50% da 18 a 9
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 150 + Math.random() * 150;
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.15, // Vita più breve
                maxLife: 0.55,
                size: 4 + Math.random() * 3,
                color: [...color],
                type: 'bonusParticle',
                glow: true
            };
            entityManager.addEntity('boostParticles', particle);
        }
        
        // Solo 1 explosion ring invece di 2
        this.createExplosionRing(x, y, color, 80, entityManager);
        
        // Ridotte le sparkles del 50% da 6 a 3
        this.createSparkles(x, y, color, 3, entityManager);
    }

    /**
     * Create death animation particles
     */
    createDeathParticles(x, y, playerWidth, playerHeight) {
        const particles = [];
        const particleCount = 6; // Ridotto 50% da 12 a 6
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 80 + Math.random() * 120;
            
            particles.push({
                x: x + playerWidth / 2,
                y: y + playerHeight / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life: 0.9, // Vita breve
                maxLife: 0.9,
                alpha: 1.0,
                size: 3 + Math.random() * 3,
                color: [1.0, 0.3, 0.3, 1.0]
            });
        }
        
        return particles;
    }
}
