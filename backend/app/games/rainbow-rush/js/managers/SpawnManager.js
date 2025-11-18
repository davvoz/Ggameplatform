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
        this.platformInterval = 0.75; // Spawn ancora più frequente
        this.platformCounter = 0;
        this.platformsPerLevel = 20; // Più piattaforme per livello = progressione più lenta

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
        
        this.flightBonusTimer = 0;
        this.flightBonusInterval = 22; // Ogni 22 secondi
        
        this.rechargeBonusTimer = 0;
        this.rechargeBonusInterval = 30; // Ogni 30 secondi
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
        
        this.flightBonusTimer += deltaTime;
        if (this.flightBonusTimer >= this.flightBonusInterval) {
            this.spawnFlightBonus();
            this.flightBonusTimer = 0;
        }
        
        this.rechargeBonusTimer += deltaTime;
        if (this.rechargeBonusTimer >= this.rechargeBonusInterval) {
            this.spawnRechargeBonus();
            this.rechargeBonusTimer = 0;
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
            
            // Get colors, duration, and cooldown based on powerup type
            let color, glowColor, duration, cooldown;
            switch (randomType) {
                case 'immortality':
                    color = [1.0, 0.84, 0.0, 1.0]; // Gold
                    glowColor = [1.0, 0.95, 0.6, 0.8];
                    duration = 5000; // 5 seconds
                    cooldown = 15000; // 15 seconds
                    break;
                case 'flight':
                    color = [0.4, 0.7, 1.0, 1.0]; // Light blue
                    glowColor = [0.6, 0.85, 1.0, 0.8];
                    duration = 4000; // 4 seconds
                    cooldown = 20000; // 20 seconds
                    break;
                case 'superJump':
                    color = [1.0, 0.3, 0.5, 1.0]; // Pink
                    glowColor = [1.0, 0.5, 0.7, 0.8];
                    duration = 6000; // 6 seconds
                    cooldown = 12000; // 12 seconds
                    break;
                default:
                    color = [1.0, 1.0, 1.0, 1.0];
                    glowColor = [1.0, 1.0, 1.0, 0.8];
                    duration = 5000;
                    cooldown = 15000;
            }
            
            // Create powerup object with duration and cooldown
            const powerup = {
                x: platform.x + platform.width / 2,
                y: platform.y - 80,
                width: 40,
                height: 40,
                radius: 20,
                type: 'powerup',
                powerupType: randomType,
                velocity: platform.velocity,
                pulsePhase: 0,
                rotation: 0,
                rotationAngle: 0,
                particleTimer: 0,
                color: color,
                glowColor: glowColor,
                duration: duration,
                cooldown: cooldown
            };
            
            this.entityManager.addEntity('powerups', powerup);
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
     * Spawn recharge bonus (resets safety platform cooldown)
     */
    spawnRechargeBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('rechargeBonuses', {
            x, y,
            width: 42,
            height: 42,
            velocity: -200,
            type: 'recharge',
            rotation: 0,
            color: [0.2, 1.0, 0.4, 1.0], // Verde elettrico
            glowColor: [0.4, 1.0, 0.6, 0.8],
            pulsePhase: 0,
            radius: 21,
            energyPhase: 0, // Fase energia interna
            orbitPhase: 0 // Fase orbita particelle
        });
    }
    
    /**
     * Spawn flight bonus (instant flight power)
     */
    spawnFlightBonus() {
        const x = this.dims.width + 50;
        const y = 100 + Math.random() * (this.dims.height - 300);

        this.entityManager.addEntity('flightBonuses', {
            x, y,
            width: 38,
            height: 38,
            velocity: -200,
            type: 'instantflight',
            rotation: 0,
            color: [0.6, 0.9, 1.0, 1.0], // Azzurro chiaro
            glowColor: [0.8, 1.0, 1.0, 0.7],
            pulsePhase: 0,
            radius: 19,
            wingPhase: 0 // Per animazione ali
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
