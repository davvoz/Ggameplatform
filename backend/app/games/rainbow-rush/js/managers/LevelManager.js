/**
 * LevelManager - Gestisce il caricamento, progressione e completamento dei livelli
 * Sostituisce il sistema procedurale con livelli predefiniti
 * Integrato con RainbowRushSDK per persistenza sicura
 */

import { Levels, getLevel, getTotalLevels } from '../config/LevelConfiguration.js';
import { getEnemyConfig } from '../config/EnemyTypes.js';

export class LevelManager {
    constructor(canvasWidth, canvasHeight, sdk = null) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Rainbow Rush SDK per persistenza
        this.sdk = sdk;
        this.sdkEnabled = sdk !== null;

        // Livello corrente - inizializzato a null fino a quando l'utente sceglie
        this.currentLevelId = null;
        this.currentLevel = null;

        // Stato del livello
        this.levelStartTime = 0;
        this.levelElapsedTime = 0;
        this.enemiesKilled = 0;
        this.coinsCollected = 0;
        this.totalCoins = 0;
        this.totalEnemies = 0;
        this.damagesTaken = 0;
        this.maxCombo = 0;

        // NUOVO SISTEMA: Progressione basata su DISTANZA
        this.distanceTraveled = 0;      // Distanza percorsa dal player
        this.levelLength = 0;            // Lunghezza totale del livello (calcolata)
        this.levelCompleted = false;
        this.levelStars = 0;

        // Colori arcobaleno per piattaforme
        this.rainbowColors = this.generateRainbowColors();

        // Velocità base dello scorrimento
        this.baseSpeed = 180;
        
        // Carica progresso salvato (da SDK se disponibile, altrimenti localStorage)
        this.savedProgress = null;
        this.progressLoaded = false;
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
        this.enemiesKilled = 0;
        this.coinsCollected = 0;
        this.damagesTaken = 0;
        this.maxCombo = 0;

        // Reset distanza percorsa
        this.distanceTraveled = 0;
        this.levelLength = 0;
        this.levelCompleted = false;
        this.levelStars = 0;
        this.goalSpawned = false; // Reset goal spawn flag

        // Conta totali enemies dal pattern base (verrà moltiplicato dai loop)
        this.totalEnemies = this.currentLevel.enemies.length;
        
        // totalCoins verrà calcolato DOPO la generazione delle entità con i loop
        this.totalCoins = 0;

        return this.currentLevel;
    }

    /**
     * Genera le entità del livello corrente
     */
    generateLevelEntities() {
        console.log('Generating level entities...');
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

        // STEP 1: Genera il pattern base una volta
        const basePlatforms = [];
        const baseEnemies = [];
        const baseCollectibles = [];
        const baseObstacles = [];

        let baseMaxX = 0;

        this.currentLevel.platforms.forEach((platformData, index) => {
            const platform = this.createPlatform(platformData, index);
            basePlatforms.push(platform);

            const platformEnd = platform.x + platform.width;
            if (platformEnd > baseMaxX) baseMaxX = platformEnd;
        });

        // Salva enemies, collectibles, obstacles base
        this.currentLevel.enemies.forEach((enemyData) => {
            baseEnemies.push(enemyData);
        });

        this.currentLevel.collectibles.forEach((collectibleData, index) => {
            baseCollectibles.push(this.createCollectible(collectibleData, index));
        });

        this.currentLevel.obstacles.forEach((obstacleData, index) => {
            baseObstacles.push(this.createObstacle(obstacleData, index));
        });

        // STEP 2: Calcola quanti loop servono per raggiungere fineLivello
        const targetLength = this.currentLevel.fineLivello || 3000;
        const loopCount = Math.max(1, Math.ceil(targetLength / baseMaxX));

        console.log(`🔄 Will loop pattern ${loopCount} times to reach target ${targetLength}px (pattern length: ${baseMaxX}px)`);

        // STEP 3: Replica il pattern per raggiungere la lunghezza target
        let currentOffset = 0;

        for (let loop = 0; loop < loopCount; loop++) {
            basePlatforms.forEach((basePlatform) => {
                entities.platforms.push({
                    ...basePlatform,
                    x: basePlatform.x + currentOffset,
                    index: entities.platforms.length
                });
            });

            baseEnemies.forEach((baseEnemy) => {
                entities.enemies.push({
                    ...baseEnemy,
                    x: baseEnemy.x + currentOffset
                });
            });

            baseCollectibles.forEach((baseCollectible) => {
                const collectible = {
                    ...baseCollectible,
                    x: baseCollectible.x + currentOffset
                };

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
                    entities.collectibles.push(collectible);
                }
            });

            baseObstacles.forEach((baseObstacle) => {
                entities.obstacles.push({
                    ...baseObstacle,
                    x: baseObstacle.x + currentOffset
                });
            });

            currentOffset += baseMaxX;
        }

        // STEP 4: La lunghezza effettiva del livello
        // Usa fineLivello come target, non currentOffset
        this.levelLength = targetLength;
        this.goalSpawned = false;

        console.log(`📏 Level length set to ${this.levelLength} pixels (target from config).`);

        // STEP 5: Aggiorna il conteggio totale delle monete DOPO aver generato tutte le entità
        // Conta SOLO le monete che sono PRIMA della fine del livello (quelle effettivamente raggiungibili)
        // Le monete sono in entities.collectibles con type='collectible'
        this.totalCoins = entities.collectibles.filter(coin => coin.x < this.levelLength).length;
        console.log(`🪙 Total coins in level (reachable before goal at ${this.levelLength}px): ${this.totalCoins}`);
        
        // Rimuovi le monete irraggiungibili (oltre la fine del livello) per non confondere il player
        entities.collectibles = entities.collectibles.filter(coin => coin.x < this.levelLength);

        // Il goal NON viene creato qui, verrà spawned dinamicamente
        entities.goalFlag = null;

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
            case 'rotating':
                color = [1.0, 0.6, 0.2, 1.0]; // Orange for rotating platforms
                break;
            case 'dissolving':
                color = [baseColor[0] * 0.9, baseColor[1] * 0.8, baseColor[2] * 1.1, 0.85]; // Slightly transparent purple tint
                break;
            case 'bouncing':
                color = [baseColor[0] * 1.1, baseColor[1], baseColor[2] * 1.2, 1.0]; // Blue-ish tint
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
            // Nuove proprietà per i nuovi tipi di piattaforma - PRESERVA VALORI DA DATA
            isDissolving: data.isDissolving || false,
            dissolveTimer: 0,
            dissolveDuration: data.dissolveDuration || 0.8,
            dissolveAlpha: data.dissolveAlpha || 1.0,
            isRotating: data.isRotating || false, // ✅ PRESERVA dal LevelGenerator
            rotationAngle: data.rotationAngle || 0,
            rotationSpeed: data.rotationSpeed || 0,
            rotationCenterX: data.rotationCenterX,
            rotationCenterY: data.rotationCenterY,
            rotationRadius: data.rotationRadius,
            isBouncing: data.isBouncing || false,
            bounceOffset: 0,
            bounceSpeed: data.bounceSpeed || 0,
            bounceAmplitude: data.bounceAmplitude || 30,
            index: index
        };
    }

    /**
     * Crea un nemico
     */
    createEnemy(data, index) {
        const enemyConfig = getEnemyConfig(data.enemyId || data.type); // Support both field names
        if (!enemyConfig) {
            console.warn('Enemy config not found for:', data);
            return null;
        }

        // Variazione altezza per cactus (spikeball)
        let width = enemyConfig.width;
        let height = enemyConfig.height;
        let sizeCategory = 'medium'; // default

        if (enemyConfig.id === 'spikeball') {
            const heightVariation = Math.random();

            if (heightVariation < 0.33) {
                // Piccolo (60% dell'altezza base)
                const scale = 0.6 + Math.random() * 0.15;
                width = enemyConfig.width * scale;
                height = enemyConfig.height * scale;
                sizeCategory = 'small';
            } else if (heightVariation < 0.66) {
                // Medio (100% dell'altezza base con piccola variazione)
                const scale = 0.9 + Math.random() * 0.2;
                width = enemyConfig.width * scale;
                height = enemyConfig.height * scale;
                sizeCategory = 'medium';
            } else {
                // Grande (140% dell'altezza base)
                const scale = 1.4 + Math.random() * 0.3;
                width = enemyConfig.width * scale;
                height = enemyConfig.height * scale;
                sizeCategory = 'large';
            }
        }

        return {
            x: data.x,
            y: data.y,
            width: width,
            height: height,
            sizeCategory: sizeCategory,
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
     * @param {number} deltaTime - Tempo trascorso dall'ultimo frame
     * @param {number} cameraSpeed - Velocità effettiva della camera (include turbo/boost)
     */
    update(deltaTime, cameraSpeed = 0) {
        if (!this.currentLevel || this.levelCompleted) return;

        this.levelElapsedTime = (Date.now() - this.levelStartTime) / 1000;

        // Distanza basata su baseSpeed + velocità extra (turbo/boost)
        // La camera si muove con baseSpeed + eventuali bonus di velocità
        const effectiveSpeed = this.baseSpeed + Math.abs(cameraSpeed);
        this.distanceTraveled += effectiveSpeed * deltaTime;
    }

    /**
     * Controlla se è il momento di spawnare il goal
     * @returns {Object|null} Il goal se deve essere spawned, altrimenti null
     */
    shouldSpawnGoal() {
        if (!this.currentLevel || this.levelCompleted || this.goalSpawned) return null;

        // Spawna il goal quando siamo a 70% del livello (più presto per dare tempo di vederlo)
        const spawnThreshold = this.levelLength * 0.7;

        if (this.distanceTraveled >= spawnThreshold) {
            this.goalSpawned = true;

            const canvasWidth = this.canvasWidth || 800;
            const goalX = canvasWidth + 1500; // Più lontano per dare tempo di scorrere nella visuale

            console.log(`🏁 Goal spawned OFF-SCREEN at ${goalX}px (distance: ${this.distanceTraveled.toFixed(0)}/${this.levelLength})`);

            return {
                x: goalX,
                y: this.canvasHeight * 0.5,
                width: 60,
                height: 60,
                type: 'goalFlag',
                velocity: -this.baseSpeed,  // Si muove con le piattaforme verso sinistra
                animationTime: 0,
                reached: false
            };
        }

        return null;
    }

    /**
     * Registra eventi di gioco
     */
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
     * Ottiene il progresso del livello (0.0 - 1.0)
     */
    getProgress() {
        if (!this.levelLength || this.levelLength === 0) return 0;
        
        // Cap progress at 99% until goal is actually reached (goal spawns beyond levelLength)
        const rawProgress = this.distanceTraveled / this.levelLength;
        
        // If level is completed (goal reached), return 100%
        if (this.levelCompleted) return 1.0;
        
        // Otherwise, cap at 99% to avoid showing 100% before reaching goal
        return Math.min(0.99, rawProgress);
    }

    /**
     * Controlla se il livello è completato
     * Il livello è completato quando il player raggiunge il goal
     * @param {Object} goalEntity - The goal flag entity (optional, for collision-based detection)
     * @param {boolean} goalReached - Whether player has touched the goal
     */
    checkLevelCompletion(goalEntity = null, goalReached = false) {
        if (!this.currentLevel || this.levelCompleted) return false;

        // Il livello finisce quando il player tocca il goal
        if (goalReached && goalEntity && goalEntity.reached) {
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
     * Calcola stelle in base a performance - VERSIONE BILANCIATA
     */
    calculateStars() {
       // console.log('🌟🌟🌟 calculateStars() called - VERSION 2024-11-28 NO DAMAGE');
        const req = this.currentLevel.starRequirements;
        
        // Calcola requisiti monete in base al totale del livello
        const coinsFor3Stars = Math.ceil(this.totalCoins * req.threeStars.coins);
        const coinsFor2Stars = Math.ceil(this.totalCoins * req.twoStars.coins);
        const coinsFor1Star = Math.ceil(this.totalCoins * req.oneStar.coins);
        
        // console.log(`⭐ Star calculation:
        //     Time: ${this.levelElapsedTime.toFixed(1)}s / ${req.threeStars.time}s (2⭐: ${req.twoStars.time}s, 1⭐: ${req.oneStar.time}s)
        //     Coins: ${this.coinsCollected} (includes bonus coins!) - Need: 3⭐≥${coinsFor3Stars}, 2⭐≥${coinsFor2Stars}, 1⭐≥${coinsFor1Star}
        //     Base coins in level: ${this.totalCoins}
        //     Damage: ${this.damagesTaken} (not used in star calculation)
        // `);
        
        // Debug dettagliato
        // console.log('🔍 Detailed check:');
        // console.log(`  3⭐ time check: ${this.levelElapsedTime} <= ${req.threeStars.time} = ${this.levelElapsedTime <= req.threeStars.time}`);
        // console.log(`  3⭐ coins check: ${this.coinsCollected} >= ${coinsFor3Stars} = ${this.coinsCollected >= coinsFor3Stars}`);
        // console.log(`  2⭐ time check: ${this.levelElapsedTime} <= ${req.twoStars.time} = ${this.levelElapsedTime <= req.twoStars.time}`);
        // console.log(`  2⭐ coins check: ${this.coinsCollected} >= ${coinsFor2Stars} = ${this.coinsCollected >= coinsFor2Stars}`);
        // console.log(`  1⭐ time check: ${this.levelElapsedTime} <= ${req.oneStar.time} = ${this.levelElapsedTime <= req.oneStar.time}`);
        // console.log(`  1⭐ coins check: ${this.coinsCollected} >= ${coinsFor1Star} = ${this.coinsCollected >= coinsFor1Star}`);
        
        // 🌟🌟🌟 3 STELLE: Perfect run - fast time, most coins
        if (this.levelElapsedTime <= req.threeStars.time &&
            this.coinsCollected >= coinsFor3Stars) {
         //   console.log('✅ 3 STARS achieved!');
            return 3;
        }
        
        // 🌟🌟 2 STELLE: Good run - decent time, half coins
        if (this.levelElapsedTime <= req.twoStars.time &&
            this.coinsCollected >= coinsFor2Stars) {
            // console.log('✅ 2 STARS achieved!');
            return 2;
        }
        
        // 🌟 1 STELLA: Completed - just finish with some coins
        if (this.levelElapsedTime <= req.oneStar.time &&
            this.coinsCollected >= coinsFor1Star) {
            // console.log('✅ 1 STAR achieved!');
            return 1;
        }
        
        // console.log('❌ 0 STARS - Requirements not met');
        
        // ✅ 0 STELLE: Livello completato ma performance scarsa
        return 0;
    }
    
    /**
     * Calcola e salva le stelle per il livello corrente
     */
    calculateAndSaveStars() {
        this.levelStars = this.calculateStars();
        this.saveProgress(); // Salva automaticamente
        return this.levelStars;
    }

    /**
     * Salva progresso in localStorage o SDK
     */
    async saveProgress() {
        this.levelStars = this.calculateStars();
        
        if (this.sdkEnabled && this.sdk) {
            // Usa SDK per salvare in modo sicuro
            try {
                const levelData = {
                    stars: this.levelStars,
                    best_time: this.levelElapsedTime,
                    completed: true,
                    coins: this.coinsCollected
                };
                
                await this.sdk.saveLevelProgress(this.currentLevelId, levelData);
                console.log('💾 Progress saved via SDK for level', this.currentLevelId);
                
                // Aggiorna cache locale
                this.savedProgress = await this.sdk.getProgress();
            } catch (error) {
                console.warn('Failed to save via SDK, falling back to localStorage:', error);
                this.saveProgressLocal();
            }
        } else {
            // Fallback a localStorage
            this.saveProgressLocal();
        }
    }
    
    /**
     * Salva progresso in localStorage (fallback)
     * @private
     */
    saveProgressLocal() {
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
            this.savedProgress = progress;
            console.log('💾 Progress saved locally for level', this.currentLevelId);
        } catch (error) {
            console.warn('Failed to save progress locally:', error);
        }
    }

    /**
     * Carica progresso salvato da SDK o localStorage
     * @param {boolean} forceReload - Force reload from backend (ignore cache)
     */
    async loadProgress(forceReload = false) {
        if (this.progressLoaded && !forceReload) {
            return this.savedProgress;
        }
        
        if (this.sdkEnabled && this.sdk) {
            // Carica da SDK
            try {
                const progress = await this.sdk.getProgress();
                this.savedProgress = progress.level_completions || {};
                this.progressLoaded = true;
                console.log('📂 Progress loaded via SDK:', Object.keys(this.savedProgress).length, 'levels');
                return this.savedProgress;
            } catch (error) {
                console.warn('Failed to load via SDK, falling back to localStorage:', error);
                return this.loadProgressLocal();
            }
        } else {
            // Fallback a localStorage
            return this.loadProgressLocal();
        }
    }
    
    /**
     * Carica progresso da localStorage (fallback)
     * @private
     */
    loadProgressLocal() {
        try {
            const progressKey = 'rainbowRush_levelProgress';
            const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
            this.savedProgress = progress;
            this.progressLoaded = true;
            console.log('📂 Progress loaded locally:', Object.keys(progress).length, 'levels');
            return progress;
        } catch (error) {
            console.warn('Failed to load progress locally:', error);
            return {};
        }
    }
    
    /**
     * Ottieni progresso salvato (usa cache se disponibile)
     */
    async getSavedProgress() {
        if (!this.progressLoaded || !this.savedProgress) {
            return await this.loadProgress();
        }
        return this.savedProgress;
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
            starRequirements: this.currentLevel.starRequirements,
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
