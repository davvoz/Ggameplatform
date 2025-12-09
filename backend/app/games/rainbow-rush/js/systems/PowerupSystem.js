/**
 * PowerupSystem - Manages powerups: Immortality, Flight, Super Jump
 * Each powerup has duration, cooldown, and visual effects
 */

export const PowerupTypes = {
    IMMORTALITY: 'immortality',
    FLIGHT: 'flight',
    SUPER_JUMP: 'superJump'
};

export class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.powerupType = type; // Tipo specifico del powerup
        this.entityType = 'powerup'; // Per il rendering
        this.radius = 28; // Molto più grande!
        this.velocity = -120;
        this.collected = false;
        this.particleTimer = 0;
        this.rotationAngle = 0;
        
        // Configure based on type
        this.configure();
    }
    
    configure() {
        switch (this.type) {
            case PowerupTypes.IMMORTALITY:
                this.color = [1.0, 0.84, 0.0, 1.0]; // Gold
                this.icon = '🛡️';
                this.glowColor = [1.0, 0.95, 0.6, 0.8];
                this.duration = 5000; // 5 seconds
                this.cooldown = 15000; // 15 seconds
                break;
            case PowerupTypes.FLIGHT:
                this.color = [0.4, 0.7, 1.0, 1.0]; // Light blue
                this.icon = '🪶';
                this.glowColor = [0.6, 0.85, 1.0, 0.8];
                this.duration = 4000; // 4 seconds
                this.cooldown = 20000; // 20 seconds
                break;
            case PowerupTypes.SUPER_JUMP:
                this.color = [1.0, 0.3, 0.5, 1.0]; // Pink
                this.icon = '⚡';
                this.glowColor = [1.0, 0.5, 0.7, 0.8];
                this.duration = 6000; // 6 seconds
                this.cooldown = 12000; // 12 seconds
                break;
        }
    }
    
    update(deltaTime) {
        this.x += this.velocity * deltaTime;
        this.particleTimer += deltaTime;
        this.rotationAngle += deltaTime * 2; // Rotate for visual effect
    }
}

export class PowerupSystem {
    constructor() {
        this.activePowerups = new Map(); // type -> {endTime, cooldownEndTime}
        this.powerupTimers = new Map(); // type -> timer info
        this.listeners = new Map();
        
        // Initialize all powerup types
        Object.values(PowerupTypes).forEach(type => {
            this.powerupTimers.set(type, {
                active: false,
                duration: 0,
                maxDuration: 0,
                cooldown: 0,
                maxCooldown: 0,
                everActivated: false // Track if this powerup was ever used
            });
        });
    }
    
    activatePowerup(type, duration, cooldown) {
        const now = Date.now();
        
        // Validate duration and cooldown - se undefined, usa valori default
        if (duration === undefined || duration === null || isNaN(duration)) {
            console.warn(`⚠️ Powerup ${type} has invalid duration:`, duration, '- using default 5000ms');
            duration = 5000;
        }
        if (cooldown === undefined || cooldown === null || isNaN(cooldown)) {
            console.warn(`⚠️ Powerup ${type} has invalid cooldown:`, cooldown, '- using default 15000ms');
            cooldown = 15000;
        }
        
        console.log(`✅ Activating powerup ${type} - duration: ${duration}ms, cooldown: ${cooldown}ms`);
        
        // Check if on cooldown
        const timer = this.powerupTimers.get(type);
        if (!timer) {
            // Timer doesn't exist, initialize it
            this.powerupTimers.set(type, {
                active: false,
                duration: 0,
                maxDuration: 0,
                cooldown: 0,
                maxCooldown: 0,
                everActivated: false
            });
        } else if (timer.cooldown > 0) {
            console.log(`❌ Powerup ${type} still on cooldown: ${timer.cooldown}ms remaining`);
            return false; // Still on cooldown
        }
        
        // Activate powerup
        this.powerupTimers.set(type, {
            active: true,
            duration: duration,
            maxDuration: duration,
            cooldown: 0,
            maxCooldown: cooldown,
            everActivated: true // Mark as used
        });
        
        this.activePowerups.set(type, {
            endTime: now + duration,
            cooldownEndTime: now + duration + cooldown
        });
        
        this.notifyActivation(type);
        return true;
    }
    
    update(deltaTime) {
        const now = Date.now();
        const deltaMs = deltaTime * 1000;
        
        for (const [type, timer] of this.powerupTimers.entries()) {
            if (timer.active) {
                timer.duration -= deltaMs;
                
                if (timer.duration <= 0) {
                    // Powerup expired, start cooldown
                    timer.active = false;
                    timer.duration = 0;
                    timer.cooldown = timer.maxCooldown;
                    // Keep everActivated as true
                    this.activePowerups.delete(type);
                    this.notifyDeactivation(type);
                }
            } else if (timer.cooldown > 0) {
                const wasCooldown = true;
                timer.cooldown -= deltaMs;
                if (timer.cooldown <= 0) {
                    timer.cooldown = 0;
                    // Notify ready
                    this.notifyReady(type);
                }
            }
        }
    }
    
    isActive(type) {
        return this.powerupTimers.get(type)?.active || false;
    }
    
    getTimerInfo(type) {
        return this.powerupTimers.get(type);
    }
    
    getAllTimers() {
        const timers = {};
        for (const [type, timer] of this.powerupTimers.entries()) {
            timers[type] = { ...timer };
        }
        return timers;
    }
    
    reset() {
        this.activePowerups.clear();
        Object.values(PowerupTypes).forEach(type => {
            this.powerupTimers.set(type, {
                active: false,
                duration: 0,
                maxDuration: 0,
                cooldown: 0,
                maxCooldown: 0,
                everActivated: false
            });
        });
    }
    
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    notifyActivation(type) {
        const callbacks = this.listeners.get('activate');
        if (callbacks) {
            callbacks.forEach(cb => cb(type));
        }
    }
    
    notifyDeactivation(type) {
        const callbacks = this.listeners.get('deactivate');
        if (callbacks) {
            callbacks.forEach(cb => cb(type));
        }
    }
    
    notifyReady(type) {
        const callbacks = this.listeners.get('ready');
        if (callbacks) {
            callbacks.forEach(cb => cb(type));
        }
    }
}
