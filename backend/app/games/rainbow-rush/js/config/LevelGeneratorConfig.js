/**
 * LevelGeneratorConfig - Configurazione parametrizzata per generazione livelli
 * Segue principi SOLID: Single Responsibility, Open/Closed, Dependency Inversion
 */

/**
 * Configurazione per ogni tier di difficoltà
 * Tutti i parametri sono estensibili senza modificare la logica
 */
export const DifficultyConfig = {
    TUTORIAL: {
        tier: 'tutorial',
        platformCount: { min: 8, max: 10 },
        platformWidth: { min: 280, max: 320 },
        platformSpacing: { min: 150, max: 180 },
        enemyCount: { min: 0, max: 2 },
        enemySafetyZone: 3, // Prime N piattaforme senza nemici
        powerupFrequency: 0.4, // 40% piattaforme hanno powerup
        shieldFrequency: 0.2,
        magnetFrequency: 0.2,
        healthFrequency: 0.5, // 50% livelli hanno cuori
        healthPerLevel: { min: 1, max: 2 },
        coinFrequency: 0.5,
        parTime: { threeStars: 12, twoStars: 18, oneStar: 30 }
    },
    EASY: {
        tier: 'easy',
        platformCount: { min: 15, max: 25 },
        platformWidth: { min: 220, max: 260 },
        platformSpacing: { min: 110, max: 140 },
        enemyCount: { min: 2, max: 8 },
        enemySafetyZone: 3,
        powerupFrequency: 0.35,
        shieldFrequency: 0.25,
        magnetFrequency: 0.25,
        healthFrequency: 0.8,
        healthPerLevel: { min: 2, max: 3 },
        coinFrequency: 0.6,
        parTime: { threeStars: 25, twoStars: 35, oneStar: 55 }
    },
    NORMAL: {
        tier: 'normal',
        platformCount: { min: 18, max: 30 },
        platformWidth: { min: 180, max: 220 },
        platformSpacing: { min: 100, max: 130 },
        enemyCount: { min: 8, max: 15 },
        enemySafetyZone: 3,
        powerupFrequency: 0.30,
        shieldFrequency: 0.30,
        magnetFrequency: 0.30,
        healthFrequency: 0.75,
        healthPerLevel: { min: 2, max: 4 },
        coinFrequency: 0.5,
        parTime: { threeStars: 25, twoStars: 40, oneStar: 60 }
    },
    HARD: {
        tier: 'hard',
        platformCount: { min: 30, max: 45 },
        platformWidth: { min: 150, max: 200 },
        platformSpacing: { min: 70, max: 100 },
        enemyCount: { min: 12, max: 20 },
        enemySafetyZone: 3,
        powerupFrequency: 0.25,
        shieldFrequency: 0.35,
        magnetFrequency: 0.25,
        healthFrequency: 0.9,
        healthPerLevel: { min: 3, max: 5 },
        coinFrequency: 0.4,
        parTime: { threeStars: 14, twoStars: 22, oneStar: 35 }
    },
    EXPERT: {
        tier: 'expert',
        platformCount: { min: 25, max: 35 },
        platformWidth: { min: 120, max: 180 },
        platformSpacing: { min: 60, max: 90 },
        enemyCount: { min: 15, max: 25 },
        enemySafetyZone: 2,
        powerupFrequency: 0.22,
        shieldFrequency: 0.40,
        magnetFrequency: 0.30,
        healthFrequency: 1.0, // Sempre cuori nei livelli expert
        healthPerLevel: { min: 3, max: 5 },
        coinFrequency: 0.3,
        parTime: { threeStars: 12, twoStars: 20, oneStar: 30 }
    },
    MASTER: {
        tier: 'master',
        platformCount: { min: 15, max: 25 },
        platformWidth: { min: 100, max: 160 },
        platformSpacing: { min: 50, max: 80 },
        enemyCount: { min: 18, max: 30 },
        enemySafetyZone: 3,
        powerupFrequency: 0.20,
        shieldFrequency: 0.45,
        magnetFrequency: 0.35,
        healthFrequency: 1.0,
        healthPerLevel: { min: 4, max: 6 },
        coinFrequency: 0.25,
        parTime: { threeStars: 10, twoStars: 18, oneStar: 28 }
    }
};

/**
 * Tipi di powerup disponibili con pesi per spawn casuale
 * Ogni powerup ha: id, weight (probabilità spawn), unlockLevel, duration (ms), cooldown (ms)
 */
export const PowerupTypes = {
    SUPER_JUMP: { id: 'superJump', weight: 1.0, unlockLevel: 1, duration: 6000, cooldown: 12000 },
    FLIGHT: { id: 'flight', weight: 0.8, unlockLevel: 8, duration: 4000, cooldown: 20000 },
    IMMORTALITY: { id: 'immortality', weight: 0.6, unlockLevel: 15, duration: 5000, cooldown: 15000 },
    SPEED_BOOST: { id: 'speedBoost', weight: 0.9, unlockLevel: 20, duration: 5000, cooldown: 15000 },
    TURBO: { id: 'turbo', weight: 1.0, unlockLevel: 10, duration: 5000, cooldown: 15000 }
};

/**
 * Tipi di bonus disponibili con durate configurabili
 */
export const BonusTypes = {
    HEALTH: { id: 'health', weight: 1.0 },
    SHIELD: { id: 'shield', weight: 0.8, duration: 15000 },  // 15 secondi
    MAGNET: { id: 'magnet', weight: 0.7, duration: 10000 }   // 10 secondi
};

/**
 * Pattern di piattaforme
 */
export const PlatformPatterns = {
    STRAIGHT: 'straight',
    STAIRS_UP: 'stairs_up',
    STAIRS_DOWN: 'stairs_down',
    ZIGZAG: 'zigzag',
    GAPS: 'gaps',
    NARROW: 'narrow',
    BOUNCY: 'bouncy',
    ICY: 'icy',
    CRUMBLING: 'crumbling'
};

/**
 * Range livelli per ogni tier
 */
export const LevelRanges = {
    TUTORIAL: { start: 1, end: 3 },
    EASY: { start: 4, end: 15 },
    NORMAL: { start: 16, end: 60 },
    HARD: { start: 61, end: 120 },
    EXPERT: { start: 121, end: 170 },
    MASTER: { start: 171, end: 200 }
};

/**
 * Temi visivi per ogni tier
 */
export const ThemesByTier = {
    TUTORIAL: 'rainbow',
    EASY: 'sky',
    NORMAL: 'forest',
    HARD: 'volcano',
    EXPERT: 'space',
    MASTER: 'rainbow_final'
};
