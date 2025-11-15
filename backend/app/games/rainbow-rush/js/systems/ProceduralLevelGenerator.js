/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */
export class ProceduralLevelGenerator {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.difficulty = 1;
        this.platformPool = [];
        this.obstaclePool = [];
        this.lastPlatformX = 0;
        this.platformSpacing = { min: 150, max: 300 };
        this.platformWidth = { min: 80, max: 200 };
        this.platformHeight = 20;
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
        this.difficulty = Math.min(level / 10 + 1, 3);
        this.platformSpacing.min = 150 * this.difficulty;
        this.platformSpacing.max = 300 * this.difficulty;
    }

    generatePlatform(x = null) {
        if (x === null) {
            const spacing = this.random(this.platformSpacing.min, this.platformSpacing.max);
            x = this.lastPlatformX + spacing;
        }

        const width = this.random(this.platformWidth.min, this.platformWidth.max);
        const baseY = this.canvasHeight * 0.7;
        const yVariation = this.canvasHeight * 0.3;
        const y = this.random(baseY - yVariation, baseY);
        
        const colorIndex = Math.floor(this.random(0, this.colors.length));
        const color = this.colors[colorIndex];

        const platform = {
            x,
            y,
            width,
            height: this.platformHeight,
            color,
            type: 'platform',
            velocity: -200 * this.difficulty
        };

        this.lastPlatformX = x;
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
            velocity: -200 * this.difficulty
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
            velocity: -200 * this.difficulty,
            value: 10
        };
    }

    shouldGenerateObstacle() {
        return this.random(0, 1) > 0.6;
    }

    shouldGenerateCollectible() {
        return this.random(0, 1) > 0.5;
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
