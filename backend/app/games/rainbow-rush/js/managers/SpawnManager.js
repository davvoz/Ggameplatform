/**
 * SpawnManager - Unified spawn timing system for all entity types
 * Consolidates 10+ spawn timers and methods into a single configurable system
 */
export class SpawnManager {
    constructor(levelGenerator, entityManager, canvasDimensions) {
        this.levelGenerator = levelGenerator;
        this.entityManager = entityManager;
        this.dims = canvasDimensions;

        // Spawn timers
        this.platformTimer = 0;
        this.platformInterval = 1.5;
        this.platformCounter = 0;
        this.platformsPerLevel = 15;

        this.powerupTimer = 0;
        this.powerupInterval = 8;

        this.magnetTimer = 0;
        this.magnetInterval = 15;

        this.timeSlowTimer = 0;
        this.timeSlowInterval = 20;

        this.shieldTimer = 0;
        this.shieldInterval = 18;

        this.multiplierTimer = 0;
        this.multiplierInterval = 25;

        this.rainbowTimer = 0;
        this.rainbowInterval = 40;
    }

    /**
     * Update all spawn timers
     */
    update(deltaTime, scoreSystem) {
        this.updatePlatformSpawning(deltaTime, scoreSystem);
        this.updatePowerupSpawning(deltaTime);
        this.updateBonusSpawning(deltaTime);
    }

    /**
     * Update platform spawning logic
     */
    updatePlatformSpawning(deltaTime, scoreSystem) {
        this.platformTimer += deltaTime;

        // Normal spawn every interval
        if (this.platformTimer >= this.platformInterval) {
            this.spawnPlatform(scoreSystem);
            this.platformTimer = 0;
        } else {
            // Emergency check to ensure minimum 3 platforms (only every 0.5s)
            if (this.platformTimer % 0.5 < deltaTime) {
                const visibleCount = this.entityManager.getVisiblePlatformCount(this.dims.width);
                
                // Emergency spawn if less than 3 visible platforms
                if (visibleCount < 3) {
                    this.spawnPlatform(scoreSystem);
                    this.platformTimer = 0;
                }
            }
        }
    }

    /**
     * Update powerup spawning
     */
    updatePowerupSpawning(deltaTime) {
        this.powerupTimer += deltaTime;
        if (this.powerupTimer >= this.powerupInterval) {
            this.spawnPowerup();
            this.powerupTimer = 0;
        }
    }

    /**
     * Update bonus item spawning
     */
    updateBonusSpawning(deltaTime) {
        this.magnetTimer += deltaTime;
        if (this.magnetTimer >= this.magnetInterval) {
            this.spawnMagnetBonus();
            this.magnetTimer = 0;
        }

        this.timeSlowTimer += deltaTime;
        if (this.timeSlowTimer >= this.timeSlowInterval) {
            this.spawnTimeSlowBonus();
            this.timeSlowTimer = 0;
        }

        this.shieldTimer += deltaTime;
        if (this.shieldTimer >= this.shieldInterval) {
            this.spawnShieldBonus();
            this.shieldTimer = 0;
        }

        this.multiplierTimer += deltaTime;
        if (this.multiplierTimer >= this.multiplierInterval) {
            this.spawnMultiplierBonus();
            this.multiplierTimer = 0;
        }

        this.rainbowTimer += deltaTime;
        if (this.rainbowTimer >= this.rainbowInterval) {
            this.spawnRainbowBonus();
            this.rainbowTimer = 0;
        }
    }

    /**
     * Spawn a new platform with obstacles and collectibles
     */
    spawnPlatform(scoreSystem) {
        const platform = this.levelGenerator.generatePlatform();
        this.entityManager.addEntity('platforms', platform);
        this.platformCounter++;

        // Level up based on platform count
        if (this.platformCounter >= this.platformsPerLevel) {
            scoreSystem.levelUp();
            this.platformCounter = 0;
        }

        // Maybe spawn obstacle (but not on bouncy platforms)
        if (platform.platformType !== 'BOUNCY' && this.levelGenerator.shouldGenerateObstacle()) {
            const obstacle = this.levelGenerator.generateObstacle(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.entityManager.addEntity('obstacles', obstacle);
        }

        // Maybe spawn collectible
        if (this.levelGenerator.shouldGenerateCollectible()) {
            const collectible = this.levelGenerator.generateCollectible(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.entityManager.addEntity('collectibles', collectible);
        }

        // Maybe spawn heart
        if (this.levelGenerator.shouldGenerateHeart()) {
            const heart = this.levelGenerator.generateHeart(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.entityManager.addEntity('hearts', heart);
        }

        // Maybe spawn boost (not on bouncy or spring)
        if (platform.platformType !== 'BOUNCY' && 
            platform.platformType !== 'SPRING' && 
            this.levelGenerator.shouldGenerateBoost()) {
            const boost = this.levelGenerator.generateBoost(
                platform.x, platform.y, platform.width, platform.velocity
            );
            this.entityManager.addEntity('boosts', boost);
        }
    }

    /**
     * Spawn a powerup
     */
    spawnPowerup() {
        // Choose random powerup type
        const types = ['immortality', 'flight', 'superJump'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // Find a platform to spawn on
        const validPlatforms = this.entityManager.getEntities('platforms').filter(p =>
            p.x > this.dims.width * 0.3 && p.x < this.dims.width * 0.8
        );

        if (validPlatforms.length > 0) {
            const platform = validPlatforms[Math.floor(Math.random() * validPlatforms.length)];
            
            // Import Powerup class dynamically
            import('../entities/Powerup.js').then(({ Powerup }) => {
                const powerup = new Powerup(
                    platform.x + platform.width / 2,
                    platform.y - 80,
                    randomType
                );
                powerup.entityType = 'powerup';
                powerup.powerupType = randomType;
                powerup.velocity = platform.velocity;
                this.entityManager.addEntity('powerups', powerup);
            });
        }
    }

    /**
     * Spawn magnet bonus
     */
    spawnMagnetBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('magnetBonuses', {
            x, y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'magnet',
            rotation: 0,
            color: [1.0, 0.0, 1.0, 1.0],
            glowColor: [1.0, 0.5, 1.0, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }

    /**
     * Spawn time slow bonus
     */
    spawnTimeSlowBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('timeBonuses', {
            x, y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'timeslow',
            rotation: 0,
            color: [0.5, 0.5, 1.0, 1.0],
            glowColor: [0.7, 0.7, 1.0, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }

    /**
     * Spawn shield bonus
     */
    spawnShieldBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('shieldBonuses', {
            x, y,
            width: 35,
            height: 35,
            velocity: -200,
            type: 'shield',
            rotation: 0,
            color: [0.0, 1.0, 0.5, 1.0],
            glowColor: [0.3, 1.0, 0.7, 0.6],
            pulsePhase: 0,
            radius: 17.5
        });
    }

    /**
     * Spawn multiplier bonus
     */
    spawnMultiplierBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('multiplierBonuses', {
            x, y,
            width: 40,
            height: 40,
            velocity: -200,
            type: 'multiplier',
            rotation: 0,
            color: [1.0, 0.8, 0.0, 1.0],
            glowColor: [1.0, 0.9, 0.3, 0.6],
            pulsePhase: 0,
            radius: 20
        });
    }

    /**
     * Spawn rainbow bonus
     */
    spawnRainbowBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('rainbowBonuses', {
            x, y,
            width: 45,
            height: 45,
            velocity: -200,
            type: 'rainbow',
            rotation: 0,
            rainbowPhase: 0,
            pulsePhase: 0,
            particles: [],
            radius: 22.5
        });
    }

    /**
     * Reset all timers
     */
    reset() {
        this.platformTimer = 0;
        this.platformCounter = 0;
        this.powerupTimer = 0;
        this.magnetTimer = 0;
        this.timeSlowTimer = 0;
        this.shieldTimer = 0;
        this.multiplierTimer = 0;
        this.rainbowTimer = 0;
    }
}
