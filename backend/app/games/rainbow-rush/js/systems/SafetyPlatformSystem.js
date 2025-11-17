/**
 * SafetyPlatformSystem - Manages the emergency rescue platform with 4-charge system
 * Handles charge tracking, rescue platform spawning with 5 patterns, dissolve/recharge logic
 */
export class SafetyPlatformSystem {
    constructor(canvasDimensions) {
        this.dims = canvasDimensions;
        
        // Safety platform entity
        this.platform = null;
        
        // Charge system
        this.charges = 4;
        this.maxCharges = 4;
        this.useWindow = 15; // 15 seconds window for 4 uses
        this.useTimes = []; // Track recent uses
        
        // State tracking
        this.active = true;
        this.dissolving = false;
        this.dissolveProgress = 0;
        this.recharging = false;
        this.rechargeTimer = 0;
        
        // Timing constants
        this.dissolveDuration = 2.5; // 2.5 seconds on platform before dissolve
        this.respawnTime = 5.0; // 5 seconds to recharge
        this.autoDissolveSpeed = 0.02; // Slow automatic dissolve
        
        // Player interaction tracking
        this.playerOnPlatform = false;
        this.playerOnPlatformTimer = 0;
        
        // Rescue platform spawning
        this.rescuePlatformSpawnTimer = 0;
        this.rescuePlatformSpawnInterval = 2.0;
        this.hasSpawnedFirstRescue = false;
        
        this.timer = 0;
        
        this.initialize();
    }

    /**
     * Initialize the safety platform
     */
    initialize() {
        this.platform = {
            x: this.dims.width / 2 - 200,
            y: this.dims.height - 60,
            width: 400,
            height: 20,
            color: [0.2, 0.8, 0.4, 1.0], // Green safety color
            type: 'safetyPlatform',
            velocity: 0,
            platformType: 'safety'
        };
    }

    /**
     * Update safety platform system
     */
    update(deltaTime, playerOnPlatform, entityManager, scoreSystem) {
        this.playerOnPlatform = playerOnPlatform;
        
        const currentTime = Date.now() / 1000;
        
        // FULL RECHARGE EVERY 15 SECONDS
        // Check if oldest use is beyond 15 seconds window
        if (this.useTimes.length > 0) {
            const oldestUse = this.useTimes[0];
            if ((currentTime - oldestUse) >= this.useWindow) {
                // 15 seconds passed, reset ALL charges
                this.useTimes = [];
                this.charges = this.maxCharges;
            }
        }

        // Check if platform is currently being used (even if charges are 0)
        const platformInUse = this.dissolving || (this.playerOnPlatform && this.hasSpawnedFirstRescue);

        // Normal platform logic when has charges OR platform is dissolving current use
        if (this.charges > 0 || platformInUse) {
            if (this.playerOnPlatform) {
                // Spawn rescue platforms immediately on first landing (only if we have charges)
                if (!this.hasSpawnedFirstRescue && this.charges > 0) {
                    this.spawnRescuePlatforms(entityManager, scoreSystem);
                    this.hasSpawnedFirstRescue = true;
                    this.rescuePlatformSpawnTimer = 0;
                    
                    // Consume a charge on first landing
                    this.useTimes.push(currentTime);
                    this.charges = this.maxCharges - this.useTimes.length;
                }

                this.playerOnPlatformTimer += deltaTime;
                this.rescuePlatformSpawnTimer += deltaTime;

                // Spawn rescue platforms every interval while on platform
                if (this.rescuePlatformSpawnTimer >= this.rescuePlatformSpawnInterval) {
                    this.spawnRescuePlatforms(entityManager, scoreSystem);
                    this.rescuePlatformSpawnTimer = 0;
                }

                // Dissolve platform after 2.5 seconds
                if (this.playerOnPlatformTimer >= this.dissolveDuration) {
                    this.dissolving = true;
                }
            } else {
                // Reset when player leaves (only if not dissolving)
                if (!this.dissolving) {
                    this.playerOnPlatformTimer = 0;
                    this.rescuePlatformSpawnTimer = 0;
                    this.hasSpawnedFirstRescue = false;
                }
            }

            // Handle dissolving animation
            if (this.dissolving) {
                const dissolveSpeed = this.playerOnPlatform ? 2.0 : this.autoDissolveSpeed;
                this.dissolveProgress += deltaTime * dissolveSpeed;

                if (this.dissolveProgress >= 1.0) {
                    // Platform fully dissolved
                    this.active = false;
                    this.dissolving = false;
                    this.dissolveProgress = 0;
                    this.timer = 0;
                    this.playerOnPlatformTimer = 0;
                    this.rescuePlatformSpawnTimer = 0;
                    this.hasSpawnedFirstRescue = false;
                }
            }
            
            // Platform visible if not fully dissolved
            this.active = !this.dissolving || this.dissolveProgress < 1.0;
        } else {
            // No charges available and not in use - platform invisible
            this.active = false;
            this.dissolving = false;
            this.dissolveProgress = 0;
            this.playerOnPlatformTimer = 0;
            this.rescuePlatformSpawnTimer = 0;
            this.hasSpawnedFirstRescue = false;
        }
    }

    /**
     * Spawn rescue platforms with level-based patterns
     */
    spawnRescuePlatforms(entityManager, scoreSystem) {
        const level = scoreSystem.getLevel();
        
        // Pattern configurations
        const patterns = [
            { name: 'staircase', yFunc: (i, count) => -i * 40 },
            { name: 'wave', yFunc: (i, count) => Math.sin(i * Math.PI / count) * 60 },
            { name: 'zigzag', yFunc: (i, count) => (i % 2 === 0 ? -30 : 30) },
            { name: 'diagonal', yFunc: (i, count) => -i * 25 },
            { name: 'scattered', yFunc: (i, count) => (Math.random() - 0.5) * 100 }
        ];
        
        const colors = [
            [0.3, 0.9, 0.5, 1.0],  // Green
            [0.9, 0.5, 0.3, 1.0],  // Orange
            [0.5, 0.3, 0.9, 1.0],  // Purple
            [0.3, 0.5, 0.9, 1.0],  // Blue
            [0.9, 0.9, 0.3, 1.0],  // Yellow
            [0.9, 0.3, 0.5, 1.0]   // Pink
        ];
        
        // Level-based selection
        const pattern = patterns[level % patterns.length];
        const color = colors[level % colors.length];
        const platformCount = 3 + (level % 5); // 3 to 7 platforms
        const platformWidth = 100 + (level % 3) * 15; // 100, 115, 130
        const spacing = 100 + (level % 4) * 20; // 100-160
        const baseY = this.dims.height - 150 - (level % 3) * 30;
        const startX = this.dims.width + 50;

        // Create rescue platforms with variable pattern
        for (let i = 0; i < platformCount; i++) {
            const platform = {
                x: startX + (i * spacing),
                y: baseY + pattern.yFunc(i, platformCount),
                width: platformWidth,
                height: 18,
                color: color,
                velocity: -120,
                type: 'platform',
                platformType: 'RESCUE',
                // Laser effect properties
                laserPhase: Math.random() * Math.PI * 2,
                laserIntensity: 1.0,
                spawnTime: Date.now()
            };
            entityManager.addEntity('platforms', platform);
        }
    }

    /**
     * Get the safety platform entity
     */
    getPlatform() {
        return this.platform;
    }

    /**
     * Check if safety platform is active
     */
    isActive() {
        return this.active && !this.recharging;
    }

    /**
     * Get current charge count
     */
    getCharges() {
        return this.charges;
    }

    /**
     * Get recharge progress (0-1)
     */
    getRechargeProgress() {
        if (!this.recharging) return 1.0;
        return this.rechargeTimer / this.respawnTime;
    }

    /**
     * Get dissolve progress (0-1)
     */
    getDissolveProgress() {
        return this.dissolveProgress;
    }

    /**
     * Update canvas dimensions
     */
    updateDimensions(width, height) {
        this.dims = { width, height };
        // Update platform position if it exists
        if (this.platform) {
            this.platform.x = this.dims.width / 2 - 200;
            this.platform.y = this.dims.height - 60;
        }
    }

    /**
     * Reset the system
     */
    reset() {
        this.charges = this.maxCharges;
        this.useTimes = [];
        this.active = true;
        this.dissolving = false;
        this.dissolveProgress = 0;
        this.recharging = false;
        this.rechargeTimer = 0;
        this.playerOnPlatform = false;
        this.playerOnPlatformTimer = 0;
        this.rescuePlatformSpawnTimer = 0;
        this.hasSpawnedFirstRescue = false;
        this.timer = 0;
        this.initialize();
    }
}
