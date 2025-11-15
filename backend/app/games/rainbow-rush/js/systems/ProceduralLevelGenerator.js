/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */
export class ProceduralLevelGenerator {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.difficulty = 0.6; // Balanced start
        this.platformPool = [];
        this.obstaclePool = [];
        this.lastPlatformX = 0;
        this.lastPlatformY = 0;
        this.platformSpacing = { min: 70, max: 140 }; // Medium spacing
        this.platformWidth = { min: 150, max: 280 }; // Good width
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
        
        // Ensure platforms don't overlap vertically
        let y;
        if (this.lastPlatformY === 0) {
            // First platform
            const baseY = this.canvasHeight * 0.65;
            y = baseY;
        } else {
            // Subsequent platforms - vary significantly to avoid overlap
            const maxYVariation = 120; // Fixed pixel variation
            const yOffset = this.random(-maxYVariation, maxYVariation);
            y = this.lastPlatformY + yOffset;
            
            // Clamp to playable area
            const minY = this.canvasHeight * 0.25;
            const maxY = this.canvasHeight * 0.75;
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
            velocity: -120 * this.difficulty // Better speed!
        };

        this.lastPlatformX = x;
        this.lastPlatformY = y;
        return platform;
    }

    generateObstacle(platformX, platformY, platformWidth) {
        const obstacleTypes = ['spike', 'enemy'];
        const type = obstacleTypes[Math.floor(this.random(0, obstacleTypes.length))];
        
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 20; // Even lower
        
        const obstacle = {
            x,
            y,
            width: 12, // Reduced from 15
            height: 20, // Reduced from 25
            type,
            color: type === 'spike' ? [0.8, 0.1, 0.1, 1.0] : [0.4, 0.1, 0.6, 1.0],
            velocity: -120 * this.difficulty
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
            velocity: -120 * this.difficulty,
            value: 10
        };
    }

    shouldGenerateObstacle() {
        // Gradual obstacles (20% at start, up to 40% at high difficulty)
        const threshold = 1.0 - (0.2 + this.difficulty * 0.2);
        return this.random(0, 1) > threshold;
    }

    shouldGenerateCollectible() {
        // Many collectibles at start (70% at start, 50% at high difficulty)
        const threshold = 0.7 - this.difficulty * 0.2;
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
