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
     * Create projectile hit explosion - ULTRA MINIMAL
     */
    createProjectileHitExplosion(x, y, projectileColor, entityManager) {
        // Solo 2 particelle per massima performance
        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI * 2 * i) / 2;
            const speed = 100;

            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.15,
                maxLife: 0.15,
                size: 2,
                color: projectileColor,
                gravity: 200,
                type: 'projectile-hit'
            };

            entityManager.addEntity('powerupParticles', particle);
        }
    }

    /**
     * Create boost particles explosion - DISABLED for performance
     */
    createBoostExplosion(x, y, entityManager) {
        // NESSUNA particella per massime performance
        return;
    }

    /**
     * Create powerup particles explosion - MINIMAL VERSION
     */
    createPowerupExplosion(x, y, powerupType, entityManager) {
        // Solo 3 particelle per massima performance
        const particleCount = 3;

        // Colore semplificato
        const particleColor = powerupType === 'immortality' ? [1.0, 0.84, 0.0, 1.0] :
                             powerupType === 'flight' ? [0.4, 0.7, 1.0, 1.0] :
                             powerupType === 'superJump' ? [1.0, 0.3, 0.5, 1.0] :
                             [1.0, 1.0, 1.0, 1.0];

        // Esplosione minima
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;

            entityManager.addEntity('powerupParticles', {
                x, y,
                vx: Math.cos(angle) * 120,
                vy: Math.sin(angle) * 120 - 40,
                gravity: 200,
                life: 0.2,
                maxLife: 0.2,
                size: 3,
                color: particleColor,
                type: 'powerupParticle'
            });
        }
    }

    /**
     * Create explosion ring effect - DISABLED
     */
    createExplosionRing(x, y, color, maxRadius, entityManager) {
        // DISABILITATO per performance
        return;
    }


    /**
     * Create sparkle particles - DISABLED
     */
    createSparkles(x, y, color, count, entityManager) {
        // DISABILITATO per performance
        return;
    }


    /**
     * Create bonus explosion (magnet, shield, etc.) - MINIMAL
     */
    createBonusExplosion(x, y, color, count, entityManager) {
        // Solo 3 particelle per massima performance
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            entityManager.addEntity('powerupParticles', {
                x, y,
                vx: Math.cos(angle) * 120,
                vy: Math.sin(angle) * 120,
                life: 0.2,
                maxLife: 0.2,
                size: 2,
                color: color,
                type: 'bonusParticle'
            });
        }
    }
    /**
     * Create death animation particles - MINIMAL
     */
    createDeathParticles(x, y, playerWidth, playerHeight) {
        const particles = [];
        const cx = x + playerWidth / 2;
        const cy = y + playerHeight / 2;

        // Solo 3 particelle per massima performance
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;

            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * 100,
                vy: Math.sin(angle) * 100 - 30,
                life: 0.4,
                maxLife: 0.4,
                alpha: 1.0,
                size: 3,
                color: [1.0, 0.3, 0.3, 1.0]
            });
        }

        return particles;
    }
}
