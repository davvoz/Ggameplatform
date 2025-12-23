/**
 * Game Configuration
 * All game constants and balancing parameters
 */

export const CONFIG = {
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
import { TowerSpriteLibrary } from './tower-sprites.js';
import { EnemySpriteLibrary } from './enemy-sprites.js';

export const CANNON_TYPES = {
    BASIC: {
        id: 'BASIC',
        name: 'Basic',
        icon: '🔫',
        sprite: () => TowerSpriteLibrary.BASIC.base,
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
        sprite: () => TowerSpriteLibrary.RAPID.base,
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
        sprite: () => TowerSpriteLibrary.SNIPER.base,
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
        sprite: () => TowerSpriteLibrary.SPLASH.base,
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
        sprite: () => TowerSpriteLibrary.FREEZE.base,
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
        sprite: () => TowerSpriteLibrary.LASER.base,
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
        sprite: () => TowerSpriteLibrary.ELECTRIC.base,
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


// Zombie Types - Progressive difficulty curve
export const ZOMBIE_TYPES = {
    NORMAL: {
        id: 'NORMAL',
        name: 'Shambler',
        icon: '🧟', // Legacy fallback
        sprite: () => EnemySpriteLibrary.GRUNT.base,
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
        sprite: () => EnemySpriteLibrary.RUSHER.base,
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
        sprite: () => EnemySpriteLibrary.TANK.base,
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
        sprite: () => EnemySpriteLibrary.FLYER.base,
        hp: 12,
        speed: 1.0,
        dodgeChance: 0.25,  // Can dodge projectiles
        reward: 40,
        color: '#ff00ff',
        scale: 1.2,
    },
    
    ARMORED: {
        id: 'ARMORED',
        name: 'Juggernaut',
        icon: '🛡️', // Legacy fallback
        sprite: () => EnemySpriteLibrary.TANK.base,
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
        sprite: () => EnemySpriteLibrary.BOSS.base,
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
        sprite: () => EnemySpriteLibrary.GRUNT.base,
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
        sprite: () => EnemySpriteLibrary.TANK.base,
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
        sprite: () => EnemySpriteLibrary.GRUNT.base,
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
        sprite: () => EnemySpriteLibrary.FLYER.base,
        hp: 12,
        speed: 0.8,
        phaseInterval: 4000,  // Teletrasporta ogni 4 secondi
        phaseDistance: 2.5,  // Avanza di 2.5 celle
        phaseInvulnerable: 500,  // Invulnerabile per 0.5sec dopo teletrasporto
        reward: 65,
        color: '#aa00ff',
        scale: 1.0,
        canPhase: true,
    },
    
    // ===== NEW UNIQUE ENEMIES =====
    
    VAMPIRE: {
        id: 'VAMPIRE',
        name: 'Bloodlord',
        icon: '🧛',
        sprite: () => EnemySpriteLibrary.VAMPIRE.base,
        hp: 22,
        speed: 0.7,
        lifesteal: 0.3,  // Ruba 30% del danno subito come HP quando attacca
        lifestealRange: 2.0,  // Range di attacco per rubare vita
        reward: 75,
        color: '#8B0000',
        scale: 1.15,
        isVampire: true,
    },
    
    BOMBER: {
        id: 'BOMBER',
        name: 'Detonator',
        icon: '💣',
        sprite: () => EnemySpriteLibrary.BOMBER.base,
        hp: 18,
        speed: 0.9,
        explosionRadius: 2.0,  // Esplode alla morte danneggiando torrette vicine
        explosionDamage: 15,  // Danno alle torrette nell'esplosione
        reward: 50,
        color: '#FF4500',
        scale: 1.1,
        isBomber: true,
    },
    
    SHADOW: {
        id: 'SHADOW',
        name: 'Nightcrawler',
        icon: '🌑',
        sprite: () => EnemySpriteLibrary.SHADOW.base,
        hp: 10,
        speed: 1.1,
        invisDuration: 2500,  // Invisibile per 2.5 secondi
        invisCooldown: 5000,  // Cooldown tra invisibilità
        reward: 55,
        color: '#1a1a2e',
        scale: 0.95,
        canInvis: true,
    },
    
    SIREN: {
        id: 'SIREN',
        name: 'Banshee',
        icon: '👻',
        sprite: () => EnemySpriteLibrary.SIREN.base,
        hp: 14,
        speed: 0.6,
        disableRange: 2.5,  // Range del grido paralizzante
        disableDuration: 1500,  // Disabilita torrette per 1.5 sec
        disableCooldown: 6000,  // Cooldown tra gridi
        reward: 80,
        color: '#E0B0FF',
        scale: 1.05,
        isSiren: true,
    },
    
    GOLEM: {
        id: 'GOLEM',
        name: 'Earthshaker',
        icon: '🗿',
        sprite: () => EnemySpriteLibrary.GOLEM.base,
        hp: 80,
        speed: 0.2,
        stomp: true,  // Ogni 3 celle camminate, stordisce torrette vicine
        stompRange: 1.5,
        stompStunDuration: 800,
        reward: 100,
        color: '#8B4513',
        scale: 1.5,
        isGolem: true,
    }
};

// Level progression for merge system
// NOTA: Moltiplicatori aumentati per bilanciare la nuova difficoltà logaritmica dei nemici
// e i costi esponenziali degli upgrade
export const MERGE_LEVELS = [
    { level: 1, damageMultiplier: 1.0, rangeBonus: 0, fireRateBonus: 1.0, icon: '⭐' },
    { level: 2, damageMultiplier: 2.5, rangeBonus: 0.5, fireRateBonus: 1.2, icon: '✨' },
    { level: 3, damageMultiplier: 6.0, rangeBonus: 1.0, fireRateBonus: 1.5, icon: '💫' },
    { level: 4, damageMultiplier: 14.0, rangeBonus: 1.5, fireRateBonus: 1.85, icon: '⚡' },
    { level: 5, damageMultiplier: 30.0, rangeBonus: 2.0, fireRateBonus: 2.3, icon: '🌟' },
    { level: 6, damageMultiplier: 60.0, rangeBonus: 2.5, fireRateBonus: 2.9, icon: '🔥' },
    { level: 7, damageMultiplier: 120.0, rangeBonus: 3.0, fireRateBonus: 3.6, icon: '💎' },
];

// UI Configuration
export const UI_CONFIG = {
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



