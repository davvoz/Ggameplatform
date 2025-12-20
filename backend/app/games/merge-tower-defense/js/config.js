/**
 * Game Configuration
 * All game constants and balancing parameters
 */

const CONFIG = {
    // Grid Configuration
    COLS: 7,
    ROWS: 12,
    DEFENSE_ZONE_ROWS: 4,  // Increased from zombie-tower (was 3)
    
    // Game Balance
    INITIAL_COINS: 150,
    INITIAL_ENERGY: 100,
    ENERGY_DRAIN_PER_ZOMBIE: 1.5,
    ENERGY_REGEN_RATE: 0.2,  // Regen per second when no zombies past line
    
    // Wave Configuration
    BASE_WAVE_ZOMBIES: 8,
    WAVE_ZOMBIE_INCREMENT: 3,
    SPAWN_INTERVAL: 1200,
    
    // Performance
    MAX_PARTICLES: 200,
    MAX_PROJECTILES: 100,
    PARTICLE_POOL_SIZE: 300,
    
    // Visual
    CELL_BORDER: 1,
    GRID_LINE_WIDTH: 1,
    DEFENSE_LINE_WIDTH: 3,
    
    // Colors
    COLORS: {
        BACKGROUND: '#0a0a0a',
        GRID_LINE: 'rgba(0, 255, 136, 0.15)',
        DEFENSE_LINE: 'rgba(255, 0, 0, 0.6)',
        DEFENSE_ZONE: 'rgba(0, 255, 136, 0.08)',
        SPAWN_ZONE: 'rgba(255, 100, 100, 0.08)',
        TEXT_PRIMARY: '#00ff88',
        TEXT_SECONDARY: '#88ffbb',
        TEXT_WARNING: '#ffaa00',
        TEXT_DANGER: '#ff3333',
        BUTTON_BG: '#1a1a2e',
        BUTTON_BORDER: '#00ff88',
        BUTTON_ACTIVE: '#00ff88',
        SELECTION: 'rgba(0, 255, 136, 0.4)',
    }
};

// Cannon Types - Strategic variety with unique roles
const CANNON_TYPES = {
    BASIC: {
        id: 'BASIC',
        name: 'Basic',
        icon: '🔫', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.BASIC.base : null,
        cost: 25,
        damage: 3,
        fireRate: 1000,
        range: 3,
        projectileSpeed: 10,
        color: '#00ff88',
        description: 'Balanced turret',
        // Merge strategy: Good starting tower, efficient economy
    },
    
    RAPID: {
        id: 'RAPID',
        name: 'Rapid',
        icon: '⚡', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.RAPID.base : null,
        cost: 50,
        damage: 2,
        fireRate: 400,
        range: 2.5,
        projectileSpeed: 14,
        color: '#00ddff',
        description: 'High fire rate',
        // Merge strategy: Volume damage, good vs swarms
    },
    
    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper',
        icon: '🎯', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SNIPER.base : null,
        cost: 80,
        damage: 12,
        fireRate: 2500,
        range: 6,
        projectileSpeed: 20,
        color: '#ff0066',
        description: 'Long range power',
        // Merge strategy: Back line support, high single-target
    },
    
    SPLASH: {
        id: 'SPLASH',
        name: 'Splash',
        icon: '💥', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SPLASH.base : null,
        cost: 120,
        damage: 8,
        fireRate: 1800,
        range: 3,
        splashRadius: 1.5,
        projectileSpeed: 8,
        color: '#ff8800',
        description: 'Area damage',
        // Merge strategy: Crowd control, strategic positioning
    },
    
    FREEZE: {
        id: 'FREEZE',
        name: 'Freeze',
        icon: '❄️', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.FREEZE.base : null,
        cost: 100,
        damage: 2,
        fireRate: 1500,
        range: 3.5,
        slowFactor: 0.5,
        slowDuration: 2000,
        projectileSpeed: 12,
        color: '#aaffff',
        description: 'Slows enemies',
        // Merge strategy: Support, combos with other towers
    },
    
    LASER: {
        id: 'LASER',
        name: 'Laser',
        icon: '🔆', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.LASER.base : null,
        cost: 150,
        damage: 6,
        fireRate: 600,
        range: 5,
        piercing: 3,  // Hits multiple enemies
        projectileSpeed: 25,
        color: '#ffff00',
        description: 'Piercing beam',
        // Merge strategy: Line control, efficient vs groups
    },
    
    ELECTRIC: {
        id: 'ELECTRIC',
        name: 'Electric',
        icon: '⚡', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.ELECTRIC.base : null,
        cost: 140,
        damage: 5,
        fireRate: 1200,
        range: 3,
        chainTargets: 4,  // Chains to nearby enemies
        projectileSpeed: 15,
        color: '#aa00ff',
        description: 'Chains to enemies',
        // Merge strategy: High value vs clustered enemies
    }
};

// Zombie Types - Progressive difficulty curve
const ZOMBIE_TYPES = {
    NORMAL: {
        id: 'NORMAL',
        name: 'Shambler',
        icon: '🧟', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.GRUNT.base : null,
        hp: 8,
        speed: 0.5,
        reward: 15,
        color: '#00ff00',
        scale: 1.0,
    },
    
    FAST: {
        id: 'FAST',
        name: 'Runner',
        icon: '🧟‍♂️', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.RUSHER.base : null,
        hp: 5,
        speed: 1.2,
        reward: 25,
        color: '#ffff00',
        scale: 0.9,
    },
    
    TANK: {
        id: 'TANK',
        name: 'Brute',
        icon: '🧟‍♀️', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.TANK.base : null,
        hp: 35,
        speed: 0.3,
        reward: 60,
        color: '#ff0000',
        scale: 1.3,
    },
    
    AGILE: {
        id: 'AGILE',
        name: 'Leaper',
        icon: '🦇', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.FLYER.base : null,
        hp: 12,
        speed: 1.0,
        dodgeChance: 0.25,  // Can dodge projectiles
        reward: 40,
        color: '#ff00ff',
        scale: 0.85,
    },
    
    ARMORED: {
        id: 'ARMORED',
        name: 'Juggernaut',
        icon: '🛡️', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.TANK.base : null,
        hp: 50,
        speed: 0.25,
        armor: 5,  // Reduces damage
        reward: 80,
        color: '#888888',
        scale: 1.4,
    },
    
    BOSS: {
        id: 'BOSS',
        name: 'Overlord',
        icon: '👹', // Legacy fallback
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.BOSS.base : null,
        hp: 150,
        speed: 0.4,
        armor: 3,
        reward: 200,
        color: '#ff0000',
        scale: 1.6,
        isBoss: true,
    }
};

// Level progression for merge system
const MERGE_LEVELS = [
    { level: 1, damageMultiplier: 1.0, rangeBonus: 0, fireRateBonus: 1.0, icon: '⭐' },
    { level: 2, damageMultiplier: 2.2, rangeBonus: 0.5, fireRateBonus: 1.15, icon: '✨' },
    { level: 3, damageMultiplier: 4.5, rangeBonus: 1.0, fireRateBonus: 1.35, icon: '💫' },
    { level: 4, damageMultiplier: 9.0, rangeBonus: 1.5, fireRateBonus: 1.6, icon: '⚡' },
    { level: 5, damageMultiplier: 18.0, rangeBonus: 2.0, fireRateBonus: 2.0, icon: '🌟' },
    { level: 6, damageMultiplier: 35.0, rangeBonus: 2.5, fireRateBonus: 2.5, icon: '🔥' },
    { level: 7, damageMultiplier: 70.0, rangeBonus: 3.0, fireRateBonus: 3.0, icon: '💎' },
];

// Special abilities unlocked at higher levels
const SPECIAL_ABILITIES = {
    MULTISHOT: {
        name: 'Multi-Shot',
        minLevel: 3,
        description: 'Fires multiple projectiles',
        applyTo: ['BASIC', 'RAPID'],
    },
    EXPLOSIVE: {
        name: 'Explosive Rounds',
        minLevel: 4,
        description: 'Projectiles explode on impact',
        applyTo: ['SNIPER', 'SPLASH'],
    },
    CHAIN_LIGHTNING: {
        name: 'Enhanced Chain',
        minLevel: 4,
        description: 'Chains to more targets',
        applyTo: ['ELECTRIC'],
    },
    PERMAFROST: {
        name: 'Permafrost',
        minLevel: 5,
        description: 'Freezes enemies solid',
        applyTo: ['FREEZE'],
    },
};

// UI Configuration
const UI_CONFIG = {
    TOP_BAR_HEIGHT: 80,
    SHOP_HEIGHT: 120,
    STAT_PANEL_WIDTH: 100,
    BUTTON_SIZE: 80,
    BUTTON_SPACING: 8,
    FONT_FAMILY: 'Arial, sans-serif',
    FONT_SIZE_LARGE: 24,
    FONT_SIZE_MEDIUM: 16,
    FONT_SIZE_SMALL: 12,
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, CANNON_TYPES, ZOMBIE_TYPES, MERGE_LEVELS, SPECIAL_ABILITIES, UI_CONFIG };
}
