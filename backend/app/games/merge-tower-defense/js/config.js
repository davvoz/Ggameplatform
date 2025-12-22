/**
 * Game Configuration
 * All game constants and balancing parameters
 */

const CONFIG = {
    // Grid Configuration
    COLS: 7,
    ROWS: 12,
    DEFENSE_ZONE_ROWS: 4,  // Increased from zombie-tower (was 3)
    
    // Game Balance - Inizio più facile, late game difficile
    INITIAL_COINS: 80,  // Aumentato da 40 - 4 torri per iniziare
    INITIAL_ENERGY: 100,  // Ripristinato
    ENERGY_DRAIN_PER_ZOMBIE: 2.0,  // Ridotto da 4.0 - meno punitivo all'inizio
    ENERGY_REGEN_RATE: 0.15,  // Aumentato da 0.05 - regen decente
    
    // Wave Configuration
    BASE_WAVE_ZOMBIES: 6,  // Ridotto da 8 - wave più corte
    WAVE_ZOMBIE_INCREMENT: 3,
    SPAWN_INTERVAL: 800,  // Ridotto da 1000 - spawn più veloce
    
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
        icon: '🔫',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.BASIC.base : null,
        cost: 20,
        damage: 3,
        fireRate: 1500,
        range: 2.5,
        projectileSpeed: 8,
        color: '#00ff88',
        description: 'Balanced, decent vs all',
        costMultiplier: 1.0,
        effectiveness: { HEALER: 1.0, SHIELDED: 0.8, SPLITTER: 1.0, PHASER: 0.7 },
        // Merge strategy: Versatile, okay against everything
    },
    
    RAPID: {
        id: 'RAPID',
        name: 'Rapid',
        icon: '🔥',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.RAPID.base : null,
        cost: 35,
        damage: 2,
        fireRate: 350,
        range: 2.2,
        projectileSpeed: 14,
        color: '#ff8800',
        description: 'Shreds fast targets',
        costMultiplier: 1.3,
        effectiveness: { HEALER: 1.3, SHIELDED: 0.6, SPLITTER: 0.8, PHASER: 1.5 },
        // Merge strategy: COUNTER per FAST zombies e PHASER - high DPS
    },
    
    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper',
        icon: '🎯',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SNIPER.base : null,
        cost: 120,
        damage: 15,
        fireRate: 2800,
        range: 4.5,
        projectileSpeed: 25,
        color: '#0088ff',
        description: 'Assassinates priority targets',
        costMultiplier: 2.0,
        effectiveness: { HEALER: 2.0, SHIELDED: 0.5, SPLITTER: 1.2, PHASER: 0.8 },
        // Merge strategy: COUNTER per HEALER - one-shot priority targets
    },
    
    SPLASH: {
        id: 'SPLASH',
        name: 'Splash',
        icon: '💥',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.SPLASH.base : null,
        cost: 90,
        damage: 5,
        fireRate: 1800,
        range: 3.0,
        splashRadius: 2.2,
        projectileSpeed: 6,
        color: '#ffaa00',
        description: 'Destroys grouped enemies',
        costMultiplier: 1.6,
        effectiveness: { HEALER: 1.1, SHIELDED: 1.3, SPLITTER: 2.0, PHASER: 0.9 },
        // Merge strategy: COUNTER per SPLITTER - AoE prevents split abuse
    },
    
    FREEZE: {
        id: 'FREEZE',
        name: 'Freeze',
        icon: '❄️',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.FREEZE.base : null,
        cost: 65,
        damage: 2,
        fireRate: 1600,
        range: 2.8,
        slowFactor: 0.5,  // Rallenta del 50%
        slowDuration: 2000,
        projectileSpeed: 10,
        color: '#00ddff',
        description: 'Blocks shield regeneration',
        costMultiplier: 1.4,
        effectiveness: { HEALER: 0.8, SHIELDED: 2.0, SPLITTER: 1.0, PHASER: 1.3 },
        // Merge strategy: COUNTER per SHIELDED - previene regen scudo
    },
    
    LASER: {
        id: 'LASER',
        name: 'Laser',
        icon: '🔆',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.LASER.base : null,
        cost: 110,
        damage: 6,
        fireRate: 850,
        range: 4.0,
        piercing: 4,  // Piercing forte
        projectileSpeed: 30,
        color: '#ffff00',
        description: 'Line-piercing laser',
        costMultiplier: 1.8,
        effectiveness: { HEALER: 1.4, SHIELDED: 1.0, SPLITTER: 1.4, PHASER: 1.0 },
        // Merge strategy: Buono vs linee di nemici
    },
    
    ELECTRIC: {
        id: 'ELECTRIC',
        name: 'Electric',
        icon: '⚡',
        sprite: () => window.TowerSpriteLibrary ? window.TowerSpriteLibrary.ELECTRIC.base : null,
        cost: 95,
        damage: 4,
        fireRate: 1300,
        range: 2.9,
        chainTargets: 4,  // Chain a 4 target
        projectileSpeed: 18,
        color: '#aa00ff',
        description: 'Chains between groups',
        costMultiplier: 1.7,
        effectiveness: { HEALER: 1.6, SHIELDED: 0.9, SPLITTER: 1.3, PHASER: 1.1 },
        // Merge strategy: Buono vs nemici raggruppati
    }
};

// EXPONENTIAL COST CALCULATION per gli upgrade
// Formula: baseCost * (costMultiplier) * (2.0 ^ (level - 1))
// Progressione: accessibile all'inizio, costoso in late game
function calculateTowerCost(towerType, level = 1) {
    const config = CANNON_TYPES[towerType];
    if (!config) return 0;
    
    const baseCost = config.cost;
    const multiplier = config.costMultiplier || 1.0;
    
    // Formula esponenziale BILANCIATA:
    // Level 1: baseCost
    // Level 2: baseCost * 2.0 = 2x
    // Level 3: baseCost * 4.0 = 4x
    // Level 4: baseCost * 8.0 = 8x
    // Level 5: baseCost * 16.0 = 16x
    // Level 6: baseCost * 32.0 = 32x
    // Level 7: baseCost * 64.0 = 64x
    const exponentialBase = 2.0;  // Ridotto da 2.5 per renderlo più accessibile
    const levelMultiplier = Math.pow(exponentialBase, level - 1);
    
    return Math.floor(baseCost * multiplier * levelMultiplier);
}

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
        icon: '👹',
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.BOSS.base : null,
        hp: 150,
        speed: 0.4,
        armor: 3,
        reward: 200,
        color: '#ff0000',
        scale: 1.6,
        isBoss: true,
    },
    
    // ===== TACTICAL VARIANTS =====
    
    HEALER: {
        id: 'HEALER',
        name: 'Necromancer',
        icon: '🧙',
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.GRUNT.base : null,
        hp: 15,
        speed: 0.7,
        healRange: 3.0,  // Cura nemici in raggio 3 celle
        healAmount: 3,  // Cura 3 HP ogni 2 secondi
        healInterval: 2000,
        reward: 70,  // Alta ricompensa - PRIORITY TARGET
        color: '#00ffaa',
        scale: 1.1,
        isHealer: true,
    },
    
    SHIELDED: {
        id: 'SHIELDED',
        name: 'Guardian',
        icon: '🛡️',
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.TANK.base : null,
        hp: 20,
        speed: 0.5,
        shield: 30,  // Scudo che deve essere distrutto prima di danneggiare HP
        shieldRegen: 2,  // Rigenera 2 scudo/sec se non colpito per 3sec
        shieldRegenDelay: 3000,
        reward: 55,
        color: '#00aaff',
        scale: 1.2,
        hasShield: true,
    },
    
    SPLITTER: {
        id: 'SPLITTER',
        name: 'Hivemind',
        icon: '🦠',
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.GRUNT.base : null,
        hp: 25,
        speed: 0.6,
        splitCount: 3,  // Si divide in 3 nemici più piccoli alla morte
        splitType: 'FAST',  // Tipo nemico spawn alla divisione
        splitHpPercent: 0.5,  // I figli hanno 50% HP del tipo base
        reward: 45,
        color: '#ff00ff',
        scale: 1.15,
        canSplit: true,
    },
    
    PHASER: {
        id: 'PHASER',
        name: 'Phantom',
        icon: '👻',
        sprite: () => window.EnemySpriteLibrary ? window.EnemySpriteLibrary.FLYER.base : null,
        hp: 12,
        speed: 0.8,
        phaseInterval: 4000,  // Teletrasporta ogni 4 secondi
        phaseDistance: 2.5,  // Avanza di 2.5 celle
        phaseInvulnerable: 500,  // Invulnerabile per 0.5sec dopo teletrasporto
        reward: 65,
        color: '#aa00ff',
        scale: 1.0,
        canPhase: true,
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
