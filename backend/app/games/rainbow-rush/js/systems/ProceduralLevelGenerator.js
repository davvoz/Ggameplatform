/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */

// Platform types with different speeds and behaviors
export const PlatformTypes = {
    NORMAL: 'normal',
    FAST: 'fast',
    SLOW: 'slow',
    BOUNCY: 'bouncy',
    CRUMBLING: 'crumbling',
    SPRING: 'spring',
    ICY: 'icy',
    DISSOLVING: 'dissolving',     // Si dissolve quando il player ci sale
    BOUNCING: 'bouncing',          // Oscilla su e giù quando il player ci sale
    ROTATING: 'rotating'            // Ruota quando il player ci sale
};

// Bonus types for collectibles
export const BonusTypes = {
    BOOST: 'boost',
    MAGNET: 'magnet'
};

/**
 * ProceduralLevelGenerator class - Generates entities procedurally
 */
export class ProceduralLevelGenerator {
    constructor() {
        this.obstacleChance = 0.15; // 15% chance di spawn ostacolo
    }

    /**
     * Decide se generare un ostacolo
     */
    shouldGenerateObstacle() {
        return Math.random() < this.obstacleChance;
    }

    /**
     * Genera un ostacolo
     */
    generateObstacle(platformX, platformY, platformWidth, velocity) {
        return {
            x: platformX + platformWidth / 2 - 6,
            y: platformY - 40,
            width: 12,
            height: 20,
            type: 'obstacle',
            obstacleType: 'spike',
            color: [0.8, 0.1, 0.1, 1.0],
            velocity: velocity,
            animationOffset: Math.random() * Math.PI * 2
        };
    }

    /**
     * Decide se generare un collectible
     */
    shouldGenerateCollectible() {
        return Math.random() < 0.3; // 30% chance
    }

    /**
     * Genera un collectible
     */
    generateCollectible(platformX, platformY, platformWidth, velocity) {
        return {
            x: platformX + platformWidth / 2,
            y: platformY - 60,
            width: 20,
            height: 20,
            type: 'collectible',
            value: 10,
            velocity: velocity
        };
    }

    /**
     * Decide se generare un cuore
     */
    shouldGenerateHeart() {
        return Math.random() < 0.05; // 5% chance
    }

    /**
     * Genera un cuore
     */
    generateHeart(platformX, platformY, platformWidth, velocity) {
        return {
            x: platformX + platformWidth / 2,
            y: platformY - 60,
            width: 20,
            height: 20,
            type: 'health',
            value: 1,
            velocity: velocity
        };
    }
}


