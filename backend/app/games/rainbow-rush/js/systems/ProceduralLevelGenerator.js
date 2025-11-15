/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */
export class ProceduralLevelGenerator {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.difficulty = 0.3; // Even easier start
        this.platformPool = [];
        this.obstaclePool = [];
        this.lastPlatformX = 0;
        this.lastPlatformY = 0;
        this.platformSpacing = { min: 50, max: 100 }; // Very close
        this.platformWidth = { min: 180, max: 350 }; // Very wide
        this.platformHeight = 20;
        this.maxJumpHeight = 200;
        this.colors = this.generateRainbowColors();
        this.seed = Date.now();
    }

    generateRainbowColors() {
        return [
            [1.0, 0.2, 0.2, 1.0],  // Red
            [1.0, 0.5, 0.0, 1.0],  // Orange
            [1.0, 0.9, 0.0, 1.0],  // Yellow
            [0.2, 0.8, 0.2, 1.0],  // Green
            [0.2, 0.5, 1.0, 1.0],  // Blue
            [0.5, 0.2, 0.8, 1.0],  // Purple
            [1.0, 0.2, 0.8, 1.0]   // Pink
        ];
    }

    setDifficulty(level) {
        // Extremely slow difficulty progression (0.3 to 1.2 over many levels)
        this.difficulty = Math.min(0.3 + level * 0.02, 1.2);
        
        // Very gradual spacing increase
        this.platformSpacing.min = Math.min(50 + (level * 0.8), 90);
        this.platformSpacing.max = Math.min(100 + (level * 1.5), 150);
        
        // Gradual platform width decrease
        this.platformWidth.min = Math.max(120, 180 - level * 1.2);
        this.platformWidth.max = Math.max(200, 350 - level * 2);
        
        // Slightly increase allowed vertical variation with difficulty
        this.maxJumpHeight = 200 + (level * 1);
    }

    generatePlatform(x = null) {
        if (x === null) {
            const spacing = this.random(this.platformSpacing.min, this.platformSpacing.max);
            x = this.lastPlatformX + spacing;
        }

        const width = this.random(this.platformWidth.min, this.platformWidth.max);
        
        // Ensure vertical variation keeps platforms within easy jump reach
        let y;
        if (this.lastPlatformY === 0) {
            // First platform
            const baseY = this.canvasHeight * 0.7;
            y = baseY;
        } else {
            // Subsequent platforms - minimal vertical variation
            const maxYVariation = this.maxJumpHeight * 0.25; // Only 25% of max jump
            const yOffset = this.random(-maxYVariation * 0.5, maxYVariation * 0.5); // Very small range
            y = this.lastPlatformY + yOffset;
            
            // Clamp to playable area
            const minY = this.canvasHeight * 0.4;
            const maxY = this.canvasHeight * 0.8;
            y = Math.max(minY, Math.min(maxY, y));
        }
        
        const colorIndex = Math.floor(this.random(0, this.colors.length));
        const color = this.colors[colorIndex];

        const platform = {
            x,
            y,
            width,
            height: this.platformHeight,
            color,
            type: 'platform',
            velocity: -50 * this.difficulty // Much slower!
        };

        this.lastPlatformX = x;
        this.lastPlatformY = y;
        return platform;
    }

    generateObstacle(platformX, platformY, platformWidth) {
        const obstacleTypes = ['spike', 'enemy'];
        const type = obstacleTypes[Math.floor(this.random(0, obstacleTypes.length))];
        
        const x = platformX + this.random(platformWidth * 0.2, platformWidth * 0.8);
        const y = platformY - 30;
        
        const obstacle = {
            x,
            y,
            width: 20,
            height: 30,
            type,
            color: type === 'spike' ? [0.8, 0.1, 0.1, 1.0] : [0.4, 0.1, 0.6, 1.0],
            velocity: -50 * this.difficulty
        };

        return obstacle;
    }

    generateCollectible(platformX, platformY, platformWidth) {
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 60;
        
        return {
            x,
            y,
            radius: 15,
            type: 'collectible',
            color: [1.0, 0.84, 0.0, 1.0], // Gold
            velocity: -50 * this.difficulty,
            value: 10
        };
    }

    shouldGenerateObstacle() {
        // Almost no obstacles at start (5% at start, up to 30% at high difficulty)
        const threshold = 1.0 - (0.05 + this.difficulty * 0.12);
        return this.random(0, 1) > threshold;
    }

    shouldGenerateCollectible() {
        // Many collectibles at start (80% at start, 50% at high difficulty)
        const threshold = 0.8 - this.difficulty * 0.15;
        return this.random(0, 1) < threshold;
    }

    random(min, max) {
        // Simple pseudo-random using seed for consistency
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const rnd = this.seed / 233280;
        return min + rnd * (max - min);
    }

    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
