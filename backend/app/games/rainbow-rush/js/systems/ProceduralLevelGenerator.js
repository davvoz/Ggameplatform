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
    CRUMBLING: 'crumbling'
};

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
        this.platformsGenerated = 0;
        this.baseSpeed = 120;
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
        
        // Determine platform type based on difficulty and randomness
        const platformType = this.determinePlatformType();
        
        const colorIndex = Math.floor(this.random(0, this.colors.length));
        const baseColor = this.colors[colorIndex];
        
        // Adjust color and properties based on type
        const platform = this.createTypedPlatform(x, y, width, platformType, baseColor);

        this.lastPlatformX = x;
        this.lastPlatformY = y;
        this.platformsGenerated++;
        
        return platform;
    }
    
    determinePlatformType() {
        // First platforms are always normal
        if (this.platformsGenerated < 5) {
            return PlatformTypes.NORMAL;
        }
        
        const rand = this.random(0, 1);
        const difficultyFactor = Math.min(this.difficulty, 1.0);
        
        // Higher difficulty = more varied platforms
        if (rand < 0.5 - difficultyFactor * 0.1) {
            return PlatformTypes.NORMAL;
        } else if (rand < 0.65) {
            return PlatformTypes.FAST;
        } else if (rand < 0.8) {
            return PlatformTypes.SLOW;
        } else if (rand < 0.9) {
            return PlatformTypes.BOUNCY;
        } else {
            return PlatformTypes.CRUMBLING;
        }
    }
    
    createTypedPlatform(x, y, width, platformType, baseColor) {
        let velocity, color, height;
        
        switch (platformType) {
            case PlatformTypes.FAST:
                velocity = -this.baseSpeed * this.difficulty * 1.6; // 60% faster
                color = [baseColor[0] * 1.2, baseColor[1] * 0.8, baseColor[2] * 0.8, 1.0]; // Reddish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.SLOW:
                velocity = -this.baseSpeed * this.difficulty * 0.6; // 40% slower
                color = [baseColor[0] * 0.8, baseColor[1] * 1.1, baseColor[2] * 1.1, 1.0]; // Blueish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.BOUNCY:
                velocity = -this.baseSpeed * this.difficulty;
                color = [baseColor[0], baseColor[1] * 1.2, baseColor[2] * 0.9, 1.0]; // Greenish tint
                height = this.platformHeight;
                break;
                
            case PlatformTypes.CRUMBLING:
                velocity = -this.baseSpeed * this.difficulty * 0.8;
                color = [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7, 1.0]; // Grayish
                height = this.platformHeight;
                break;
                
            default: // NORMAL
                velocity = -this.baseSpeed * this.difficulty;
                color = baseColor;
                height = this.platformHeight;
        }
        
        return {
            x,
            y,
            width,
            height,
            color,
            type: 'platform',
            platformType,
            velocity,
            originalVelocity: velocity,
            bounceMultiplier: platformType === PlatformTypes.BOUNCY ? 1.3 : 1.0,
            crumbleTimer: 0,
            crumbleDuration: 1.0, // 1 second before crumbling
            isCrumbling: false
        };
    }

    generateObstacle(platformX, platformY, platformWidth, platformVelocity) {
        const obstacleTypes = ['spike', 'enemy'];
        const type = obstacleTypes[Math.floor(this.random(0, obstacleTypes.length))];
        
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 20; // Even lower
        
        const obstacle = {
            x,
            y,
            width: 12,
            height: 20,
            type,
            color: type === 'spike' ? [0.8, 0.1, 0.1, 1.0] : [0.4, 0.1, 0.6, 1.0],
            velocity: platformVelocity, // Match platform speed
            animationOffset: Math.random() * Math.PI * 2
        };

        return obstacle;
    }

    generateCollectible(platformX, platformY, platformWidth, platformVelocity) {
        const x = platformX + this.random(platformWidth * 0.3, platformWidth * 0.7);
        const y = platformY - 60;
        
        return {
            x,
            y,
            radius: 15,
            type: 'collectible',
            color: [1.0, 0.84, 0.0, 1.0], // Gold
            velocity: platformVelocity, // Match platform speed
            value: 10,
            pulsePhase: Math.random() * Math.PI * 2
        };
    }
    
    getPlatformsGenerated() {
        return this.platformsGenerated;
    }
    
    resetPlatformCount() {
        this.platformsGenerated = 0;
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
