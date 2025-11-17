/**
 * SafetyPlatformSystem - Manages the emergency rescue platform with charge system
 * Uses State Pattern and clear configuration for maintainability
 */

// Configuration object for easy tuning
const SAFETY_CONFIG = {
    // Charge system
    MAX_CHARGES: 4,
    RECHARGE_WINDOW: 15, // seconds - window for charge tracking
    
    // Timing
    TIME_BEFORE_DISSOLVE: 3.0, // seconds on platform before dissolve starts
    DISSOLVE_SPEED_ACTIVE: 2.0, // dissolve speed when player on platform
    DISSOLVE_SPEED_AUTO: 0.02, // slow dissolve when player leaves
    
    // Rescue platforms
    RESCUE_SPAWN_INTERVAL: 2.0, // seconds between rescue platform spawns
    
    // Platform properties
    PLATFORM_WIDTH: 400,
    PLATFORM_HEIGHT: 20,
    COLOR_READY: [0.2, 0.8, 0.4, 1.0], // Green when ready
    COLOR_DEPLETED: [0.5, 0.5, 0.5, 0.3], // Gray when no charges
};

export class SafetyPlatformSystem {
    constructor(canvasDimensions) {
        this.dims = canvasDimensions;
        this.config = SAFETY_CONFIG;
        
        // Charge tracking
        this.charges = this.config.MAX_CHARGES;
        this.useTimes = []; // Timestamps of when charges were used
        
        // State machine
        this.state = 'IDLE'; // IDLE | ACTIVE | DISSOLVING
        this.dissolveProgress = 0;
        
        // Player interaction
        this.playerOnPlatform = false;
        this.timeOnPlatform = 0;
        
        // Rescue platform spawning
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        
        // Platform entity
        this.platform = null;
        
        this.initialize();
    }

    initialize() {
        this.platform = {
            x: this.dims.width / 2 - this.config.PLATFORM_WIDTH / 2,
            y: this.dims.height - 60,
            width: this.config.PLATFORM_WIDTH,
            height: this.config.PLATFORM_HEIGHT,
            color: [...this.config.COLOR_READY],
            type: 'safetyPlatform',
            velocity: 0,
            platformType: 'safety'
        };
    }

    /**
     * Main update loop - delegates to state handlers
     */
    update(deltaTime, playerOnPlatform, entityManager, scoreSystem) {
        this.playerOnPlatform = playerOnPlatform;
        
        // Update charge system (auto-recharge expired charges)
        this.updateChargeRecharge();
        
        // Update color based on charges
        this.updatePlatformColor();
        
        // Execute state-specific logic
        switch (this.state) {
            case 'IDLE':
                this.handleIdleState(deltaTime, entityManager, scoreSystem);
                break;
            case 'ACTIVE':
                this.handleActiveState(deltaTime, entityManager, scoreSystem);
                break;
            case 'DISSOLVING':
                this.handleDissolvingState(deltaTime);
                break;
        }
    }

    /**
     * Auto-recharge: Each charge recharges independently 15 seconds after being used
     */
    updateChargeRecharge() {
        const currentTime = Date.now() / 1000;
        const initialLength = this.useTimes.length;
        
        // Remove charges that have recharged (15 seconds since use)
        this.useTimes = this.useTimes.filter(useTime => {
            const timeSinceUse = currentTime - useTime;
            return timeSinceUse < this.config.RECHARGE_WINDOW;
        });
        
        // Log recharge events
        if (this.useTimes.length < initialLength) {
            const rechargedCount = initialLength - this.useTimes.length;
            console.log(`🔋 Recharged ${rechargedCount} charge(s)! Now at ${this.config.MAX_CHARGES - this.useTimes.length}/${this.config.MAX_CHARGES}`);
        }
        
        // Update available charges
        this.charges = this.config.MAX_CHARGES - this.useTimes.length;
    }

    /**
     * Update platform visual color based on state
     */
    updatePlatformColor() {
        if (this.charges === 0) {
            this.platform.color = [...this.config.COLOR_DEPLETED];
        } else {
            this.platform.color = [...this.config.COLOR_READY];
        }
    }

    /**
     * IDLE State: Waiting for player to land
     */
    handleIdleState(deltaTime, entityManager, scoreSystem) {
        // Can't activate if no charges
        if (this.charges === 0) return;
        
        // Player landed -> activate and consume charge
        if (this.playerOnPlatform) {
            this.activatePlatform(entityManager, scoreSystem);
        }
    }

    /**
     * ACTIVE State: Player on platform, counting down to dissolve
     */
    handleActiveState(deltaTime, entityManager, scoreSystem) {
        // Player left platform -> return to idle
        if (!this.playerOnPlatform) {
            this.deactivatePlatform();
            return;
        }
        
        // Increment time on platform
        this.timeOnPlatform += deltaTime;
        
        // Spawn rescue platforms periodically
        this.rescueSpawnTimer += deltaTime;
        if (this.rescueSpawnTimer >= this.config.RESCUE_SPAWN_INTERVAL) {
            this.spawnRescuePlatforms(entityManager, scoreSystem);
            this.rescueSpawnTimer = 0;
        }
        
        // Start dissolving after time limit
        if (this.timeOnPlatform >= this.config.TIME_BEFORE_DISSOLVE) {
            this.startDissolving();
        }
    }

    /**
     * DISSOLVING State: Platform dissolving animation
     */
    handleDissolvingState(deltaTime) {
        const speed = this.playerOnPlatform 
            ? this.config.DISSOLVE_SPEED_ACTIVE 
            : this.config.DISSOLVE_SPEED_AUTO;
        
        this.dissolveProgress += deltaTime * speed;
        
        // Dissolve complete
        if (this.dissolveProgress >= 1.0) {
            this.completeDissolution();
        }
    }

    /**
     * Activate platform when player lands (CONSUMES CHARGE)
     */
    activatePlatform(entityManager, scoreSystem) {
        console.log('🟢 Player landed on safety! Consuming 1 charge. Charges before:', this.charges);
        
        // Consume one charge
        const currentTime = Date.now() / 1000;
        this.useTimes.push(currentTime);
        this.charges = this.config.MAX_CHARGES - this.useTimes.length;
        
        console.log('   Charges after:', this.charges, 'useTimes:', this.useTimes.length);
        
        // Transition to active state
        this.state = 'ACTIVE';
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        
        // Spawn first rescue platforms immediately
        this.spawnRescuePlatforms(entityManager, scoreSystem);
        this.hasSpawnedInitialRescue = true;
    }

    /**
     * Deactivate platform when player leaves before dissolve
     */
    deactivatePlatform() {
        console.log('⚪ Player left safety platform (before dissolve)');
        this.state = 'IDLE';
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
    }

    /**
     * Start dissolving animation
     */
    startDissolving() {
        console.log('🔴 Starting dissolve animation (3 seconds elapsed)');
        this.state = 'DISSOLVING';
        this.dissolveProgress = 0;
    }

    /**
     * Complete dissolution and reset
     */
    completeDissolution() {
        console.log('💥 Dissolve complete! Player falls. Resetting to IDLE');
        this.state = 'IDLE';
        this.dissolveProgress = 0;
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
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
        const platformCount = 3 + (level % 5);
        const platformWidth = 100 + (level % 3) * 15;
        const spacing = 100 + (level % 4) * 20;
        const baseY = this.dims.height - 150 - (level % 3) * 30;
        const startX = this.dims.width + 50;

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
                laserPhase: Math.random() * Math.PI * 2,
                laserIntensity: 1.0,
                spawnTime: Date.now()
            };
            entityManager.addEntity('platforms', platform);
        }
    }

    // Getters
    getPlatform() { return this.platform; }
    getCharges() { return this.charges; }
    getDissolveProgress() { return this.state === 'DISSOLVING' ? this.dissolveProgress : 0; }
    // Platform is ONLY active if in IDLE or ACTIVE state (NOT when dissolving)
    isActive() { return (this.state === 'IDLE' || this.state === 'ACTIVE') && this.charges > 0; }
    
    // Getters for UI/rendering compatibility
    get playerOnPlatformTimer() { return this.timeOnPlatform; }
    get dissolveDuration() { return this.config.TIME_BEFORE_DISSOLVE; }
    get maxCharges() { return this.config.MAX_CHARGES; }
    get useWindow() { return this.config.RECHARGE_WINDOW; }

    updateDimensions(width, height) {
        this.dims = { width, height };
        if (this.platform) {
            this.platform.x = width / 2 - this.config.PLATFORM_WIDTH / 2;
            this.platform.y = height - 60;
        }
    }

    reset() {
        this.charges = this.config.MAX_CHARGES;
        this.useTimes = [];
        this.state = 'IDLE';
        this.dissolveProgress = 0;
        this.playerOnPlatform = false;
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        this.initialize();
    }
}
