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
    static MIN_Y = 100;
    static MAX_Y = 650;
    
    static clampY(y) {
        return Math.max(this.MIN_Y, Math.min(this.MAX_Y, y));
    }
    
    static generate(pattern, startX, startY, count, options = {}) {
        const platforms = [];
        const spacing = options.spacing || 100;
        const width = options.width || 250;
        const height = 20;
        const platformType = options.platformType || 'normal';
        
        for (let i = 0; i < count; i++) {
            let x = startX;
            let y = startY;
            
            switch (pattern) {
                case PlatformPatterns.STRAIGHT:
                    x = startX + i * spacing;
                    y = startY;
                    break;
                    
                case PlatformPatterns.STAIRS_UP:
                    x = startX + i * spacing;
                    y = startY - i * 50;
                    break;
                    
                case PlatformPatterns.STAIRS_DOWN:
                    x = startX + i * spacing;
                    y = startY + i * 50;
                    break;
                    
                case PlatformPatterns.ZIGZAG:
                    x = startX + i * spacing;
                    y = startY + ((i % 2 === 0) ? 0 : -60);
                    break;
                    
                case PlatformPatterns.GAPS:
                    x = startX + i * spacing * 2;
                    y = startY;
                    break;
                    
                default:
                    x = startX + i * spacing;
                    y = startY;
            }
            
            platforms.push(new Platform(x, this.clampY(y), width, height, platformType, i));
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
}

/**
 * EnemySpawner - Spawna nemici
 */
class EnemySpawner {
    /**
     * Spawna nemici su piattaforme
     */
    static spawn(platforms, config, levelId) {
        const enemies = [];
        const safetyZone = config.enemySafetyZone;
        
        // Determina nemici disponibili per questo livello
        const availableEnemies = Object.values(EnemyTypes)
            .filter(e => e.unlockLevel <= levelId);
        
        if (availableEnemies.length === 0) return enemies;
        
        const enemyCount = Math.floor(
            config.enemyCount.min + 
            Math.random() * (config.enemyCount.max - config.enemyCount.min)
        );
        
        const validPlatforms = platforms.filter((p, idx) => idx >= safetyZone);
        const step = Math.max(1, Math.floor(validPlatforms.length / (enemyCount + 1)));
        
        for (let i = 0, count = 0; i < validPlatforms.length && count < enemyCount; i += step, count++) {
            const platform = validPlatforms[i];
            const randomEnemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            
            enemies.push(new Enemy(
                randomEnemy.id,
                platform.getCenterX(),
                platform.y - 30,
                platform.index
            ));
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
        
        // Genera piattaforme
        const platformCount = Math.floor(
            config.platformCount.min + 
            Math.random() * (config.platformCount.max - config.platformCount.min)
        );
        
        const pattern = this.choosePattern(levelId, tier);
        const spacing = Math.floor(
            config.platformSpacing.min + 
            Math.random() * (config.platformSpacing.max - config.platformSpacing.min)
        );
        const width = Math.floor(
            config.platformWidth.min + 
            Math.random() * (config.platformWidth.max - config.platformWidth.min)
        );
        
        const platforms = PlatformGenerator.generate(pattern, 50, 450, platformCount, {
            spacing,
            width
        });
        
        platforms.forEach(p => level.addPlatform(p));
        
        // Spawna nemici
        const enemies = EnemySpawner.spawn(platforms, config, levelId);
        enemies.forEach(e => level.addEnemy(e));
        
        // Spawna powerup e bonus
        const powerups = CollectibleSpawner.spawnPowerups(platforms, config, levelId);
        const shields = CollectibleSpawner.spawnShields(platforms, config);
        const magnets = CollectibleSpawner.spawnMagnets(platforms, config);
        
        powerups.forEach(c => level.addCollectible(c));
        shields.forEach(c => level.addCollectible(c));
        magnets.forEach(c => level.addCollectible(c));
        
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
