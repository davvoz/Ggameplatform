/**
 * LevelGenerator - Generatore procedurale di livelli basato su configurazione
 * Segue principi SOLID e DRY
 */

import { EnemyTypes } from './EnemyTypes.js';
import {
    DifficultyConfig,
    PowerupTypes,
    BonusTypes,
    PlatformPatterns,
    LevelRanges,
    ThemesByTier
} from './LevelGeneratorConfig.js';

/**
 * Classe Platform - Rappresenta una singola piattaforma
 */
class Platform {
    constructor(x, y, width, height, type = 'normal', index = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.platformType = type; // Alias per compatibilità
        this.index = index;

        // Proprietà per i nuovi tipi di piattaforma
        this.isDissolving = false;
        this.dissolveTimer = 0;
        this.dissolveDuration = 0.8;
        this.dissolveAlpha = 1;
        this.isRotating = false;
        this.rotationAngle = 0;
        this.rotationSpeed = 0;
        this.isBouncing = false;
        this.bounceOffset = 0;
        this.bounceSpeed = 0;
        this.bounceAmplitude = 30;
    }

    getCenterX() {
        return this.x + this.width / 2;
    }

    getCenterY() {
        return this.y - this.height / 2;
    }
}

/**
 * Factory function to create an enemy object
 */
function createEnemy(enemyId, x, y, platformIndex = 0) {
    return {
        enemyId: enemyId, // Changed from 'type' to avoid conflict with entity type
        x: x,
        y: y,
        platformIndex: platformIndex
    };
}

/**
 * Factory function to create a collectible object
 */
function createCollectible(type, x, y, options = {}) {
    return {
        type: type,
        x: x,
        y: y,
        ...options
    };
}

/**
 * Classe Level - Rappresenta un livello completo
 */
class Level {
    constructor(id, name, difficulty, theme) {
        this.id = id;
        this.name = name;
        this.difficulty = difficulty;
        this.theme = theme;
        this.platforms = [];
        this.enemies = [];
        this.collectibles = [];
        this.obstacles = [];
        this.objectives = ['reach_end'];
        this.parTime = { threeStars: 20, twoStars: 30, oneStar: 45 };
        this.starRequirements = {
            threeStars: { time: 20, coins: 0.7, maxDamage: 1 },
            twoStars: { time: 30, coins: 0.5, maxDamage: 3 },
            oneStar: { time: 45, coins: 0.3 }
        };
        this.length = 0; // Lunghezza totale del livello in pixel (calcolata dopo aver aggiunto le piattaforme)
        this.fineLivello = 3000; // NUOVO: Lunghezza fissa del livello in pixel (configurabile per ogni livello)
    }

    addPlatform(platform) {
        this.platforms.push(platform);
        // Aggiorna la lunghezza del livello
        this.updateLength();
    }

    updateLength() {
        if (this.platforms.length > 0) {
            // La lunghezza è la X della piattaforma più lontana + la sua larghezza
            const lastPlatform = this.platforms.at(-1);
            this.length = lastPlatform.x + lastPlatform.width;
        }
    }

    addEnemy(enemy) {
        this.enemies.push(enemy);
    }

    addCollectible(collectible) {
        this.collectibles.push(collectible);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            difficulty: this.difficulty,
            theme: this.theme,
            platforms: this.platforms,
            enemies: this.enemies,
            collectibles: this.collectibles,
            obstacles: this.obstacles,
            objectives: this.objectives,
            parTime: this.parTime,
            starRequirements: this.starRequirements,
            length: this.length,
            fineLivello: this.fineLivello
        };
    }
}

/**
 * PlatformGenerator - Genera piattaforme con pattern
 */
class PlatformGenerator {
    static MIN_Y = 200;  // Abbassato da 100 - niente piattaforme troppo in alto
    static MAX_Y = 600;  // Ridotto da 650 - range più stretto e controllato
    static MIN_HORIZONTAL_GAP = 30;  // Gap orizzontale minimo tra piattaforme
    static MIN_VERTICAL_GAP = 30;     // Gap verticale minimo tra piattaforme

    static clampY(y) {
        return Math.max(this.MIN_Y, Math.min(this.MAX_Y, y));
    }

    static generate(pattern, startX, startY, count, options = {}) {
        const platforms = [];
        const spacing = options.spacing || 100;
        const width = options.width || 250;
        const height = 20;
        const platformType = options.platformType || 'normal';
        const level = options.level || 1;

        const effectiveSpacing = Math.max(spacing, width + this.MIN_HORIZONTAL_GAP);

        const config = { pattern, startX, startY, count, spacing: effectiveSpacing, height, width, platformType, level };
        this.generatePlatforms(config, platforms);

        return platforms;
    }

    static generatePlatforms(config, platforms) {
        const { pattern, startX, startY, count, spacing, height, width, platformType, level } = config;
        for (let i = 0; i < count; i++) {
            const coords = this.calculatePatternCoords({ pattern, i, count, startX, startY, spacing, height, width });
            const specificType = this.determinePlatformType(platformType, i, level);
            const platform = new Platform(coords.x, this.clampY(coords.y), width, height, specificType, i);

            this.initializePlatformProperties(platform, specificType);
            platforms.push(platform);
        }
    }

    static calculatePatternCoords({ pattern, i, count, startX, startY, spacing, height, width }) {
        let x = startX + i * spacing;
        let y = startY;

        const patternHandlers = {
            [PlatformPatterns.STRAIGHT]: () => {
                if (i > 0 && i % 5 === 2) x += spacing * 2.5;
                if (i % 4 === 3) y = startY + (Math.random() - 0.5) * 60;
            },
            [PlatformPatterns.STAIRS_UP]: () => {
                if (i > 0 && i === Math.floor(count / 2)) x += spacing * 2.8;
                y = startY - i * Math.max(45, height + this.MIN_VERTICAL_GAP);
            },
            [PlatformPatterns.STAIRS_DOWN]: () => {
                if (i > 0 && i === Math.floor(count / 2)) x += spacing * 2.8;
                y = startY + i * Math.max(45, height + this.MIN_VERTICAL_GAP);
            },
            [PlatformPatterns.ZIGZAG]: () => {
                if (i > 0 && i % 6 === 3) x += spacing * 2.5;
                const zigLevel = i % 3;
                const offsets = [0, -50, -25];
                y = startY + offsets[zigLevel];
            },
            [PlatformPatterns.GAPS]: () => {
                x = startX + i * spacing * 1.8;
                if (i > 0 && i % 4 === 2) x += spacing * 2;
                y = startY + (i % 2 === 0 ? 0 : -40);
            },
            [PlatformPatterns.WAVE]: () => {
                if (i > 0 && Math.abs(Math.sin(i * 0.6)) > 0.9) x += spacing * 2.2;
                y = startY + Math.sin(i * 0.6) * 70;
            },
            [PlatformPatterns.SPIRAL_UP]: () => {
                if (i > 0 && i === Math.floor(count / 2)) x += spacing * 2.6;
                y = startY - i * 25 + Math.sin(i * 0.9) * 50;
            },
            [PlatformPatterns.SPIRAL_DOWN]: () => {
                if (i > 0 && i === Math.floor(count / 2)) x += spacing * 2.6;
                y = startY + i * 25 + Math.sin(i * 0.9) * 50;
            },
            [PlatformPatterns.SNAKE]: () => {
                const snakePhase = Math.sin(i * 0.45);
                if (i > 0 && Math.abs(snakePhase) < 0.1) x += spacing * 2.3;
                y = startY + snakePhase * 80;
            },
            [PlatformPatterns.DOUBLE_HELIX]: () => {
                const helixAngle = i * 0.5;
                if (i > 0 && i % 4 === 2) x += spacing * 2.4;
                y = (i % 2 === 0) ? startY + Math.sin(helixAngle) * 60 : startY - Math.sin(helixAngle) * 60;
            },
            [PlatformPatterns.VERTICAL_TOWER]: () => {
                const towerCol = i % 2;
                x = startX + towerCol * Math.max(140, width + this.MIN_HORIZONTAL_GAP);
                if (i > 0 && i % 6 === 3) x += spacing * 2.5;
                y = startY - Math.floor(i / 2) * Math.max(55, height + this.MIN_VERTICAL_GAP);
            },
            [PlatformPatterns.SCATTERED]: () => {
                x = startX + i * spacing + (Math.random() - 0.5) * 60;
                if (i > 0 && Math.random() < 0.3) x += spacing * (2 + Math.random() * 1.5);
                y = startY + (Math.random() - 0.5) * 90;
            },
            [PlatformPatterns.PYRAMID]: () => {
                const row = Math.floor(Math.sqrt(i * 2));
                const col = i - (row * (row + 1)) / 2;
                x = startX + col * (spacing * 0.9) - row * (spacing * 0.45);
                if (col === 0 && row > 0) x += spacing * 1.8;
                y = startY - row * Math.max(60, height + this.MIN_VERTICAL_GAP);
            },
            [PlatformPatterns.BRIDGE]: () => {
                x = startX + i * (spacing * 0.7);
                if (i > 0 && i === Math.floor(count / 2)) x += spacing * 2.5;
                y = startY + Math.sin(i * 0.25) * 35;
            }
        };

        const handler = patternHandlers[pattern];
        if (handler) handler();

        return { x, y };
    }

    static determinePlatformType(platformType, i, level) {
        if (platformType !== 'normal' || i <= 2) return platformType;

        const rand = Math.random();
        const typeMap = [
            { condition: level >= 5 && rand < 0.12, type: 'rotating' },
            { condition: level >= 3 && rand < 0.18, type: 'dissolving' },
            { condition: level >= 4 && rand < 0.24, type: 'bouncing' },
            { condition: rand < 0.34, type: 'bouncy' },
            { condition: rand < 0.42, type: 'spring' },
            { condition: level >= 5 && rand < 0.52, type: 'icy' }
        ];

        return typeMap.find(t => t.condition)?.type || platformType;
    }

    static initializePlatformProperties(platform, specificType) {
        if (specificType === 'rotating') {
            platform.isRotating = false;
            platform.rotationSpeed = 0.3 + Math.random() * 0.5;
            platform.rotationAngle = Math.random() * Math.PI * 2;
        } else if (specificType === 'bouncing') {
            platform.isBouncing = true;
            platform.bounceSpeed = 1.5 + Math.random() * 1;
            platform.bounceAmplitude = 20 + Math.random() * 20;
        } else if (specificType === 'dissolving') {
            platform.isDissolving = false;
            platform.dissolveDuration = 0.8;
            platform.dissolveAlpha = 1;
        }
    }
}

/**
 * CollectibleSpawner - Spawna powerup, bonus e monete
 */
class CollectibleSpawner {
    /**
     * Get powerup configuration (duration and cooldown) from PowerupTypes
     */
    static getPowerupConfig(powerupId) {
        // Find powerup config from PowerupTypes
        const powerupEntry = Object.values(PowerupTypes).find(p => p.id === powerupId);

        if (powerupEntry?.duration && powerupEntry?.cooldown) {
            return {
                duration: powerupEntry.duration,
                cooldown: powerupEntry.cooldown
            };
        }

        // Fallback to defaults if not found
        return { duration: 5000, cooldown: 15000 };
    }

    /**
     * Spawna powerup su piattaforme
     */
    static spawnPowerups(platforms, config, levelId) {
        const collectibles = [];
        const availablePowerups = Object.values(PowerupTypes)
            .filter(p => p.unlockLevel <= levelId);

        if (availablePowerups.length === 0) return collectibles;

        const powerupCount = Math.floor(platforms.length * config.powerupFrequency);
        const step = Math.max(1, Math.floor(platforms.length / (powerupCount + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            const randomPowerup = availablePowerups[Math.floor(Math.random() * availablePowerups.length)];
            const powerupConfig = this.getPowerupConfig(randomPowerup.id);

            collectibles.push(createCollectible('powerup', platform.getCenterX(), platform.y - 80, {
                powerupType: randomPowerup.id,
                duration: powerupConfig.duration,
                cooldown: powerupConfig.cooldown
            }));
        }

        return collectibles;
    }

    /**
     * Spawna shield bonus
     */
    static spawnShields(platforms, config) {
        const collectibles = [];
        const shieldCount = Math.floor(platforms.length * config.shieldFrequency);
        const step = Math.max(1, Math.floor(platforms.length / (shieldCount + 1)));


        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('shield', platform.getCenterX(), platform.y - 80, {
                value: 1,
                duration: BonusTypes.SHIELD.duration
            }));
        }

        return collectibles;
    }

    /**
     * Spawna magnet bonus
     */
    static spawnMagnets(platforms, config) {
        const collectibles = [];
        const magnetCount = Math.floor(platforms.length * config.magnetFrequency);
        const step = Math.max(1, Math.floor(platforms.length / (magnetCount + 1)));


        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('magnet', platform.getCenterX(), platform.y - 80, {
                value: 1,
                duration: BonusTypes.MAGNET.duration
            }));
        }

        return collectibles;
    }

    /**
     * Spawna cuori (health)
     */
    static spawnHealth(platforms, config) {
        const collectibles = [];

        // Calcola quanti cuori spawnare
        const healthCount = Math.floor(
            config.healthPerLevel.min +
            Math.random() * (config.healthPerLevel.max - config.healthPerLevel.min + 1)
        );

        if (platforms.length === 0 || healthCount <= 0) {
            return collectibles;
        }

        // Distribuisci i cuori uniformemente attraverso il livello
        const step = Math.max(2, Math.floor(platforms.length / (healthCount + 1)));

        for (let count = 0; count < healthCount; count++) {
            const platformIndex = Math.min(
                step * (count + 1),
                platforms.length - 1
            );

            const platform = platforms[platformIndex];
            collectibles.push(createCollectible('health', platform.getCenterX(), platform.y - 80, {
                value: 1
            }));
        }


        return collectibles;
    }

    /**
     * Spawna monete - VERSIONE DETERMINISTICA
     * Numero fisso di monete basato sul tier del livello
     */
    static spawnCoins(platforms, config, levelId) {
        const collectibles = [];

        // 🎯 BUDGET MONETE FISSO PER TIER
        const coinBudget = this.getCoinBudgetForLevel(levelId, config);

        if (platforms.length === 0 || coinBudget <= 0) {
            return collectibles;
        }

        // Distribuisci monete uniformemente
        const step = Math.max(1, Math.floor(platforms.length / (coinBudget + 1)));

        for (let i = 0; i < coinBudget; i++) {
            const platformIndex = Math.min(
                step * (i + 1),
                platforms.length - 1
            );
            const platform = platforms[platformIndex];

            collectibles.push(createCollectible('coin',
                platform.getCenterX(),
                platform.y - 60,
                { value: 10 }
            ));
        }


        return collectibles;
    }

    /**
     * Calcola budget monete per livello
     */
    static getCoinBudgetForLevel(levelId, config) {
        const tier = LevelGenerator.getDifficultyTier(levelId);

        // Budget base per tier
        const budgetByTier = {
            TUTORIAL: { min: 3, max: 5 },      // Tutorial: 3-5 monete
            EASY: { min: 8, max: 12 },         // Easy: 8-12 monete
            NORMAL: { min: 15, max: 20 },      // Normal: 15-20 monete
            HARD: { min: 20, max: 30 },        // Hard: 20-30 monete
            EXPERT: { min: 30, max: 40 },      // Expert: 30-40 monete
            MASTER: { min: 40, max: 50 }       // Master: 40-50 monete
        };

        const budget = budgetByTier[tier] || { min: 5, max: 10 };

        // Variazione progressiva: cresce con il livello all'interno del tier
        const range = LevelRanges[tier];
        const progress = (levelId - range.start) / (range.end - range.start);

        return Math.floor(budget.min + (budget.max - budget.min) * progress);
    }

    /**
     * Spawna coin rain bonus
     */
    static spawnCoinRains(platforms, config) {
        const collectibles = [];
        const frequency = config.coinRainFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('coinRain', platform.getCenterX(), platform.y - 80, {
                value: 1
            }));
        }

        return collectibles;
    }

    /**
     * Spawna multiplier bonus
     */
    static spawnMultipliers(platforms, config) {
        const collectibles = [];
        const frequency = config.multiplierFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('multiplier', platform.getCenterX(), platform.y - 80, {
                multiplier: 2,
                duration: 15000 // 15 secondi
            }));
        }

        return collectibles;
    }

    /**
     * Spawna rainbow bonus
     */
    static spawnRainbows(platforms, config) {
        const collectibles = [];
        const frequency = config.rainbowFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('rainbow', platform.getCenterX(), platform.y - 80, {
                value: 1
            }));
        }

        return collectibles;
    }

    /**
     * Spawna flight bonus
     */
    static spawnFlightBonuses(platforms, config) {
        const collectibles = [];
        const frequency = config.flightBonusFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('flightBonus', platform.getCenterX(), platform.y - 80, {
                duration: 8000 // 8 secondi
            }));
        }

        return collectibles;
    }

    /**
     * Spawna recharge bonus (ricarica turbo)
     */
    static spawnRechargeBonuses(platforms, config) {
        const collectibles = [];
        const frequency = config.rechargeBonusFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('rechargeBonus', platform.getCenterX(), platform.y - 80, {
                rechargeAmount: 50 // Ricarica 50% turbo
            }));
        }

        return collectibles;
    }

    /**
     * Spawna heart recharge bonus (ricarica cuori)
     */
    static spawnHeartRechargeBonuses(platforms, config) {
        const collectibles = [];
        const frequency = config.heartRechargeBonusFrequency || 0;
        if (frequency === 0) return collectibles;

        const count = Math.floor(platforms.length * frequency);
        const step = Math.max(1, Math.floor(platforms.length / (count + 1)));

        for (let i = step; i < platforms.length; i += step) {
            const platform = platforms[i];
            collectibles.push(createCollectible('heartRechargeBonus', platform.getCenterX(), platform.y - 80, {
                hearts: 1 // Ricarica 1 cuore
            }));
        }

        return collectibles;
    }
}

/**
 * EnemySpawner - Spawna nemici
 */
class EnemySpawner {
    /**
     * Spawna nemici su piattaforme con varietà e distribuzione intelligente
     */
    static spawn(platforms, config, levelId) {
        const enemies = [];
        const safetyZone = config.enemySafetyZone;

        // Determina nemici disponibili per questo livello
        const availableEnemies = Object.values(EnemyTypes)
            .filter(e => e.unlockLevel <= levelId);

        if (availableEnemies.length === 0)
            return enemies;

        // Separa nemici per categoria per distribuzione bilanciata
        const groundEnemies = availableEnemies.filter(e => e.category === 'ground');
        const flyingEnemies = availableEnemies.filter(e => e.category === 'flying');
        const chaserEnemies = availableEnemies.filter(e => e.category === 'chaser');
        const shooterEnemies = availableEnemies.filter(e => e.category === 'turret');
        const jumperEnemies = availableEnemies.filter(e => e.category === 'jumper');

        const enemyCount = Math.floor(
            config.enemyCount.min +
            Math.random() * (config.enemyCount.max - config.enemyCount.min)
        );

        const validPlatforms = platforms.filter((p, idx) => idx >= safetyZone);
        if (validPlatforms.length === 0) return enemies;

        // DISTRIBUZIONE MIGLIORATA: mix di singoli e gruppi

        const platformsPerEnemy = Math.max(1, Math.floor(validPlatforms.length / enemyCount));
        EnemySpawner.distributeEnemiesAcrossPlatforms(enemyCount, platformsPerEnemy, validPlatforms, enemies, {
            availableEnemies,
            flyingEnemies,
            groundEnemies,
            chaserEnemies,
            shooterEnemies,
            jumperEnemies
        });

        return enemies;
    }

    static distributeEnemiesAcrossPlatforms(enemyCount, platformsPerEnemy, validPlatforms, enemies, enemyGroups) {
        const { availableEnemies, flyingEnemies, groundEnemies, chaserEnemies, shooterEnemies, jumperEnemies } = enemyGroups;
        let count = 0;
        for (let i = 0; i < enemyCount; i++) {
            // Distribuisci uniformemente ma con variazione casuale
            const baseIdx = Math.floor(i * platformsPerEnemy);
            const variation = Math.floor(Math.random() * Math.min(platformsPerEnemy, 3));
            const platformIdx = Math.min(baseIdx + variation, validPlatforms.length - 1);
            const platform = validPlatforms[platformIdx];

            // Selezione INTELLIGENTE del tipo nemico basata su posizione e contesto
            let enemyPool = availableEnemies;
            const rand = Math.random();
            const isHighPlatform = platform.y < 300;
            const isLowPlatform = platform.y > 500;

            // Flying enemies preferiti in alto
            if (isHighPlatform && flyingEnemies.length > 0 && rand < 0.5) {
                enemyPool = flyingEnemies;
            }

            // Ground enemies in basso
            else if (isLowPlatform && groundEnemies.length > 0 && rand < 0.4) {
                enemyPool = groundEnemies;
            }

            // Chasers sparsi
            else if (rand < 0.25 && chaserEnemies.length > 0) {
                enemyPool = chaserEnemies;
            }

            // Shooters per varietà
            else if (rand < 0.35 && shooterEnemies.length > 0) {
                enemyPool = shooterEnemies;
            }

            // Jumpers per dinamismo
            else if (rand < 0.45 && jumperEnemies.length > 0) {
                enemyPool = jumperEnemies;
            }

            const randomEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];

            // Variazione verticale per flying enemies
            let yOffset = -30;
            if (randomEnemy.category === 'flying') {
                yOffset = -50 - Math.random() * 80; // Volano più in alto
            }

            enemies.push(createEnemy(
                randomEnemy.id,
                platform.getCenterX() + (Math.random() - 0.5) * 40, // Variazione orizzontale
                platform.y + yOffset,
                platform.index
            ));

            count++;
        }
        return count;
    }
}

/**
 * LevelGenerator - Classe principale per generare livelli
 */
export class LevelGenerator {
    /**
     * Determina il tier di difficoltà per un livello
     */
    static getDifficultyTier(levelId) {
        for (const [tier, range] of Object.entries(LevelRanges)) {
            if (levelId >= range.start && levelId <= range.end) {
                return tier;
            }
        }
        return 'EASY';
    }

    /**
     * Genera un singolo livello
     */
    static generateLevel(levelId) {
        const tier = this.getDifficultyTier(levelId);
        const config = DifficultyConfig[tier];
        const theme = ThemesByTier[tier];

        const level = new Level(
            levelId,
            this.getLevelName(levelId, tier),
            config.tier,
            theme
        );

        // Genera piattaforme CON SEZIONI MULTIPLE per varietà
        const platformCount = Math.floor(
            config.platformCount.min +
            Math.random() * (config.platformCount.max - config.platformCount.min)
        );

        const platforms = this.generateMultiSectionPlatforms(levelId, tier, platformCount, config);
        platforms.forEach(p => level.addPlatform(p));

        // Spawna nemici
        const enemies = EnemySpawner.spawn(platforms, config, levelId);
        enemies.forEach(e => level.addEnemy(e));

        // Spawna ostacoli (palle rosse con spuntoni)
        const obstacleCount = Math.floor(platforms.length * 0.15); // 15% delle piattaforme
        const safetyZone = 3; // Non spawna ostacoli nelle prime 3 piattaforme
        for (let i = 0; i < obstacleCount; i++) {
            const platformIndex = safetyZone + Math.floor(Math.random() * (platforms.length - safetyZone));
            const platform = platforms[platformIndex];
            if (platform && platform.type !== 'BOUNCY') { // Non su piattaforme bouncy
                level.obstacles.push({
                    x: platform.getCenterX() - 20,
                    y: platform.y - 60,
                    width: 40,
                    height: 40,
                    type: 'obstacle',
                    obstacleType: 'spike',
                    platformIndex: platformIndex
                });
            }
        }

        // Spawna powerup e bonus
        const powerups = CollectibleSpawner.spawnPowerups(platforms, config, levelId);
        const shields = CollectibleSpawner.spawnShields(platforms, config);
        const magnets = CollectibleSpawner.spawnMagnets(platforms, config);

        // Spawna i nuovi bonus
        const coinRains = CollectibleSpawner.spawnCoinRains(platforms, config);
        const multipliers = CollectibleSpawner.spawnMultipliers(platforms, config);
        const rainbows = CollectibleSpawner.spawnRainbows(platforms, config);
        const flightBonuses = CollectibleSpawner.spawnFlightBonuses(platforms, config);
        const rechargeBonuses = CollectibleSpawner.spawnRechargeBonuses(platforms, config);
        const heartRechargeBonuses = CollectibleSpawner.spawnHeartRechargeBonuses(platforms, config);

        powerups.forEach(c => level.addCollectible(c));
        shields.forEach(c => level.addCollectible(c));
        magnets.forEach(c => level.addCollectible(c));
        coinRains.forEach(c => level.addCollectible(c));
        multipliers.forEach(c => level.addCollectible(c));
        rainbows.forEach(c => level.addCollectible(c));
        flightBonuses.forEach(c => level.addCollectible(c));
        rechargeBonuses.forEach(c => level.addCollectible(c));
        heartRechargeBonuses.forEach(c => level.addCollectible(c));


        // FORZA almeno 1 cuore in OGNI livello
        const health = CollectibleSpawner.spawnHealth(platforms, config);

        health.forEach(c => level.addCollectible(c));

        // Spawna monete con budget fisso
        const coins = CollectibleSpawner.spawnCoins(platforms, config, levelId);
        coins.forEach(c => level.addCollectible(c));

        // Imposta par time
        level.parTime = config.parTime;

        // NUOVO: Imposta fineLivello in base alla difficoltà CON CRESCITA PROGRESSIVA
        // Ogni livello cresce di ~1 secondo (baseSpeed = 180px/s → +180px per livello)
        // Formula: baseLength + (levelId * incrementPerLevel)
        const baseSpeed = 180; // px/s dalla velocità base del gioco
        const secondsPerLevelGrowth = 1; // Crescita di 1 secondo per livello
        const incrementPerLevel = baseSpeed * secondsPerLevelGrowth; // 180 px per livello

        // Lunghezza base del primo livello (circa 15 secondi)
        const baseLengthFirstLevel = 2700;

        // Calcola la lunghezza per questo livello
        level.fineLivello = baseLengthFirstLevel + (levelId - 1) * incrementPerLevel;

        // Imposta star requirements basati su parTime - VERSIONE BILANCIATA
        level.starRequirements = {
            threeStars: {
                time: config.parTime.threeStars,
                coins: 0.7,  // ✅ 70% monete
                maxDamage: 1  // ✅ Max 1 danno
            },
            twoStars: {
                time: config.parTime.twoStars,
                coins: 0.5,  // ✅ 50% monete
                maxDamage: 3  // ✅ Max 3 danni
            },
            oneStar: {
                time: config.parTime.oneStar,
                coins: 0.3   // ✅ 30% monete
            }
        };

        // Boss levels
        if (levelId % 10 === 0 && levelId > 0) {
            this.makeBossLevel(level, levelId);
        }

        return level.toJSON();
    }

    /**
     * Genera piattaforme divise in MOLTE SEZIONI CORTE per massimo dinamismo
     */
    static generateMultiSectionPlatforms(levelId, tier, totalCount, config) {
        const allPlatforms = [];
        let currentX = 50;
        let currentY = 400; // Partenza più bassa

        // MOLTE sezioni corte (5-12 piattaforme per sezione) per massima varietà
        const platformsPerSectionMap = {
            'TUTORIAL': 8,
            'EASY': 10,
            'NORMAL': 12,
            'HARD': 10,
            'EXPERT': 12,
            'MASTER': 15
        };
        const platformsPerSection = platformsPerSectionMap[tier] || 15;

        const numSections = Math.ceil(totalCount / platformsPerSection);
        const availablePatterns = this.getAvailablePatterns(tier);

        for (let section = 0; section < numSections; section++) {
            const sectionPlatformCount = section === numSections - 1
                ? totalCount - allPlatforms.length  // Ultima sezione prende il resto
                : platformsPerSection;

            // Scegli pattern casuale per questa sezione
            const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

            const spacing = Math.floor(
                config.platformSpacing.min +
                Math.random() * (config.platformSpacing.max - config.platformSpacing.min)
            );
            const width = Math.floor(
                config.platformWidth.min +
                Math.random() * (config.platformWidth.max - config.platformWidth.min)
            );

            const sectionPlatforms = PlatformGenerator.generate(
                pattern,
                currentX,
                currentY,
                sectionPlatformCount,
                { spacing, width, level: levelId }
            );

            // Aggiorna indici globali
            sectionPlatforms.forEach((p, idx) => {
                p.index = allPlatforms.length + idx;
                allPlatforms.push(p);
            });

            // Aggiorna posizione iniziale per la prossima sezione
            if (sectionPlatforms.length > 0) {
                const lastPlatform = sectionPlatforms.at(-1);
                currentX = lastPlatform.x + spacing;
                currentY = lastPlatform.y + (Math.random() - 0.5) * 100; // Varia leggermente l'altezza
            }
        }

        return allPlatforms;
    }

    /**
     * Ottieni pattern disponibili per tier - favorisce pattern dinamici
     */
    static getAvailablePatterns(tier) {
        // Pattern dinamici (usati più spesso)
        const dynamicPatterns = [
            PlatformPatterns.ZIGZAG,
            PlatformPatterns.WAVE,
            PlatformPatterns.STAIRS_UP,
            PlatformPatterns.STAIRS_DOWN,
            PlatformPatterns.SNAKE
        ];

        // Pattern intermedi
        const intermediatePatterns = [
            PlatformPatterns.GAPS,
            PlatformPatterns.BRIDGE,
            PlatformPatterns.SPIRAL_UP,
            PlatformPatterns.SPIRAL_DOWN
        ];

        // Pattern avanzati
        const advancedPatterns = [
            PlatformPatterns.DOUBLE_HELIX,
            PlatformPatterns.SCATTERED,
            PlatformPatterns.VERTICAL_TOWER,
            PlatformPatterns.PYRAMID
        ];

        switch (tier) {
            case 'TUTORIAL':
                // Tutorial: mix di facile e dinamico
                return [
                    PlatformPatterns.STRAIGHT,
                    PlatformPatterns.ZIGZAG,
                    PlatformPatterns.STAIRS_UP
                ];
            case 'EASY':
                // Easy: principalmente dinamici con un po' di straight
                return [
                    ...dynamicPatterns,
                    PlatformPatterns.STRAIGHT,
                    ...intermediatePatterns.slice(0, 2)
                ];
            case 'NORMAL':
                // Normal: molto dinamico
                return [
                    ...dynamicPatterns,
                    ...intermediatePatterns,
                    ...advancedPatterns.slice(0, 2)
                ];
            case 'HARD':
                // Hard: tutti i pattern dinamici e avanzati
                return [
                    ...dynamicPatterns,
                    ...intermediatePatterns,
                    ...advancedPatterns.slice(0, 4)
                ];
            case 'EXPERT':
            case 'MASTER':
                // Expert/Master: tutti i pattern, meno straight
                return [
                    ...dynamicPatterns,
                    ...intermediatePatterns,
                    ...advancedPatterns,
                    PlatformPatterns.STRAIGHT // Solo uno
                ];
            default:
                return dynamicPatterns;
        }
    }

    /**
     * Sceglie pattern per livello
     */
    static choosePattern(levelId, tier) {
        const patterns = [
            PlatformPatterns.STRAIGHT,
            PlatformPatterns.ZIGZAG,
            PlatformPatterns.STAIRS_UP,
            PlatformPatterns.STAIRS_DOWN,
            PlatformPatterns.GAPS
        ];

        return patterns[levelId % patterns.length];
    }

    /**
     * Nome del livello
     */
    static getLevelName(levelId, tier) {
        const range = LevelRanges[tier];
        const worldNum = levelId - range.start + 1;

        if (tier === 'TUTORIAL') return `Tutorial ${worldNum}`;
        if (tier === 'MASTER') return `Master ${worldNum}`;

        const worldMap = {
            EASY: 1,
            NORMAL: 2,
            HARD: 3,
            EXPERT: 4
        };

        return `World ${worldMap[tier]}-${worldNum}`;
    }

    /**
     * Trasforma livello in Boss Level
     */
    static makeBossLevel(level, levelId) {
        level.name = `Boss: Level ${levelId}`;
        level.objectives = ['boss_fight'];

        // Rimuovi tutti i nemici normali
        level.enemies = [];

        // Aggiungi boss alla fine
        if (level.platforms.length > 3) {
            const bossPlatform = level.platforms[level.platforms.length - 2];
            const bossTypes = [
                EnemyTypes.GOLEM?.id,
                EnemyTypes.DRAGON?.id,
                EnemyTypes.SHADOW_LORD?.id,
                EnemyTypes.RAINBOW_KING?.id
            ].filter(Boolean);

            const bossType = bossTypes[Math.floor(levelId / 50) % bossTypes.length] || EnemyTypes.SLUG.id;

            level.addEnemy(createEnemy(bossType, bossPlatform.getCenterX(), bossPlatform.y - 80, bossPlatform.index));
        }
    }

    /**
     * Genera tutti i livelli (1-200)
     */
    static generateAllLevels() {
        const levels = [];
        for (let i = 1; i <= 200; i++) {
            levels.push(this.generateLevel(i));
        }
        return levels;
    }

    /**
     * Decide se generare un ostacolo
     */
    static shouldGenerateObstacle() {
        return Math.random() < 0.15; // 15% chance di spawn ostacolo
    }

    /**
     * Genera un ostacolo
     */
    static generateObstacle(platformX, platformY, platformWidth, velocity) {
        return {
            x: platformX + platformWidth / 2 - 6,
            y: platformY - 40,
            width: 12,
            height: 20,
            type: 'obstacle',
            obstacleType: 'spike',
            color: [0.8, 0.1, 0.1, 1],
            velocity: velocity,
            animationOffset: Math.random() * Math.PI * 2
        };
    }
}
