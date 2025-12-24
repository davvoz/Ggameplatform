/**
 * Game Configuration
 * All game constants and balancing parameters
 */

export const CONFIG = {
    // Grid Configuration
    COLS: 7,
    ROWS: 12,
    DEFENSE_ZONE_ROWS: 4,  // Aumentato da 4 - i nemici si fermano più in alto

    // Game Balance - Inizio più facile, late game difficile
    INITIAL_COINS: 100,  // Aumentato da 80 - 5 torri per iniziare
    INITIAL_ENERGY: 100,  // Ripristinato
    ENERGY_DRAIN_PER_ZOMBIE: 2.0,  // Ridotto da 4.0 - meno punitivo all'inizio
    ENERGY_REGEN_RATE: 0.15,  // Aumentato da 0.05 - regen decente

    // Wave Configuration
    BASE_WAVE_ZOMBIES: 3,  // Ridotto da 6 - primo livello più facile
    WAVE_ZOMBIE_INCREMENT: 2,
    SPAWN_INTERVAL: 1000,  // Ridotto da 1000 - spawn più veloce

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
import { MultiPartEnemySprites } from './multi-part-enemies.js';
import { MultiPartTowerSprites } from './multi-part-towers.js';

export const CANNON_TYPES = {
    BASIC: {
        id: 'BASIC',
        name: 'Basic',
        icon: '🔫',
        sprite: () => MultiPartTowerSprites.createBasic(),
        cost: 20,
        damage: 2,
        fireRate: 1500,
        range: 2.5,
        projectileSpeed: 8,
        color: '#00ff88',
        description: 'Balanced, decent vs all',
        costMultiplier: 1.0,
        effectiveness: { NORMAL: 1.0, TANK: 0.9, RUSHER: 1.0, FLYER: 1.0, SPLITTER: 1.2, ARMORED: 0.8, BOSS: 0.9, HEALER: 1.1, PHASER: 0.9, VAMPIRE: 1.0, BOMBER: 1.0, SHADOW: 0.9, SIREN: 1.0, GOLEM: 0.8 },
        // Merge strategy: Versatile, okay against everything
    },

    RAPID: {
        id: 'RAPID',
        name: 'Rapid',
        icon: '🔥',
        sprite: () => MultiPartTowerSprites.createRapid(),
        cost: 35,
        damage: 2,
        fireRate: 350,
        range: 2.2,
        projectileSpeed: 14,
        color: '#ff8800',
        description: 'Shreds fast targets',
        costMultiplier: 1.3,
        effectiveness: { NORMAL: 1.2, TANK: 0.7, RUSHER: 1.6, FLYER: 1.5, SPLITTER: 1.4, ARMORED: 0.5, BOSS: 0.6, HEALER: 1.4, PHASER: 1.7, VAMPIRE: 1.1, BOMBER: 1.3, SHADOW: 1.8, SIREN: 1.2, GOLEM: 0.5 },
        // Merge strategy: COUNTER per nemici veloci (RUSHER, SHADOW, PHASER, FLYER) - high DPS
    },

    SNIPER: {
        id: 'SNIPER',
        name: 'Sniper',
        icon: '🎯',
        sprite: () => MultiPartTowerSprites.createSniper(),
        cost: 120,
        damage: 15,
        fireRate: 2800,
        range: 4.5,
        projectileSpeed: 25,
        color: '#0088ff',
        description: 'Assassinates priority targets',
        costMultiplier: 2.0,
        effectiveness: { NORMAL: 0.8, TANK: 1.0, RUSHER: 0.7, FLYER: 1.0, SPLITTER: 1.0, ARMORED: 0.9, BOSS: 1.3, HEALER: 2.2, PHASER: 0.9, VAMPIRE: 1.8, BOMBER: 1.5, SHADOW: 0.8, SIREN: 2.0, GOLEM: 1.2 },
        // Merge strategy: COUNTER per priority targets (HEALER, SIREN, VAMPIRE) - one-shot elimination
    },

    SPLASH: {
        id: 'SPLASH',
        name: 'Splash',
        icon: '💥',
        sprite: () => MultiPartTowerSprites.createSplash(),
        cost: 90,
        damage: 5,
        fireRate: 1800,
        range: 3.0,
        splashRadius: 2.2,
        projectileSpeed: 6,
        color: '#ffaa00',
        description: 'Destroys grouped enemies',
        costMultiplier: 1.6,
        effectiveness: { NORMAL: 1.5, TANK: 1.3, RUSHER: 1.4, FLYER: 1.3, SPLITTER: 2.0, ARMORED: 1.2, BOSS: 0.8, HEALER: 1.4, PHASER: 1.2, VAMPIRE: 1.3, BOMBER: 1.8, SHADOW: 1.3, SIREN: 1.3, GOLEM: 0.9 },
        // Merge strategy: COUNTER per nemici raggruppati e BOMBER (li uccide prima che esplodano)
    },

    FREEZE: {
        id: 'FREEZE',
        name: 'Freeze',
        icon: '❄️',
        sprite: () => MultiPartTowerSprites.createFreeze(),
        cost: 65,
        damage: 2,
        fireRate: 1600,
        range: 2.8,
        slowFactor: 0.5,  // Rallenta del 50%
        slowDuration: 2000,
        projectileSpeed: 10,
        color: '#00ddff',
        description: 'Slows all enemies effectively',
        costMultiplier: 1.4,
        effectiveness: { NORMAL: 1.1, TANK: 1.3, RUSHER: 1.8, FLYER: 1.5, SPLITTER: 1.3, ARMORED: 1.2, BOSS: 1.6, HEALER: 1.2, PHASER: 1.9, VAMPIRE: 1.3, BOMBER: 1.4, SHADOW: 1.7, SIREN: 1.3, GOLEM: 2.0 },
        // Merge strategy: COUNTER per nemici veloci e boss/golem - rallenta avanzamento
    },

    LASER: {
        id: 'LASER',
        name: 'Laser',
        icon: '🔆',
        sprite: () => MultiPartTowerSprites.createLaser(),
        cost: 110,
        damage: 6,
        fireRate: 850,
        range: 4.0,
        piercing: 4,  // Piercing forte
        projectileSpeed: 30,
        color: '#ffff00',
        description: 'Line-piercing laser',
        costMultiplier: 1.8,
        effectiveness: { NORMAL: 1.4, TANK: 1.3, RUSHER: 1.2, FLYER: 1.3, SPLITTER: 1.8, ARMORED: 1.6, BOSS: 1.2, HEALER: 1.5, PHASER: 1.1, VAMPIRE: 1.4, BOMBER: 1.3, SHADOW: 1.2, SIREN: 1.4, GOLEM: 1.3 },
        // Merge strategy: Buono vs linee di nemici e ARMORED (piercing ignora parte armor)
    },

    ELECTRIC: {
        id: 'ELECTRIC',
        name: 'Electric',
        icon: '⚡',
        sprite: () => MultiPartTowerSprites.createElectric(),
        cost: 95,
        damage: 4,
        fireRate: 1300,
        range: 2.9,
        chainTargets: 4,  // Chain a 4 target
        projectileSpeed: 18,
        color: '#aa00ff',
        description: 'Chains between groups',
        costMultiplier: 1.7,
        effectiveness: { NORMAL: 1.6, TANK: 1.2, RUSHER: 1.3, FLYER: 1.4, SPLITTER: 1.9, ARMORED: 1.0, BOSS: 0.9, HEALER: 1.9, PHASER: 1.3, VAMPIRE: 1.5, BOMBER: 1.4, SHADOW: 1.3, SIREN: 1.7, GOLEM: 1.0 },
        // Merge strategy: Eccellente vs gruppi e priority targets (chain hit su HEALER/SIREN)
    }
};


// Zombie Types - Progressive difficulty curve
export const ZOMBIE_TYPES = {
    NORMAL: {
        id: 'NORMAL',
        name: 'Shambler',
        icon: '🧟', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createGrunt(),
        hp: 10,
        speed: 0.5,
        reward: 15,
        color: '#00ff00',
        scale: 1.0,
    },


    TANK: {
        id: 'TANK',
        name: 'Brute',
        icon: '🧟‍♀️', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createTank(),
        hp: 35,
        speed: 0.3,
        reward: 60,
        color: '#ff0000',
        scale: 1.3,
    },

    RUSHER: {
        id: 'RUSHER',
        name: 'Leaper',
        icon: '🦇', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createRusher(),
        hp: 12,
        speed: 1.0,
        dodgeChance: 0.25,  // Can dodge projectiles
        reward: 40,
        color: '#ff00ff',
        scale: 1.2,
    },

    FLYER: {
        id: 'FLYER',
        name: 'Sky Demon',
        icon: '🦇', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createFlyer(),
        hp: 15,
        speed: 0.9,
        reward: 35,
        color: '#6a4a7a',
        scale: 1.1,
    },

    SPLITTER: {
        id: 'SPLITTER',
        name: 'Hydra',
        icon: '🐙', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createSplitter(),
        hp: 25,
        speed: 0.45,
        reward: 55,
        color: '#44bb88',
        scale: 1.15,
        canSplit: true,
        splitCount: 2,  // Si divide in 2 nemici alla morte
        splitType: 'NORMAL',  // I figli sono grunt normali
        splitHpPercent: 0.4,  // I figli hanno 40% HP del tipo normale
    },

    ARMORED: {
        id: 'ARMORED',
        name: 'Juggernaut',
        icon: '🛡️', // Legacy fallback
        sprite: () => MultiPartEnemySprites.createTank(),
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
        sprite: () => MultiPartEnemySprites.createBoss(),
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
        sprite: () => MultiPartEnemySprites.createHealer(),
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

    PHASER: {
        id: 'PHASER',
        name: 'Phantom',
        icon: '👻',
        sprite: () => MultiPartEnemySprites.createPhaser(),
        hp: 12,
        speed: 0.8,
        phaseInterval: 4000,  // Teletrasporta ogni 4 secondi
        phaseDistance: 2.5,  // Avanza di 2.5 celle
        phaseInvulnerable: 500,  // Invulnerabile per 0.5sec dopo teletrasporto
        reward: 65,
        color: '#aa00ff',
        scale: 0.75,  // Piccolo e sfuggente
        canPhase: true,
    },


    VAMPIRE: {
        id: 'VAMPIRE',
        name: 'Bloodlord',
        icon: '🧛',
        sprite: () => MultiPartEnemySprites.createVampire(),
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
        sprite: () => MultiPartEnemySprites.createBomber(),
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
        sprite: () => MultiPartEnemySprites.createShadow(),
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
        sprite: () => MultiPartEnemySprites.createSiren(),
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
        sprite: () => MultiPartEnemySprites.createGolem(),
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
    SHOP_HEIGHT: 90,
    STAT_PANEL_WIDTH: 100,
    BUTTON_SIZE: 70,
    BUTTON_SPACING: 6,
    FONT_FAMILY: 'Arial, sans-serif',
    FONT_SIZE_LARGE: 20,
    FONT_SIZE_MEDIUM: 14,
    FONT_SIZE_SMALL: 11,
};



