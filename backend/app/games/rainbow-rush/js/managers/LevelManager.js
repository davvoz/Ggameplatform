/**
 * LevelManager - Gestisce il caricamento, progressione e completamento dei livelli
 * Sostituisce il sistema procedurale con livelli predefiniti
 */

import { Levels, getLevel, getTotalLevels } from '../config/LevelConfiguration.js';
import { getEnemyConfig } from '../config/EnemyTypes.js';

export class LevelManager {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Livello corrente - inizializzato a null fino a quando l'utente sceglie
        this.currentLevelId = null;
        this.currentLevel = null;
        
        // Stato del livello
        this.levelStartTime = 0;
        this.levelElapsedTime = 0;
        this.platformsReached = 0;
        this.platformsReachedSet = new Set(); // Track unique platforms reached
        this.platformsPassed = 0; // Track platforms that exited screen
        this.platformsPassedSet = new Set(); // Track unique platforms that exited
        this.enemiesKilled = 0;
        this.coinsCollected = 0;
        this.totalCoins = 0;
        this.totalEnemies = 0;
        this.damagesTaken = 0;
        this.maxCombo = 0;
        
        // Progressione
        this.levelCompleted = false;
        this.levelStars = 0;
        
        // Colori arcobaleno per piattaforme
        this.rainbowColors = this.generateRainbowColors();
        
        // Velocità base dello scorrimento
        this.baseSpeed = 180;
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
    
    /**
     * Carica un livello specifico
     */
    loadLevel(levelId) {
        this.currentLevelId = levelId;
        this.currentLevel = getLevel(levelId);
        
        if (!this.currentLevel) {
            console.error(`Level ${levelId} not found!`);
            return null;
        }
        
        console.log(`🎮 Loading Level ${levelId}: ${this.currentLevel.name}`);
        
        // Reset stato livello
        this.levelStartTime = Date.now();
        this.levelElapsedTime = 0;
        this.platformsReached = 0;
        this.platformsReachedSet = new Set(); // Reset unique platforms
        this.platformsPassed = 0; // Reset platforms exited
        this.platformsPassedSet = new Set(); // Reset unique platforms exited
        this.enemiesKilled = 0;
        this.coinsCollected = 0;
        this.damagesTaken = 0;
        this.maxCombo = 0;
        this.levelCompleted = false;
        this.levelStars = 0;
        
        // Conta totali
        this.totalCoins = this.currentLevel.collectibles.filter(c => c.type === 'coin').length;
        this.totalEnemies = this.currentLevel.enemies.length;
        
        return this.currentLevel;
    }
    
    /**
     * Genera le entità del livello corrente
     */
    generateLevelEntities() {
        if (!this.currentLevel) return { platforms: [], enemies: [], collectibles: [], obstacles: [], goalFlag: null };
        
        const entities = {
            platforms: [],
            enemies: [],
            collectibles: [],
            powerups: [],
            hearts: [],
            shieldBonuses: [],
            magnetBonuses: [],
            coinRainBonuses: [],
            multiplierBonuses: [],
            rainbowBonuses: [],
            flightBonuses: [],
            rechargeBonuses: [],
            heartRechargeBonuses: [],
            obstacles: [],
            goalFlag: null
        };
        
        // Genera piattaforme
        this.currentLevel.platforms.forEach((platformData, index) => {
            const platform = this.createPlatform(platformData, index);
            entities.platforms.push(platform);
        });
        
        // Genera bandierina del traguardo alla fine del livello
        if (entities.platforms.length > 0) {
            const lastPlatform = entities.platforms[entities.platforms.length - 1];
            // Posiziona la bandiera esattamente dove il popup apparirà
            // Il popup appare quando l'ultima piattaforma esce completamente (x + width < 0)
            // Quindi la bandiera deve stare a x = -width/2 quando l'ultima piattaforma esce
            // Distanza dalla fine dell'ultima piattaforma = (lastPlatform.width + width della bandiera)
            entities.goalFlag = {
                x: lastPlatform.x + lastPlatform.width + 20, // Subito dopo l'ultima piattaforma
                y: this.canvasHeight - 150,
                width: 40,
                height: 60,
                type: 'goalFlag',
                velocity: lastPlatform.velocity,
                animationTime: 0,
                reached: false
            };
        }
        
        // Genera nemici
        this.currentLevel.enemies.forEach((enemyData, index) => {
            const enemy = this.createEnemy(enemyData, index);
            if (enemy) {
                entities.enemies.push(enemy);
            }
        });
        
        // Genera collectibles (monete, powerup, bonus)
        this.currentLevel.collectibles.forEach((collectibleData, index) => {
            const collectible = this.createCollectible(collectibleData, index);
            
            // Smista in base al tipo
            if (collectible.type === 'powerup') {
                entities.powerups.push(collectible);
            } else if (collectible.type === 'health') {
                entities.hearts.push(collectible);
            } else if (collectible.type === 'shield') {
                entities.shieldBonuses.push(collectible);
            } else if (collectible.type === 'magnet') {
                entities.magnetBonuses.push(collectible);
            } else if (collectible.type === 'coinRain') {
                entities.coinRainBonuses.push(collectible);
            } else if (collectible.type === 'multiplier') {
                entities.multiplierBonuses.push(collectible);
            } else if (collectible.type === 'rainbow') {
                entities.rainbowBonuses.push(collectible);
            } else if (collectible.type === 'flightBonus') {
                entities.flightBonuses.push(collectible);
            } else if (collectible.type === 'rechargeBonus') {
                entities.rechargeBonuses.push(collectible);
            } else if (collectible.type === 'heartRechargeBonus') {
                entities.heartRechargeBonuses.push(collectible);
            } else {
                // Coins and other collectibles
                entities.collectibles.push(collectible);
            }
        });
        
        // Genera ostacoli
        this.currentLevel.obstacles.forEach((obstacleData, index) => {
            const obstacle = this.createObstacle(obstacleData, index);
            entities.obstacles.push(obstacle);
        });
        
        
        
        return entities;
    }
    
    /**
     * Crea una piattaforma
     */
    createPlatform(data, index) {
        const colorIndex = index % this.rainbowColors.length;
        const baseColor = this.rainbowColors[colorIndex];
        
        // Determina tipo piattaforma
        let platformType = data.type || 'normal';
        let velocity = -this.baseSpeed;
        let color = baseColor;
        let bounceMultiplier = 1.0;
        
        switch (platformType) {
            case 'fast':
                velocity = -this.baseSpeed * 1.6;
                color = [baseColor[0] * 1.2, baseColor[1] * 0.8, baseColor[2] * 0.8, 1.0];
                break;
            case 'slow':
                velocity = -this.baseSpeed * 0.6;
                color = [baseColor[0] * 0.8, baseColor[1] * 1.1, baseColor[2] * 1.1, 1.0];
                break;
            case 'bouncy':
                bounceMultiplier = 1.3;
                color = [baseColor[0], baseColor[1] * 1.2, baseColor[2] * 0.9, 1.0];
                break;
            case 'spring':
                bounceMultiplier = 2.5;
                color = [1.0, 0.4, 0.9, 1.0];
                break;
            case 'crumbling':
                color = [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7, 1.0];
                break;
            case 'icy':
                color = [0.7, 0.9, 1.0, 0.9];
                break;
        }
        
        return {
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            color: color,
            type: 'platform',
            platformType: platformType,
            velocity: velocity,
            originalVelocity: velocity,
            bounceMultiplier: bounceMultiplier,
            crumbleTimer: 0,
            crumbleDuration: 1.0,
            isCrumbling: false,
            springCompression: 0,
            springAnimationTime: 0,
            icyShimmer: 0,
            // Nuove proprietà per i nuovi tipi di piattaforma
            isDissolving: false,
            dissolveTimer: 0,
            dissolveDuration: 0.8,
            dissolveAlpha: 1.0,
            isRotating: false,
            rotationAngle: 0,
            rotationSpeed: 0,
            isBouncing: false,
            bounceOffset: 0,
            bounceSpeed: 0,
            bounceAmplitude: 30,
            index: index
        };
    }
    
    /**
     * Crea un nemico
     */
    createEnemy(data, index) {
        const enemyConfig = getEnemyConfig(data.type);
        if (!enemyConfig) {
            return null;
        }
        
        return {
            x: data.x,
            y: data.y,
            width: enemyConfig.width,
            height: enemyConfig.height,
            type: 'enemy',
            enemyType: enemyConfig.id,
            enemyConfig: enemyConfig,
            velocity: -this.baseSpeed, // Si muove con le piattaforme
            hp: enemyConfig.hp,
            maxHp: enemyConfig.hp,
            damage: enemyConfig.damage,
            speed: enemyConfig.speed,
            color: enemyConfig.color,
            points: enemyConfig.points,
            pattern: enemyConfig.pattern,
            alive: true,
            animationTime: 0,
            patternTime: 0,
            // Dati specifici per pattern
            patrolDirection: 1,
            patrolDistance: enemyConfig.patrolDistance || 100,
            chaseActive: false,
            jumpTimer: 0,
            shootTimer: 0,
            phaseTimer: 0,
            isPhased: false,
            index: index
        };
    }
    
    /**
     * Crea un collectible
     */
    createCollectible(data, index) {
        // Gestisci diversi tipi di collectible
        if (data.type === 'powerup') {
            // Powerup (immortality, flight, superJump, speedBoost, turbo)
            const color = this.getPowerupColor(data.powerupType);
            return {
                x: data.x,
                y: data.y,
                radius: 20,
                type: 'powerup',
                powerupType: data.powerupType,
                duration: data.duration,  // ✅ Copia duration dal level data
                cooldown: data.cooldown,  // ✅ Copia cooldown dal level data
                color: color,
                glowColor: color,
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rotationAngle: 0,
                index: index
            };
        } else if (data.type === 'health') {
            // Health hearts
            return {
                x: data.x,
                y: data.y,
                radius: 18,
                type: 'health',
                value: data.value || 1,
                color: [1.0, 0.1, 0.3, 1.0], // Red
                glowColor: [1.0, 0.5, 0.7, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                index: index
            };
        } else if (data.type === 'shield') {
            // Shield bonus
            return {
                x: data.x,
                y: data.y,
                radius: 18,
                type: 'shield',
                value: data.value || 1,
                duration: data.duration,
                color: [0.0, 1.0, 0.5, 1.0], // Green
                glowColor: [0.5, 1.0, 0.8, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rotation: 0,
                index: index
            };
        } else if (data.type === 'magnet') {
            // Magnet bonus
            return {
                x: data.x,
                y: data.y,
                radius: 18,
                type: 'magnet',
                value: data.value || 1,
                duration: data.duration,
                color: [0.5, 0.5, 1.0, 1.0], // Blue
                glowColor: [0.7, 0.7, 1.0, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rotation: 0,
                index: index
            };
        } else if (data.type === 'coinRain') {
            // Coin Rain bonus
            return {
                x: data.x,
                y: data.y,
                radius: 20,
                type: 'coinRain',
                value: data.value || 1,
                color: [1.0, 0.84, 0.0, 1.0], // Gold
                glowColor: [1.0, 0.95, 0.5, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                coinOrbitPhase: 0,
                sparklePhase: 0,
                index: index
            };
        } else if (data.type === 'multiplier') {
            // Multiplier bonus
            return {
                x: data.x,
                y: data.y,
                radius: 20,
                type: 'multiplier',
                multiplier: data.multiplier || 2,
                duration: data.duration || 15000,
                color: [1.0, 0.9, 0.3, 1.0], // Yellow-gold
                glowColor: [1.0, 0.95, 0.6, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rotation: 0,
                index: index
            };
        } else if (data.type === 'rainbow') {
            // Rainbow bonus
            return {
                x: data.x,
                y: data.y,
                radius: 22,
                type: 'rainbow',
                value: data.value || 1,
                color: [1.0, 1.0, 1.0, 1.0], // White (changes in renderer)
                glowColor: [1.0, 0.5, 1.0, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rainbowPhase: 0,
                index: index
            };
        } else if (data.type === 'flightBonus') {
            // Flight bonus
            return {
                x: data.x,
                y: data.y,
                radius: 20,
                type: 'flightBonus',
                duration: data.duration || 8000,
                color: [0.4, 0.8, 1.0, 1.0], // Sky blue
                glowColor: [0.6, 0.9, 1.0, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                wingPhase: 0,
                index: index
            };
        } else if (data.type === 'rechargeBonus') {
            // Recharge bonus
            return {
                x: data.x,
                y: data.y,
                radius: 20,
                type: 'rechargeBonus',
                rechargeAmount: data.rechargeAmount || 50,
                color: [0.3, 1.0, 0.4, 1.0], // Electric green
                glowColor: [0.5, 1.0, 0.6, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                energyPhase: 0,
                orbitPhase: 0,
                index: index
            };
        } else if (data.type === 'heartRechargeBonus') {
            // Heart Recharge bonus
            return {
                x: data.x,
                y: data.y,
                radius: 22,
                type: 'heartRechargeBonus',
                hearts: data.hearts || 1,
                color: [1.0, 0.2, 0.5, 1.0], // Pink-red
                glowColor: [1.0, 0.4, 0.7, 1.0],
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                heartPhase: 0,
                glowPhase: 0,
                index: index
            };
        } else if (data.type === 'bonus') {
            // Bonus (legacy format with bonusType)
            const color = this.getBonusColor(data.bonusType);
            return {
                x: data.x,
                y: data.y,
                radius: 18,
                type: data.bonusType, // 'health', 'shield', 'magnet'
                bonusType: data.bonusType,
                value: data.value || 1,
                duration: data.duration,
                color: color,
                glowColor: color,
                velocity: -this.baseSpeed,
                pulsePhase: Math.random() * Math.PI * 2,
                rotationAngle: 0,
                index: index
            };
        } else {
            // Coin (default)
            return {
                x: data.x,
                y: data.y,
                radius: 15,
                type: 'collectible',
                color: [1.0, 0.84, 0.0, 1.0], // Gold
                velocity: -this.baseSpeed,
                value: data.value || 10,
                pulsePhase: Math.random() * Math.PI * 2,
                index: index
            };
        }
    }
    
    /**
     * Ottieni colore per tipo di powerup
     */
    getPowerupColor(powerupType) {
        switch (powerupType) {
            case 'immortality':
                return [1.0, 0.84, 0.0, 1.0]; // Gold
            case 'flight':
                return [0.4, 0.85, 1.0, 1.0]; // Light blue
            case 'superJump':
                return [1.0, 0.2, 0.6, 1.0]; // Pink
            default:
                return [0.8, 0.8, 0.8, 1.0]; // Gray
        }
    }
    
    /**
     * Ottieni colore per tipo di bonus
     */
    getBonusColor(bonusType) {
        switch (bonusType) {
            case 'health':
                return [1.0, 0.1, 0.3, 1.0]; // Red (heart)
            case 'shield':
                return [0.0, 1.0, 0.5, 1.0]; // Green
            case 'magnet':
                return [0.6, 0.4, 1.0, 1.0]; // Purple
            default:
                return [1.0, 1.0, 1.0, 1.0]; // White
        }
    }
    
    /**
     * Crea un ostacolo
     */
    createObstacle(data, index) {
        return {
            x: data.x,
            y: data.y,
            width: 12,
            height: 20,
            type: 'obstacle',
            obstacleType: data.type || 'spike',
            color: [0.8, 0.1, 0.1, 1.0],
            velocity: -this.baseSpeed,
            animationOffset: Math.random() * Math.PI * 2,
            index: index
        };
    }
    
    /**
     * Aggiorna stato del livello
     */
    update(deltaTime) {
        if (!this.currentLevel || this.levelCompleted) return;
        
        this.levelElapsedTime = (Date.now() - this.levelStartTime) / 1000;
    }
    
    /**
     * Registra eventi di gioco
     */
    recordPlatformReached(platformIndex) {
        // Only count each platform once
        if (!this.platformsReachedSet.has(platformIndex)) {
            this.platformsReachedSet.add(platformIndex);
            this.platformsReached = this.platformsReachedSet.size;
        }
    }
    
    platformExited(platformIndex) {
        if (!this.platformsPassedSet.has(platformIndex)) {
            this.platformsPassedSet.add(platformIndex);
            this.platformsPassed = this.platformsPassedSet.size;
        } 
    }
    
    recordEnemyKilled() {
        this.enemiesKilled++;
    }
    
    recordCoinCollected() {
        this.coinsCollected++;
    }
    
    recordDamageTaken() {
        this.damagesTaken++;
    }
    
    recordCombo(combo) {
        if (combo > this.maxCombo) {
            this.maxCombo = combo;
        }
    }
    
    /**
     * Controlla se il livello è completato
     * Il livello è completato quando tutte le piattaforme sono uscite dallo schermo
     */
    checkLevelCompletion() {
        if (!this.currentLevel || this.levelCompleted) return false;
        
        const totalPlatforms = this.currentLevel.platforms.length;
        
        // Il livello finisce quando TUTTE le piattaforme sono uscite
        if (this.platformsPassed >= totalPlatforms) {
            this.completeLevel();
            return true;
        }
        
        return false;
    }
    
    /**
     * Completa il livello e calcola le stelle
     */
    completeLevel() {
        if (this.levelCompleted) return;
        
        this.levelCompleted = true;
        this.levelStars = this.calculateStars();
        
        console.log(`🎉 LEVEL ${this.currentLevelId} COMPLETED!`);
        console.log(`⭐ Stars: ${this.levelStars}/3`);
        console.log(`⏱️ Time: ${this.levelElapsedTime.toFixed(2)}s`);
        console.log(`💀 Enemies: ${this.enemiesKilled}/${this.totalEnemies}`);
        console.log(`🪙 Coins: ${this.coinsCollected}/${this.totalCoins}`);
        
        // Salva progresso
        this.saveProgress();
    }
    
    /**
     * Calcola stelle in base a performance
     */
    calculateStars() {
        const req = this.currentLevel.starRequirements;
        
        // Percentuali
        const coinPercent = this.totalCoins > 0 ? this.coinsCollected / this.totalCoins : 1;
        const enemyPercent = this.totalEnemies > 0 ? this.enemiesKilled / this.totalEnemies : 1;
        const noDamage = this.damagesTaken === 0;
        
        // 3 stelle: tempo ottimo, tutte monete, tutti nemici, nessun danno
        if (this.levelElapsedTime <= req.threeStars.time &&
            coinPercent >= req.threeStars.coins &&
            enemyPercent >= req.threeStars.enemies &&
            (!req.threeStars.noDamage || noDamage)) {
            return 3;
        }
        
        // 2 stelle: tempo buono, 80% monete, 70% nemici
        if (this.levelElapsedTime <= req.twoStars.time &&
            coinPercent >= req.twoStars.coins &&
            enemyPercent >= req.twoStars.enemies) {
            return 2;
        }
        
        // 1 stella: tempo accettabile, 50% monete
        if (this.levelElapsedTime <= req.oneStar.time &&
            coinPercent >= req.oneStar.coins) {
            return 1;
        }
        
        // Nessuna stella - ma livello completato comunque
        return 0;
    }
    
    /**
     * Salva progresso in localStorage
     */
    saveProgress() {
        try {
            const progressKey = 'rainbowRush_levelProgress';
            let progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
            
            // Aggiorna progresso del livello
            if (!progress[this.currentLevelId] || progress[this.currentLevelId].stars < this.levelStars) {
                progress[this.currentLevelId] = {
                    completed: true,
                    stars: this.levelStars,
                    bestTime: this.levelElapsedTime,
                    timestamp: Date.now()
                };
            } else {
                // Aggiorna solo se tempo migliore
                if (this.levelElapsedTime < progress[this.currentLevelId].bestTime) {
                    progress[this.currentLevelId].bestTime = this.levelElapsedTime;
                }
            }
            
            localStorage.setItem(progressKey, JSON.stringify(progress));
            console.log('💾 Progress saved!');
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    }
    
    /**
     * Carica progresso salvato
     */
    loadProgress() {
        try {
            const progressKey = 'rainbowRush_levelProgress';
            const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
            return progress;
        } catch (error) {
            console.warn('Failed to load progress:', error);
            return {};
        }
    }
    
    /**
     * Ottieni riepilogo livello completato
     */
    getLevelSummary() {
        return {
            levelId: this.currentLevelId,
            levelName: this.currentLevel.name,
            stars: this.levelStars,
            time: this.levelElapsedTime,
            enemiesKilled: this.enemiesKilled,
            totalEnemies: this.totalEnemies,
            coinsCollected: this.coinsCollected,
            totalCoins: this.totalCoins,
            damagesTaken: this.damagesTaken,
            maxCombo: this.maxCombo,
            objectives: this.currentLevel.objectives,
            nextLevelId: this.currentLevelId < getTotalLevels() ? this.currentLevelId + 1 : null
        };
    }
    
    /**
     * Passa al livello successivo
     */
    loadNextLevel() {
        if (this.currentLevelId < getTotalLevels()) {
            return this.loadLevel(this.currentLevelId + 1);
        }
        return null;
    }
    
    /**
     * Ricarica livello corrente
     */
    reloadLevel() {
        return this.loadLevel(this.currentLevelId);
    }
    
    /**
     * Ottieni livello corrente
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    /**
     * È l'ultimo livello?
     */
    isLastLevel() {
        return this.currentLevelId >= getTotalLevels();
    }
    
    /**
     * Aggiorna dimensioni canvas
     */
    updateDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
