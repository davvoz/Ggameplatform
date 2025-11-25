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
        this.index = index;
        
        // Proprietà per i nuovi tipi di piattaforma
        this.isDissolving = false;
        this.dissolveTimer = 0;
        this.dissolveDuration = 0.8;
        this.dissolveAlpha = 1.0;
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
 * Classe Enemy - Rappresenta un nemico
 */
class Enemy {
    constructor(type, x, y, platformIndex = 0) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.platformIndex = platformIndex;
    }
}

/**
 * Classe Collectible - Rappresenta un oggetto collezionabile
 */
class Collectible {
    constructor(type, x, y, options = {}) {
        this.type = type;
        this.x = x;
        this.y = y;
        Object.assign(this, options);
    }
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
            threeStars: { time: 20, coins: 1.0, enemies: 1.0, noDamage: true },
            twoStars: { time: 30, coins: 0.8, enemies: 0.7 },
            oneStar: { time: 45, coins: 0.5 }
        };
    }

    addPlatform(platform) {
        this.platforms.push(platform);
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
            starRequirements: this.starRequirements
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
        const level = options.level || 1; // Livello per determinare quali tipi spawnare
        
        // Garantisce che lo spacing effettivo includa sempre la larghezza + gap minimo
        const effectiveSpacing = Math.max(spacing, width + this.MIN_HORIZONTAL_GAP);

        for (let i = 0; i < count; i++) {
            let x = startX;
            let y = startY;

            switch (pattern) {
                case PlatformPatterns.STRAIGHT:
                    // STRAIGHT con GAP ampio periodico
                    x = startX + i * effectiveSpacing;
                    // Ogni 4-5 piattaforme, crea un GAP AMPIO
                    if (i > 0 && i % 5 === 2) {
                        x += effectiveSpacing * 2.5; // GAP LARGO extra
                    }
                    if (i % 4 === 3) {
                        y = startY + (Math.random() - 0.5) * 60;
                    }
                    break;

                case PlatformPatterns.STAIRS_UP:
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO a metà della scala
                    if (i > 0 && i === Math.floor(count / 2)) {
                        x += effectiveSpacing * 2.8; // GAP LARGO
                    }
                    // Garantisce gap verticale minimo
                    y = startY - i * Math.max(45, height + this.MIN_VERTICAL_GAP);
                    break;

                case PlatformPatterns.STAIRS_DOWN:
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO a metà della scala
                    if (i > 0 && i === Math.floor(count / 2)) {
                        x += effectiveSpacing * 2.8; // GAP LARGO
                    }
                    // Garantisce gap verticale minimo
                    y = startY + i * Math.max(45, height + this.MIN_VERTICAL_GAP);
                    break;

                case PlatformPatterns.ZIGZAG:
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO dopo ogni ciclo completo di zigzag
                    if (i > 0 && i % 6 === 3) {
                        x += effectiveSpacing * 2.5; // GAP LARGO
                    }
                    const zigLevel = i % 3;
                    y = startY + (zigLevel === 0 ? 0 : zigLevel === 1 ? -50 : -25);
                    break;

                case PlatformPatterns.GAPS:
                    // Gaps con variazione verticale + GAP EXTRA LARGO
                    x = startX + i * effectiveSpacing * 1.8;
                    // Ogni 4 piattaforme, GAP EXTRA LARGO
                    if (i > 0 && i % 4 === 2) {
                        x += effectiveSpacing * 2.0; // GAP MOLTO LARGO
                    }
                    y = startY + (i % 2 === 0 ? 0 : -40);
                    break;

                case PlatformPatterns.WAVE:
                    // Onda sinusoidale con GAP al picco
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO al picco dell'onda
                    if (i > 0 && Math.abs(Math.sin(i * 0.6)) > 0.9) {
                        x += effectiveSpacing * 2.2; // GAP LARGO al picco
                    }
                    y = startY + Math.sin(i * 0.6) * 70;
                    break;

                case PlatformPatterns.SPIRAL_UP:
                    // Spirale ascendente con GAP
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO a metà spirale
                    if (i > 0 && i === Math.floor(count / 2)) {
                        x += effectiveSpacing * 2.6; // GAP LARGO
                    }
                    y = startY - i * 25 + Math.sin(i * 0.9) * 50;
                    break;

                case PlatformPatterns.SPIRAL_DOWN:
                    // Spirale discendente con GAP
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO a metà spirale
                    if (i > 0 && i === Math.floor(count / 2)) {
                        x += effectiveSpacing * 2.6; // GAP LARGO
                    }
                    y = startY + i * 25 + Math.sin(i * 0.9) * 50;
                    break;

                case PlatformPatterns.SNAKE:
                    // Serpente S con GAP al cambio direzione
                    x = startX + i * effectiveSpacing;
                    // GAP AMPIO al cambio direzione del serpente
                    const snakePhase = Math.sin(i * 0.45);
                    if (i > 0 && Math.abs(snakePhase) < 0.1) {
                        x += effectiveSpacing * 2.3; // GAP LARGO al cambio direzione
                    }
                    y = startY + snakePhase * 80;
                    break;

                case PlatformPatterns.DOUBLE_HELIX:
                    // Doppia elica con GAP al crossover
                    x = startX + i * effectiveSpacing;
                    const helixAngle = i * 0.5;
                    // GAP AMPIO quando le eliche si incrociano
                    if (i > 0 && i % 4 === 2) {
                        x += effectiveSpacing * 2.4; // GAP LARGO al crossover
                    }
                    if (i % 2 === 0) {
                        y = startY + Math.sin(helixAngle) * 60;
                    } else {
                        y = startY - Math.sin(helixAngle) * 60;
                    }
                    break;

                case PlatformPatterns.VERTICAL_TOWER:
                    // Torre verticale con GAP intermedio
                    const towerCol = i % 2;
                    x = startX + towerCol * Math.max(140, width + this.MIN_HORIZONTAL_GAP);
                    // GAP AMPIO dopo ogni 3 livelli verticali
                    if (i > 0 && i % 6 === 3) {
                        x += effectiveSpacing * 2.5; // GAP LARGO verticale
                    }
                    // Garantisce gap verticale minimo
                    y = startY - Math.floor(i / 2) * Math.max(55, height + this.MIN_VERTICAL_GAP);
                    break;

                case PlatformPatterns.SCATTERED:
                    // Piattaforme sparse con GAP EXTRA casuali
                    x = startX + i * effectiveSpacing + (Math.random() - 0.5) * 60;
                    // Ogni 4-5 piattaforme, GAP EXTRA LARGO casuale
                    if (i > 0 && Math.random() < 0.3) {
                        x += effectiveSpacing * (2.0 + Math.random() * 1.5); // GAP MOLTO LARGO casuale
                    }
                    y = startY + (Math.random() - 0.5) * 90;
                    break;

                case PlatformPatterns.PYRAMID:
                    // Piramide con GAP tra righe
                    const row = Math.floor(Math.sqrt(i * 2));
                    const col = i - (row * (row + 1)) / 2;
                    x = startX + col * (effectiveSpacing * 0.9) - row * (effectiveSpacing * 0.45);
                    // GAP AMPIO tra una riga e l'altra
                    if (col === 0 && row > 0) {
                        x += effectiveSpacing * 1.8; // GAP LARGO tra righe
                    }
                    // Garantisce gap verticale minimo tra righe
                    y = startY - row * Math.max(60, height + this.MIN_VERTICAL_GAP);
                    break;

                case PlatformPatterns.BRIDGE:
                    // Ponte con ondulazioni e GAP centrale
                    x = startX + i * (effectiveSpacing * 0.7);
                    // GAP AMPIO al centro del ponte
                    if (i > 0 && i === Math.floor(count / 2)) {
                        x += effectiveSpacing * 2.5; // GAP LARGO centrale
                    }
                    y = startY + Math.sin(i * 0.25) * 35;
                    break;

                default:
                    x = startX + i * effectiveSpacing;
                    y = startY;
            }

            // Determina tipo specifico di piattaforma casualmente
            let specificType = platformType;
            if (platformType === 'normal' && i > 2) { // Non sui primi 3
                const rand = Math.random();
                
                // Dissolving dal livello 3
                if (level >= 3 && rand < 0.06) {
                    specificType = 'dissolving';
                }
                // Bouncing dal livello 4  
                else if (level >= 4 && rand < 0.11) {
                    specificType = 'bouncing';
                }
                // Rotating dal livello 6
                else if (level >= 6 && rand < 0.16) {
                    specificType = 'rotating';
                }
                // Bouncy normale
                else if (rand < 0.25) {
                    specificType = 'bouncy';
                }
                // Spring
                else if (rand < 0.32) {
                    specificType = 'spring';
                }
                // Icy dal livello 5
                else if (level >= 5 && rand < 0.40) {
                    specificType = 'icy';
                }
            }
            
            platforms.push(new Platform(x, this.clampY(y), width, height, specificType, i));
        }

        return platforms;
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

        if (powerupEntry && powerupEntry.duration && powerupEntry.cooldown) {
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

            collectibles.push(new Collectible('powerup', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('shield', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('magnet', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('health', platform.getCenterX(), platform.y - 80, {
                value: 1
            }));
        }


        return collectibles;
    }

    /**
     * Spawna monete
     */
    static spawnCoins(platforms, config) {
        const collectibles = [];

        for (let i = 0; i < platforms.length; i++) {
            if (Math.random() < config.coinFrequency) {
                const platform = platforms[i];
                collectibles.push(new Collectible('coin', platform.getCenterX(), platform.y - 60, {
                    value: 10
                }));
            }
        }

        return collectibles;
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
            collectibles.push(new Collectible('coinRain', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('multiplier', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('rainbow', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('flightBonus', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('rechargeBonus', platform.getCenterX(), platform.y - 80, {
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
            collectibles.push(new Collectible('heartRechargeBonus', platform.getCenterX(), platform.y - 80, {
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

        if (availableEnemies.length === 0) return enemies;

        // Separa nemici per categoria per distribuzione bilanciata
        const groundEnemies = availableEnemies.filter(e => e.category === 'ground');
        const flyingEnemies = availableEnemies.filter(e => e.category === 'flying');
        const chaserEnemies = availableEnemies.filter(e => e.category === 'chaser');
        const specialEnemies = availableEnemies.filter(e =>
            e.category === 'jumper' || e.category === 'turret'
        );

        const enemyCount = Math.floor(
            config.enemyCount.min +
            Math.random() * (config.enemyCount.max - config.enemyCount.min)
        );

        const validPlatforms = platforms.filter((p, idx) => idx >= safetyZone);

        // Distribuzione più dinamica: nemici sparsi in gruppi
        const enemiesPerGroup = 2 + Math.floor(Math.random() * 3); // 2-4 nemici per gruppo
        const numGroups = Math.ceil(enemyCount / enemiesPerGroup);
        const groupSpacing = Math.floor(validPlatforms.length / numGroups);

        let count = 0;
        for (let g = 0; g < numGroups && count < enemyCount; g++) {
            const groupStartIdx = g * groupSpacing;
            const groupSize = Math.min(enemiesPerGroup, enemyCount - count);

            for (let e = 0; e < groupSize && count < enemyCount; e++) {
                const platformIdx = Math.min(
                    groupStartIdx + Math.floor(Math.random() * Math.min(groupSpacing, 5)),
                    validPlatforms.length - 1
                );
                const platform = validPlatforms[platformIdx];

                // Scegli tipo nemico con varietà
                let enemyPool = availableEnemies;
                const rand = Math.random();

                if (rand < 0.4 && groundEnemies.length > 0) {
                    enemyPool = groundEnemies;
                } else if (rand < 0.6 && flyingEnemies.length > 0) {
                    enemyPool = flyingEnemies;
                } else if (rand < 0.75 && chaserEnemies.length > 0) {
                    enemyPool = chaserEnemies;
                } else if (specialEnemies.length > 0) {
                    enemyPool = specialEnemies;
                }

                const randomEnemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];

                enemies.push(new Enemy(
                    randomEnemy.id,
                    platform.getCenterX(),
                    platform.y - 30,
                    platform.index
                ));

                count++;
            }
        }

        return enemies;
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

        // Spawna health - SEMPRE garantito almeno 1 cuore per livello
        const guaranteedHealthThreshold = 30;
        const shouldSpawnHealth = platformCount >= guaranteedHealthThreshold ||
            Math.random() < config.healthFrequency ||
            platformCount >= 10;


        // FORZA almeno 1 cuore in OGNI livello
        const health = CollectibleSpawner.spawnHealth(platforms, config);

        health.forEach(c => level.addCollectible(c));

        // Spawna monete
        const coins = CollectibleSpawner.spawnCoins(platforms, config);
        coins.forEach(c => level.addCollectible(c));

        // Imposta par time
        level.parTime = config.parTime;

        // Imposta star requirements basati su parTime
        level.starRequirements = {
            threeStars: {
                time: config.parTime.threeStars,
                coins: 1.0,
                enemies: 1.0,
                noDamage: true
            },
            twoStars: {
                time: config.parTime.twoStars,
                coins: 0.8,
                enemies: 0.7
            },
            oneStar: {
                time: config.parTime.oneStar,
                coins: 0.5
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
        const platformsPerSection = tier === 'TUTORIAL' ? 8 :
            tier === 'EASY' ? 10 :
                tier === 'NORMAL' ? 12 :
                    tier === 'HARD' ? 10 :
                        tier === 'EXPERT' ? 12 : 15;

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
                const lastPlatform = sectionPlatforms[sectionPlatforms.length - 1];
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

        // Pattern statici (usati raramente)
        const staticPatterns = [
            PlatformPatterns.STRAIGHT
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

            level.addEnemy(new Enemy(bossType, bossPlatform.getCenterX(), bossPlatform.y - 80, bossPlatform.index));
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
}
