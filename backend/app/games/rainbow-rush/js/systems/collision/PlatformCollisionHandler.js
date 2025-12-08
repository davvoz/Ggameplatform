import { CollisionHandler } from './CollisionHandler.js';

/**
 * PlatformCollisionHandler - Handles platform collisions
 * Single Responsibility: Platform collision detection and landing logic
 */
export class PlatformCollisionHandler extends CollisionHandler {
    constructor(context) {
        super(context);
        // Cache per sorting piattaforme
        this.platformSortCache = [];
        this.lastPlayerY = 0;
        this.sortThreshold = 50; // Risortare solo se il player si muove di 50px in verticale
    }

    /**
     * Handle platform collisions
     * @param {EntityManager} entityManager
     * @returns {null}
     */
    handle(entityManager) {
        const platforms = entityManager.getEntities('platforms');
        const playerBottom = this.context.player.y + this.context.player.height;

        // Usa cache se il player non si è mosso troppo in verticale
        const playerYDelta = Math.abs(this.context.player.y - this.lastPlayerY);
        let sortedPlatforms;

        if (playerYDelta > this.sortThreshold || this.platformSortCache.length !== platforms.length) {
            // Risortare solo quando necessario
            sortedPlatforms = platforms.slice().sort((a, b) => {
                const distA = Math.abs(playerBottom - a.y);
                const distB = Math.abs(playerBottom - b.y);
                return distA - distB;
            });
            this.platformSortCache = sortedPlatforms;
            this.lastPlayerY = this.context.player.y;
        } else {
            sortedPlatforms = this.platformSortCache;
        }

        // Check collision only with the closest platform
        for (const platform of sortedPlatforms) {
            const wasGrounded = this.context.player.grounded;
            const landed = this.context.player.checkPlatformCollision(platform);

            if (landed) {
                if (!wasGrounded) {
                    this.context.achievementSystem.recordNormalLanding();
                    this.context.achievementSystem.checkAchievements();
                }
                // Stop checking other platforms once we've landed on one
                break;
            }
        }

        return null;
    }
}
