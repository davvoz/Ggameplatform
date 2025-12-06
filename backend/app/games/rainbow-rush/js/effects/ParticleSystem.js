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
        // Solo 3 particelle invece di 8
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const speed = 80 + Math.random() * 40;

            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.2, // Vita dimezzata
                maxLife: 0.2,
                size: 2, // Dimensione fissa ridotta
                color: [...projectileColor],
                gravity: 150,
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
        // Solo 4 particelle essenziali
        const particleCount = 4;

        // Colore semplificato
        let particleColor;
        switch (powerupType) {
            case 'immortality':
                particleColor = [1.0, 0.84, 0.0, 1.0];
                break;
            case 'flight':
                particleColor = [0.4, 0.7, 1.0, 1.0];
                break;
            case 'superJump':
                particleColor = [1.0, 0.3, 0.5, 1.0];
                break;
            default:
                particleColor = [1.0, 1.0, 1.0, 1.0];
        }

        // Esplosione minima senza layer
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 120;

            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                gravity: 200,
                life: 0.3, // Vita molto breve
                maxLife: 0.3,
                size: 3, // Dimensione fissa ridotta
                color: particleColor,
                type: 'powerupParticle'
            };

            entityManager.addEntity('powerupParticles', particle);
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
        count = 4; // Solo 4 particelle

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 120;
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.25, // Vita molto breve
                maxLife: 0.25,
                size: 2, // Dimensione fissa
                color: [...color],
                type: 'bonusParticle'
            };
            entityManager.addEntity('powerupParticles', particle);
        }
    }
    /**
     * Create death animation particles - MINIMAL
     */
    createDeathParticles(x, y, playerWidth, playerHeight) {
        const particles = [];
        const particleCount = 4; // Solo 4 particelle

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100;

            particles.push({
                x: x + playerWidth / 2,
                y: y + playerHeight / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: 0.5, // Vita molto breve
                maxLife: 0.5,
                alpha: 1.0,
                size: 3, // Dimensione fissa
                color: [1.0, 0.3, 0.3, 1.0]
            });
        }

        return particles;
    }
}
