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
        platformCount: { min: 8, max: 12 },
        platformWidth: { min: 280, max: 320 },
        platformSpacing: { min: 150, max: 180 },
        enemyCount: { min: 0, max: 3 },
        enemySafetyZone: 3,

        powerupFrequency: 0.05,
        shieldFrequency: 0.03,
        magnetFrequency: 0.03,
        healthFrequency: 0.10,
        coinRainFrequency: 0.02,
        multiplierFrequency: 0.01,
        rainbowFrequency: 0.01,
        flightBonusFrequency: 0.01,
        rechargeBonusFrequency: 0.02,
        heartRechargeBonusFrequency: 0.02,

        healthPerLevel: { min: 1, max: 2 },
        coinFrequency: 0.26,

        parTime: { threeStars: 12, twoStars: 18, oneStar: 30 }
    },

    EASY: {
        tier: 'easy',
        platformCount: { min: 50, max: 80 },        // Più del doppio!
        platformWidth: { min: 200, max: 280 },
        platformSpacing: { min: 90, max: 130 },     // Più ravvicinati
        enemyCount: { min: 8, max: 18 },
        enemySafetyZone: 3,

        powerupFrequency: 0.05,                      // Più powerup
        shieldFrequency: 0.04,
        magnetFrequency: 0.04,
        healthFrequency: 0.15,
        boostFrequency: 0.06,                        // Più boost per dinamismo
        coinRainFrequency: 0.03,
        multiplierFrequency: 0.02,
        rainbowFrequency: 0.015,
        flightBonusFrequency: 0.02,
        rechargeBonusFrequency: 0.025,
        heartRechargeBonusFrequency: 0.03,

        healthPerLevel: { min: 3, max: 5 },
        coinFrequency: 0.35,                         // Più monete

        parTime: { threeStars: 50, twoStars: 75, oneStar: 110 }
    },

    NORMAL: {
        tier: 'normal',
        platformCount: { min: 80, max: 120 },       // Triplo!
        platformWidth: { min: 160, max: 240 },
        platformSpacing: { min: 80, max: 120 },
        enemyCount: { min: 20, max: 35 },
        enemySafetyZone: 3,

        powerupFrequency: 0.045,
        shieldFrequency: 0.045,
        magnetFrequency: 0.045,
        healthFrequency: 0.13,
        boostFrequency: 0.07,
        coinRainFrequency: 0.035,
        multiplierFrequency: 0.025,
        rainbowFrequency: 0.02,
        flightBonusFrequency: 0.025,
        rechargeBonusFrequency: 0.03,
        heartRechargeBonusFrequency: 0.035,

        healthPerLevel: { min: 4, max: 6 },
        coinFrequency: 0.30,

        parTime: { threeStars: 60, twoStars: 90, oneStar: 130 }
    },

    HARD: {
        tier: 'hard',
        platformCount: { min: 120, max: 180 },      // Molto più lungo!
        platformWidth: { min: 140, max: 210 },
        platformSpacing: { min: 70, max: 110 },
        enemyCount: { min: 35, max: 55 },
        enemySafetyZone: 3,

        powerupFrequency: 0.04,
        shieldFrequency: 0.055,
        magnetFrequency: 0.04,
        healthFrequency: 0.16,
        boostFrequency: 0.065,
        coinRainFrequency: 0.04,
        multiplierFrequency: 0.03,
        rainbowFrequency: 0.025,
        flightBonusFrequency: 0.03,
        rechargeBonusFrequency: 0.035,
        heartRechargeBonusFrequency: 0.04,

        healthPerLevel: { min: 5, max: 8 },
        coinFrequency: 0.25,

        parTime: { threeStars: 70, twoStars: 105, oneStar: 150 }
    },

    EXPERT: {
        tier: 'expert',
        platformCount: { min: 180, max: 250 },      // Livelli epici!
        platformWidth: { min: 120, max: 190 },
        platformSpacing: { min: 60, max: 100 },
        enemyCount: { min: 50, max: 80 },
        enemySafetyZone: 2,

        powerupFrequency: 0.035,
        shieldFrequency: 0.06,
        magnetFrequency: 0.045,
        healthFrequency: 0.17,
        boostFrequency: 0.06,
        coinRainFrequency: 0.045,
        multiplierFrequency: 0.035,
        rainbowFrequency: 0.03,
        flightBonusFrequency: 0.035,
        rechargeBonusFrequency: 0.04,
        heartRechargeBonusFrequency: 0.045,

        healthPerLevel: { min: 6, max: 10 },
        coinFrequency: 0.22,

        parTime: { threeStars: 85, twoStars: 125, oneStar: 180 }
    },

    MASTER: {
        tier: 'master',
        platformCount: { min: 250, max: 350 },      // Livelli MASTODONTICI!
        platformWidth: { min: 100, max: 170 },
        platformSpacing: { min: 50, max: 90 },
        enemyCount: { min: 80, max: 120 },
        enemySafetyZone: 3,

        powerupFrequency: 0.03,
        shieldFrequency: 0.065,
        magnetFrequency: 0.05,
        healthFrequency: 0.18,
        boostFrequency: 0.055,
        coinRainFrequency: 0.05,
        multiplierFrequency: 0.04,
        rainbowFrequency: 0.035,
        flightBonusFrequency: 0.04,
        rechargeBonusFrequency: 0.045,
        heartRechargeBonusFrequency: 0.05,

        healthPerLevel: { min: 8, max: 12 },
        coinFrequency: 0.20,

        parTime: { threeStars: 100, twoStars: 150, oneStar: 220 }
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
    CRUMBLING: 'crumbling',
    WAVE: 'wave',              // Onda sinusoidale
    SPIRAL_UP: 'spiral_up',    // Spirale verso l'alto
    SPIRAL_DOWN: 'spiral_down',// Spirale verso il basso
    PLATFORM_MAZE: 'maze',     // Labirinto di piattaforme
    VERTICAL_TOWER: 'tower',   // Torre verticale
    SNAKE: 'snake',            // Serpente
    DOUBLE_HELIX: 'helix',     // Doppia elica
    SCATTERED: 'scattered',    // Piattaforme sparse
    BRIDGE: 'bridge',          // Ponte lungo
    PYRAMID: 'pyramid'         // Piramide
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
