/**
 * SafetyPlatformSystem - Manages the emergency rescue platform with charge system
 * Uses State Pattern and clear configuration for maintainability
 */
import { calculateUIPositions } from '../config/UIPositions.js';

// Configuration object for easy tuning
const SAFETY_CONFIG = {
    // Charge system
    MAX_CHARGES: 4,
    RECHARGE_WINDOW: 5, // seconds - window for charge tracking
    
    // Timing
    TIME_BEFORE_DISSOLVE: 3.0, // seconds on platform before dissolve starts
    DISSOLVE_DURATION: 1.5, // seconds to complete dissolve animation
    DISSOLVE_SPEED_AUTO: 0.02, // slow dissolve when player leaves
    
    // Rescue platforms
    RESCUE_SPAWN_INTERVAL: 2.0, // seconds between rescue platform spawns
    
    // Platform properties
    PLATFORM_WIDTH: 800,
    PLATFORM_HEIGHT: 15,
    COLOR_READY: [0.2, 0.8, 0.4, 1.0], // Green when ready
    COLOR_DEPLETED: [0.5, 0.5, 0.5, 0.3], // Gray when no charges
};

export class SafetyPlatformSystem {
    constructor(canvasDimensions, audioManager) {
        this.dims = canvasDimensions;
        this.config = SAFETY_CONFIG;
        this.audioManager = audioManager;
        
        // Charge tracking
        this.charges = this.config.MAX_CHARGES;
        this.lastUseTime = null; // Timestamp dell'ULTIMO uso
        this.cooldownActive = false;
        this.lastChargeConsumed = -1; // Indice ultimo pallino spento (per animazione)
        this.chargeConsumedTime = 0; // Timer per animazione pallino spento
        
        // Recharge animation
        this.isRecharging = false;
        this.rechargeAnimProgress = 0;
        this.rechargeAnimDuration = 0.6; // 0.6 secondi per ricaricare tutti i pallini
        this.chargesBeforeRecharge = 0;
        
        // State machine
        this.state = 'IDLE'; // IDLE | ACTIVE | DISSOLVING
        this.dissolveProgress = 0;
        
        // Player interaction
        this.playerOnPlatform = false;
        this.timeOnPlatform = 0;
        
        // Glass crack animation
        this.crackProgress = 0;
        this.cracks = [];
        
        // Rescue platform spawning
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        
        // Tick sound timer
        this.tickTimer = 0;
        this.tickInterval = 0.3; // Tick ogni 0.3 secondi (più veloce)
        
        // Platform entity
        this.platform = null;
        
        this.initialize(canvasDimensions);
    }

    initialize(canvasDimensions) {
        // Use centralized UI positioning to ensure consistency
        const positions = calculateUIPositions(canvasDimensions.width, canvasDimensions.height);
        const platformWidth = positions.safetyPlatform.width;
        
        this.platform = {
            x: positions.safetyPlatform.getX(platformWidth),
            y: positions.safetyPlatform.y,
            width: platformWidth,
            height: this.config.PLATFORM_HEIGHT,
            color: [...this.config.COLOR_READY],
            type: 'safety-platform'
        };
    }

    /**
     * Main update loop - delegates to state handlers
     */
    update(deltaTime, playerOnPlatform, entityManager, scoreSystem) {
        this.playerOnPlatform = playerOnPlatform;
        
        // Update animazione pallino spento
        if (this.chargeConsumedTime < 1.0) {
            this.chargeConsumedTime += deltaTime;
        }
        
        // Update recharge animation
        this.updateRechargeAnimation(deltaTime);
        
        // Update charge system (auto-recharge expired charges)
        this.updateChargeRecharge();
        
        // Update color based on charges
        this.updatePlatformColor();
        
        // Update dissolve animation for rendering (independent from logic)
        if (this.timeOnPlatform > 0) {
            this.dissolveProgress = Math.min(1.0, this.timeOnPlatform / this.config.TIME_BEFORE_DISSOLVE);
        } else {
            this.dissolveProgress = 0;
        }
        
        // Update crack animation
        this.updateCrackAnimation(deltaTime);
        
        // Execute state-specific logic
        switch (this.state) {
            case 'IDLE':
                this.handleIdleState(deltaTime, entityManager, scoreSystem);
                break;
            case 'ACTIVE':
                this.handleActiveState(deltaTime, entityManager, scoreSystem);
                break;
        }
    }

    /**
     * Reset cooldown immediately (from recharge bonus)
     */
    resetCooldown() {
        this.chargesBeforeRecharge = this.charges;
        this.isRecharging = true;
        this.rechargeAnimProgress = 0;
        this.cooldownActive = false;
        this.lastUseTime = null;
        this.lastChargeConsumed = -1;
        this.chargeConsumedTime = 0;
        // Reset cracks when recharged
        this.crackProgress = 0;
        this.cracks = [];

    }
    
    /**
     * Auto-recharge: TUTTI i pallini si ricaricano insieme dopo 15 secondi dall'ULTIMO uso
     */
    updateChargeRecharge() {
        if (!this.cooldownActive) return;
        
        const currentTime = Date.now() / 1000;
        const timeSinceLastUse = currentTime - this.lastUseTime;
        
        // Dopo 15 secondi dall'ultimo uso, ricarica TUTTI i pallini
        if (timeSinceLastUse >= this.config.RECHARGE_WINDOW) {

            this.chargesBeforeRecharge = this.charges;
            this.isRecharging = true;
            this.rechargeAnimProgress = 0;
            this.cooldownActive = false;
            this.lastUseTime = null;
        }
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
        
        // Ticchettio orologio durante il countdown
        this.tickTimer += deltaTime;
        if (this.tickTimer >= this.tickInterval) {
            this.audioManager.playSound('tick');
            this.tickTimer = 0;
            // Aumenta frequenza man mano che ci avviciniamo al timeout
            const progress = this.timeOnPlatform / this.config.TIME_BEFORE_DISSOLVE;
            this.tickInterval = 0.3 - (progress * 0.2); // Da 0.3s a 0.1s (più veloce)
        }
        
        // Spawn rescue platforms periodically
        this.rescueSpawnTimer += deltaTime;
        if (this.rescueSpawnTimer >= this.config.RESCUE_SPAWN_INTERVAL) {
            this.spawnRescuePlatforms(entityManager, scoreSystem);
            this.rescueSpawnTimer = 0;
        }
        
        // After 3 seconds, safety dissolves completely - player dies
        if (this.timeOnPlatform >= this.config.TIME_BEFORE_DISSOLVE) {

            // Azzera i charges per far sparire completamente la safety
            this.charges = 0;
            // Torna a IDLE ma senza charges (piattaforma non collidibile)
            this.state = 'IDLE';
            this.timeOnPlatform = 0;
            this.rescueSpawnTimer = 0;
            this.hasSpawnedInitialRescue = false;
            this.tickTimer = 0;
            this.tickInterval = 0.3;
            this.tickTimer = 0;
            this.tickInterval = 0.5;
            // Il player cadrà attraverso la piattaforma e morirà
        }
    }

    /**
     * Activate platform when player lands (CONSUMES CHARGE)
     */
    activatePlatform(entityManager, scoreSystem) {

        
        // Traccia quale pallino sta per essere spento
        this.lastChargeConsumed = this.charges - 1;
        this.chargeConsumedTime = 0;
        
        // Consume one charge
        this.charges--;
        
        // Aggiorna il timestamp dell'ultimo uso
        this.lastUseTime = Date.now() / 1000;
        this.cooldownActive = true;
        

        
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
     * Update recharge animation
     */
    updateRechargeAnimation(deltaTime) {
        if (!this.isRecharging) return;
        
        this.rechargeAnimProgress += deltaTime;
        
        // Calcola quanti pallini dovrebbero essere ricaricati in base al progresso
        const progress = Math.min(1.0, this.rechargeAnimProgress / this.rechargeAnimDuration);
        const targetCharges = this.chargesBeforeRecharge + Math.ceil((this.config.MAX_CHARGES - this.chargesBeforeRecharge) * progress);
        this.charges = Math.min(targetCharges, this.config.MAX_CHARGES);
        
        // Completa l'animazione
        if (this.rechargeAnimProgress >= this.rechargeAnimDuration) {
            this.isRecharging = false;
            this.charges = this.config.MAX_CHARGES;
            this.rechargeAnimProgress = 0;
        }
    }
    
    /**
     * Deactivate platform when player leaves before dissolve
     */
    deactivatePlatform() {

        this.state = 'IDLE';
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        this.tickTimer = 0;
        this.tickInterval = 0.3;
        // Reset cracks when player leaves
        this.crackProgress = 0;
        this.cracks = [];
    }
    
    /**
     * Update crack animation based on time on platform
     */
    updateCrackAnimation(deltaTime) {
        if (this.state === 'ACTIVE' && this.timeOnPlatform > 0) {
            // Crack progress increases with time
            const targetProgress = this.timeOnPlatform / this.config.TIME_BEFORE_DISSOLVE;
            this.crackProgress = targetProgress;
            
            // Generate new cracks progressively
            const maxCracks = 15;
            const targetCracks = Math.floor(maxCracks * this.crackProgress);
            
            while (this.cracks.length < targetCracks) {
                this.generateNewCrack();
            }
        } else if (this.crackProgress > 0) {
            // Smooth fade out of cracks
            this.crackProgress = Math.max(0, this.crackProgress - deltaTime * 2);
            if (this.crackProgress === 0) {
                this.cracks = [];
            }
        }
    }
    
    /**
     * Generate a new crack line
     */
    generateNewCrack() {
        const width = this.config.PLATFORM_WIDTH;
        const height = this.config.PLATFORM_HEIGHT;
        
        // Random starting point
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        
        // Random crack pattern
        const segments = 2 + Math.floor(Math.random() * 4);
        const points = [{ x: startX, y: startY }];
        
        let currentX = startX;
        let currentY = startY;
        
        for (let i = 0; i < segments; i++) {
            // Random direction with preference for diagonal
            const angle = Math.random() * Math.PI * 2;
            const length = 15 + Math.random() * 25;
            
            currentX = Math.max(0, Math.min(width, currentX + Math.cos(angle) * length));
            currentY = Math.max(0, Math.min(height, currentY + Math.sin(angle) * length));
            
            points.push({ x: currentX, y: currentY });
        }
        
        this.cracks.push({
            points: points,
            thickness: 1 + Math.random() * 2,
            opacity: 0.6 + Math.random() * 0.4,
            creationTime: Date.now()
        });
    }

    /**
     * Spawn rescue platforms with level-based patterns
     */
    spawnRescuePlatforms(entityManager, scoreSystem) {
        const level = scoreSystem.getLevel();
        const playerHeight = 40; // Altezza del player da Player.js
        const minSpacing = 100; // Spazio minimo aggiuntivo sopra il player
        
        // Calcola l'altezza minima: safety bar position + player height + spacing minimo
        const safetyBarY = this.platform.y;
        const minPlatformY = safetyBarY - playerHeight - minSpacing;
        
        // Pattern configurations PIÙ FANTASIOSI
        const patterns = [
            { name: 'spiral', yFunc: (i, count) => Math.sin(i * 0.8) * 80 - i * 20 },
            { name: 'heart', yFunc: (i, count) => {
                const t = i / count * Math.PI * 2;
                return Math.sin(t) * Math.abs(Math.cos(t)) * 60 - 40;
            }},
            { name: 'rainbow-arc', yFunc: (i, count) => {
                const t = i / count;
                return -Math.pow(t - 0.5, 2) * 200 - 30;
            }},
            { name: 'bouncy-steps', yFunc: (i, count) => -i * 35 + Math.sin(i * 1.2) * 25 },
            { name: 'wavy-stairs', yFunc: (i, count) => -i * 30 + Math.cos(i * 0.8) * 40 },
            { name: 'zigzag-extreme', yFunc: (i, count) => (i % 2 === 0 ? -50 : 20) - i * 15 },
            { name: 'sine-wave', yFunc: (i, count) => Math.sin(i * 0.6) * 70 - i * 10 },
            { name: 'scattered-up', yFunc: (i, count) => (Math.random() - 0.7) * 90 - i * 20 }
        ];
        
        // Palette colori PIÙ VIVACI E FANTASIOSE
        const colorPalettes = [
            // Tropical
            [[0.2, 1.0, 0.5, 1.0], [1.0, 0.8, 0.2, 1.0], [1.0, 0.4, 0.6, 1.0]],
            // Candy
            [[1.0, 0.3, 0.7, 1.0], [0.5, 0.3, 1.0, 1.0], [0.3, 0.9, 1.0, 1.0]],
            // Sunset
            [[1.0, 0.5, 0.2, 1.0], [1.0, 0.7, 0.3, 1.0], [0.9, 0.3, 0.5, 1.0]],
            // Neon
            [[0.3, 1.0, 0.3, 1.0], [1.0, 0.2, 1.0, 1.0], [0.2, 0.8, 1.0, 1.0]],
            // Pastel Rainbow
            [[0.7, 0.5, 1.0, 1.0], [1.0, 0.7, 0.8, 1.0], [0.5, 1.0, 0.9, 1.0]],
            // Fire
            [[1.0, 0.3, 0.2, 1.0], [1.0, 0.6, 0.1, 1.0], [1.0, 0.9, 0.3, 1.0]]
        ];
        
        // Level-based selection
        const pattern = patterns[level % patterns.length];
        const palette = colorPalettes[level % colorPalettes.length];
        const platformCount = 4 + (level % 4); // 4-7 piattaforme
        const platformWidth = 90 + (level % 4) * 20; // Varietà di larghezze
        const spacing = 200; // Spacing variabile
        const baseY = this.dims.height - 160 - (level % 4) * 25;
        const startX = this.dims.width + 50;
        const minVerticalGap = 35; // Spazio minimo verticale tra piattaforme

        const platforms = [];
        for (let i = 0; i < platformCount; i++) {
            // Calcola la Y proposta dal pattern
            let proposedY = baseY + pattern.yFunc(i, platformCount);
            
            // Assicurati che la piattaforma non sia mai sotto la soglia minima (safety bar + player height)
            let finalY = Math.min(proposedY, minPlatformY);
            
            // Evita sovrapposizioni con piattaforme precedenti
            for (const prevPlatform of platforms) {
                const xOverlap = Math.abs(prevPlatform.x - (startX + (i * spacing))) < (platformWidth + prevPlatform.width) / 2;
                if (xOverlap) {
                    const verticalDist = Math.abs(finalY - prevPlatform.y);
                    if (verticalDist < minVerticalGap) {
                        // Sposta verso l'alto se troppo vicina
                        finalY = prevPlatform.y - minVerticalGap;
                    }
                }
            }
            
            // Colore dalla palette (ciclico)
            const color = palette[i % palette.length];
            
            // Forme simili a barre (no scarabocchi)
            const shapes = ['rect', 'rounded'];
            const shape = shapes[Math.floor((level + i) / 2) % shapes.length];
            
            const platform = {
                x: startX + (i * spacing),
                y: finalY,
                width: platformWidth,
                height: 18,
                color: color,
                velocity: -120,
                type: 'platform',
                platformType: 'RESCUE',
                laserPhase: Math.random() * Math.PI * 2,
                laserIntensity: 1.0,
                spawnTime: Date.now(),
                // Proprietà fantasiose
                shape: shape,
                pulsePhase: Math.random() * Math.PI * 2,
                glowIntensity: 0.5 + Math.random() * 0.5,
                rotationSpeed: (Math.random() - 0.5) * 0.5,
                currentRotation: 0,
                particleTrail: [],
                sparkles: Math.random() > 0.5
            };
            platforms.push(platform);
            entityManager.addEntity('platforms', platform);
        }
    }

    // Getters
    getPlatform() { return this.platform; }
    getCharges() { return this.charges; }
    getDissolveProgress() { return this.dissolveProgress; }
    getCrackProgress() { return this.crackProgress; }
    getCracks() { return this.cracks; }
    getRechargeAnimProgress() { return this.rechargeAnimProgress; }
    getRechargeAnimDuration() { return this.rechargeAnimDuration; }
    isRechargingNow() { return this.isRecharging; }
    getChargesBeforeRecharge() { return this.chargesBeforeRecharge; }
    // Platform is active only in IDLE (with charges) or ACTIVE state
    isActive() { 
        if (this.state === 'ACTIVE') {
            return true; // Attiva e collidibile
        }
        return this.state === 'IDLE' && this.charges > 0; // In IDLE serve almeno 1 carica
    }
    
    // Getters for UI/rendering compatibility
    get playerOnPlatformTimer() { return this.timeOnPlatform; }
    get dissolveDuration() { return this.config.TIME_BEFORE_DISSOLVE; }
    get maxCharges() { return this.config.MAX_CHARGES; }
    get useWindow() { return this.config.RECHARGE_WINDOW; }
    get useTimes() { 
        // Per compatibilità rendering: ritorna array vuoto o con lastUseTime
        return this.lastUseTime ? [this.lastUseTime] : [];
    }
    get currentTime() {
        return Date.now() / 1000;
    }

    updateDimensions(width, height) {
        this.dims = { width, height };
        if (this.platform) {
            // Usa posizioni centralizzate (stesso sistema dell'initialize)
            const positions = calculateUIPositions(width, height);
            const platformWidth = positions.safetyPlatform.width;
            
            this.platform.x = positions.safetyPlatform.getX(platformWidth);
            this.platform.y = positions.safetyPlatform.y;
            this.platform.width = platformWidth;
        }
    }

    reset() {
        this.charges = this.config.MAX_CHARGES;
        this.lastUseTime = null;
        this.cooldownActive = false;
        this.lastChargeConsumed = -1;
        this.chargeConsumedTime = 0;
        this.state = 'IDLE';
        this.dissolveProgress = 0;
        this.playerOnPlatform = false;
        this.timeOnPlatform = 0;
        this.rescueSpawnTimer = 0;
        this.hasSpawnedInitialRescue = false;
        this.crackProgress = 0;
        this.cracks = [];
        this.isRecharging = false;
        this.rechargeAnimProgress = 0;
        this.chargesBeforeRecharge = 0;
        this.initialize(this.dims);
    }
}
