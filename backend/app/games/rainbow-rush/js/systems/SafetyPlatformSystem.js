/**
 * SafetyPlatformSystem - Manages the emergency rescue platform with 4-charge system
 * Handles charge tracking, rescue platform spawning with 5 patterns, dissolve/recharge logic
 * Uses State Pattern for clean, scalable state management
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
        this.state = 'IDLE'; // IDLE, ACTIVE, DISSOLVING
        this.dissolveProgress = 0;
        
        // Timing constants
        this.dissolveDuration = 2.5; // 2.5 seconds on platform before dissolve
        this.autoDissolveSpeed = 0.02; // Slow automatic dissolve
        
        // Player interaction tracking
        this.playerOnPlatform = false;
        this.playerOnPlatformTimer = 0;
        
        // Rescue platform spawning
        this.rescuePlatformSpawnTimer = 0;
        this.rescuePlatformSpawnInterval = 2.0;
        this.hasSpawnedFirstRescue = false;
        
        // State handlers map
        this.stateHandlers = {
            'IDLE': this.handleIdleState.bind(this),
            'ACTIVE': this.handleActiveState.bind(this),
            'DISSOLVING': this.handleDissolvingState.bind(this)
        };
        
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
     * Update safety platform system - Main update loop
     */
    update(deltaTime, playerOnPlatform, entityManager, scoreSystem) {
        this.playerOnPlatform = playerOnPlatform;
        
        // Update charge recharge logic
        this.updateCharges();
        
        // Execute current state handler
        const handler = this.stateHandlers[this.state];
        if (handler) {
            handler(deltaTime, entityManager, scoreSystem);
        }
    }

    /**
     * Update charge system - removes expired uses
     */
    updateCharges() {
        const currentTime = Date.now() / 1000;
        if (this.useTimes.length > 0) {
            this.useTimes = this.useTimes.filter(useTime => (currentTime - useTime) < this.useWindow);
            this.charges = Math.max(0, this.maxCharges - this.useTimes.length);
        }
    }

    /**
     * IDLE State: Platform waiting, no player interaction
     */
    handleIdleState(deltaTime, entityManager, scoreSystem) {
        if (this.charges === 0) {
            this.platform.color = [0.5, 0.5, 0.5, 0.3]; // Grayed out
            return;
        }

        this.platform.color = [0.2, 0.8, 0.4, 1.0]; // Green ready
        
        if (this.playerOnPlatform) {
            this.transitionToActive(entityManager, scoreSystem);
        }
    }

    /**
     * ACTIVE State: Player on platform, spawning rescue platforms
     */
    handleActiveState(deltaTime, entityManager, scoreSystem) {
        if (!this.playerOnPlatform) {
            this.transitionToIdle();
            return;
        }

        this.playerOnPlatformTimer += deltaTime;
        this.rescuePlatformSpawnTimer += deltaTime;

        // Spawn rescue platforms at intervals
        if (this.rescuePlatformSpawnTimer >= this.rescuePlatformSpawnInterval) {
            this.spawnRescuePlatforms(entityManager, scoreSystem);
            this.rescuePlatformSpawnTimer = 0;
        }

        // Check for dissolve trigger
        if (this.playerOnPlatformTimer >= this.dissolveDuration) {
            this.transitionToDissolving();
        }
    }

    /**
     * DISSOLVING State: Platform dissolving animation
     */
    handleDissolvingState(deltaTime, entityManager, scoreSystem) {
        const dissolveSpeed = this.playerOnPlatform ? 2.0 : this.autoDissolveSpeed;
        this.dissolveProgress += deltaTime * dissolveSpeed;

        if (this.dissolveProgress >= 1.0) {
            this.completeDissolution();
        }
    }

    /**
     * State Transitions
     */
    transitionToActive(entityManager, scoreSystem) {
        if (this.charges === 0) return;

        this.state = 'ACTIVE';
        this.hasSpawnedFirstRescue = true;
        this.rescuePlatformSpawnTimer = 0;
        this.playerOnPlatformTimer = 0;

        // Spawn first rescue platforms
        this.spawnRescuePlatforms(entityManager, scoreSystem);

        // Consume one charge
        const currentTime = Date.now() / 1000;
        this.useTimes.push(currentTime);
        this.charges = Math.max(0, this.maxCharges - this.useTimes.length);
    }

    transitionToDissolving() {
        this.state = 'DISSOLVING';
        this.dissolveProgress = 0;
    }

    transitionToIdle() {
        this.state = 'IDLE';
        this.playerOnPlatformTimer = 0;
        this.rescuePlatformSpawnTimer = 0;
        this.hasSpawnedFirstRescue = false;
    }

    completeDissolution() {
        this.dissolveProgress = 0;
        this.hasSpawnedFirstRescue = false;
        this.playerOnPlatformTimer = 0;
        this.rescuePlatformSpawnTimer = 0;

        // Transition based on remaining charges
        this.state = this.charges > 0 ? 'IDLE' : 'IDLE';
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
        return this.charges > 0 || this.state === 'DISSOLVING';
    }

    /**
     * Get current charge count
     */
    getCharges() {
        return this.charges;
    }

    /**
     * Get dissolve progress (0-1)
     */
    getDissolveProgress() {
        return this.state === 'DISSOLVING' ? this.dissolveProgress : 0;
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
        this.state = 'IDLE';
        this.dissolveProgress = 0;
        this.playerOnPlatform = false;
        this.playerOnPlatformTimer = 0;
        this.rescuePlatformSpawnTimer = 0;
        this.hasSpawnedFirstRescue = false;
        this.initialize();
    }
}
