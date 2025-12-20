/**
 * Game Configuration
 * All game constants and balancing parameters
 */

const CONFIG = {
    // Grid Configuration
    COLS: 7,
    ROWS: 12,
    DEFENSE_ZONE_ROWS: 4,  // Increased from zombie-tower (was 3)
    
    // Game Balance - NIGHTMARE MODE: Impossibile con una sola strategia
    INITIAL_COINS: 50,  // Ridotto da 60 - Solo 2 torri base!
    INITIAL_ENERGY: 100,
    ENERGY_DRAIN_PER_ZOMBIE: 3.0,  // Aumentato da 2.5
    ENERGY_REGEN_RATE: 0.1,  // Ridotto da 0.15 - regen molto più lento
    
    // Wave Configuration
    BASE_WAVE_ZOMBIES: 10,  // Aumentato da 10
    WAVE_ZOMBIE_INCREMENT: 3,
    SPAWN_INTERVAL: 1500,  // Ridotto da 1000 - spawning MOLTO più veloce
    
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
// NOTA: I costi usano una curva ESPONENZIALE AGGRESSIVA per gli upgrade
// Formula costo: baseCost * (2.0 ^ (level - 1)) * complexityMultiplier
const CANNON_TYPES = {
    BASIC: {
        id: 'BASIC',
        name: 'Basic',
        icon: '🔫', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.BASIC.base : null,
        cost: 20,  // Manteniamo basso per permettere l'inizio
        damage: 2,  // Ridotto da 3 - torri più deboli
        fireRate: 1200,  // Aumentato da 1000 - spara più lentamente
        range: 2.8,  // Ridotto da 3
        projectileSpeed: 10,
        color: '#00ff88',
        description: 'Balanced turret',
        costMultiplier: 1.0, // Moltiplicatore di costo per tipo
        // Merge strategy: Good starting tower, efficient economy
    },
    
    RAPID: {
        id: 'RAPID',
        name: 'Rapid',
        icon: '⚡', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.RAPID.base : null,
        cost: 55,  // Aumentato da 40
        damage: 1.5,  // Ridotto da 2
        fireRate: 500,  // Aumentato da 400 - meno rapido
        range: 2.3,  // Ridotto da 2.5
        projectileSpeed: 14,
        color: '#00ddff',
        description: 'High fire rate',
        costMultiplier: 1.3,  // Aumentato da 1.1
        // Merge strategy: Volume damage, good vs swarms
    },
    
    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper',
        icon: '🎯', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SNIPER.base : null,
        cost: 150,  // DRASTICAMENTE aumentato da 100 - quasi 3x BASIC!
        damage: 8,  // Ridotto ulteriormente da 10
        fireRate: 3200,  // Aumentato da 2800 - MOLTO più lento
        range: 5.0,  // Ridotto da 5.5
        projectileSpeed: 18,  // Ridotto da 20 - più lento
        color: '#ff0066',
        description: 'Long range power',
        costMultiplier: 2.2,  // DRASTICAMENTE aumentato da 1.6 - il più costoso!
        // Merge strategy: Back line support, high single-target
    },
    
    SPLASH: {
        id: 'SPLASH',
        name: 'Splash',
        icon: '💥', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SPLASH.base : null,
        cost: 140,  // Aumentato da 95
        damage: 6,  // Ridotto da 8
        fireRate: 2000,  // Aumentato da 1800 - più lento
        range: 2.8,  // Ridotto da 3
        splashRadius: 1.3,  // Ridotto da 1.5
        projectileSpeed: 8,
        color: '#ff8800',
        description: 'Area damage',
        costMultiplier: 1.7,  // Aumentato da 1.4
        // Merge strategy: Crowd control, strategic positioning
    },
    
    FREEZE: {
        id: 'FREEZE',
        name: 'Freeze',
        icon: '❄️', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.FREEZE.base : null,
        cost: 110,  // Aumentato da 80
        damage: 1,  // Ridotto da 2
        fireRate: 1800,  // Aumentato da 1500 - più lento
        range: 3.2,  // Ridotto da 3.5
        slowFactor: 0.6,  // Aumentato da 0.5 - slow meno efficace
        slowDuration: 1800,  // Ridotto da 2000
        projectileSpeed: 12,
        color: '#aaffff',
        description: 'Slows enemies',
        costMultiplier: 1.5,  // Aumentato da 1.25
        // Merge strategy: Support, combos with other towers
    },
    
    LASER: {
        id: 'LASER',
        name: 'Laser',
        icon: '🔆', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.LASER.base : null,
        cost: 180,  // Aumentato da 120
        damage: 5,  // Ridotto da 6
        fireRate: 750,  // Aumentato da 600 - meno rapido
        range: 4.5,  // Ridotto da 5
        piercing: 2,  // Ridotto da 3 - penetra meno nemici
        projectileSpeed: 25,
        color: '#ffff00',
        description: 'Piercing beam',
        costMultiplier: 2.0,  // Aumentato da 1.5
        // Merge strategy: Line control, efficient vs groups
    },
    
    ELECTRIC: {
        id: 'ELECTRIC',
        name: 'Electric',
        icon: '⚡', // Legacy fallback
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.ELECTRIC.base : null,
        cost: 160,  // Aumentato da 110
        damage: 4,  // Ridotto da 5
        fireRate: 1400,  // Aumentato da 1200 - più lento
        range: 2.8,  // Ridotto da 3
        chainTargets: 3,  // Ridotto da 4 - catena a meno nemici
        projectileSpeed: 15,
        color: '#aa00ff',
        description: 'Chains to enemies',
        costMultiplier: 1.9,  // Aumentato da 1.45
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
// NOTA: Moltiplicatori aumentati per bilanciare la nuova difficoltà logaritmica dei nemici
// e i costi esponenziali degli upgrade
const MERGE_LEVELS = [
    { level: 1, damageMultiplier: 1.0, rangeBonus: 0, fireRateBonus: 1.0, icon: '⭐' },
    { level: 2, damageMultiplier: 2.5, rangeBonus: 0.5, fireRateBonus: 1.2, icon: '✨' },
    { level: 3, damageMultiplier: 6.0, rangeBonus: 1.0, fireRateBonus: 1.5, icon: '💫' },
    { level: 4, damageMultiplier: 14.0, rangeBonus: 1.5, fireRateBonus: 1.85, icon: '⚡' },
    { level: 5, damageMultiplier: 30.0, rangeBonus: 2.0, fireRateBonus: 2.3, icon: '🌟' },
    { level: 6, damageMultiplier: 60.0, rangeBonus: 2.5, fireRateBonus: 2.9, icon: '🔥' },
    { level: 7, damageMultiplier: 120.0, rangeBonus: 3.0, fireRateBonus: 3.6, icon: '💎' },
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
