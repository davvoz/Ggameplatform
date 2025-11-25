/**
 * ProceduralLevelGenerator - Generates platforms and obstacles procedurally
 * Implements Builder Pattern and Dependency Inversion
 */

// Platform types with different speeds and behaviors
export const PlatformTypes = {
    NORMAL: 'normal',
    FAST: 'fast',
    SLOW: 'slow',
    BOUNCY: 'bouncy',
    CRUMBLING: 'crumbling',
    SPRING: 'spring',
    ICY: 'icy',
    DISSOLVING: 'dissolving',     // Si dissolve quando il player ci sale
    BOUNCING: 'bouncing',          // Oscilla su e giù quando il player ci sale
    ROTATING: 'rotating'            // Ruota quando il player ci sale
};

// Bonus types for collectibles
export const BonusTypes = {
    BOOST: 'boost',
    MAGNET: 'magnet'
};


