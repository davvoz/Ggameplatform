/**
 * Survivor Arena - Game Configuration
 * All game constants and balance settings
 * @fileoverview Centralized configuration for game balance and settings
 */



const CONFIG = Object.freeze({
    // Canvas & Rendering
    CANVAS: {
        BACKGROUND_COLOR: '#1a1a2e',
        TARGET_FPS: 60,
        FRAME_TIME: 1000 / 60
    },

    // Arena Settings
    ARENA: {
        WIDTH: 1500,
        HEIGHT: 1500,
        PADDING: 50,
        BORDER_COLOR: '#333355',
        BORDER_WIDTH: 4
    },

    // Camera Settings
    CAMERA: {
        ZOOM: 1,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 2,
        LERP_SPEED: 0.1
    },

    // Player Settings
    PLAYER: {
        SIZE: 30,
        BASE_SPEED: 220,
        BASE_HEALTH: 150,           // More health to survive longer
        INVINCIBILITY_TIME: 800,    // Longer invincibility after damage
        HEALTH_REGEN: 1,            // HP per second (slow regen)
        COLOR: '#00bfff',
        DODGE_SPEED_MULT: 2.5,
        DODGE_DURATION: 250,        // Longer dodge
        DODGE_COOLDOWN: 800         // Faster dodge cooldown
    },

    // XP & Leveling
    LEVELING: {
        BASE_XP_REQUIRED: 25,
        XP_GROWTH_RATE: 1.35,       // Each level requires 35% more XP
        MAX_LEVEL: 50,
        XP_FROM_ENEMY: {
            basic: 1,
            fast: 2,
            tank: 3,
            ranged: 2,
            exploder: 4,
            miniBoss: 15,
            boss: 50
        }
    },

    // Score Settings
    SCORING: {
        POINTS_PER_KILL: {
            basic: 10,
            fast: 15,
            tank: 25,
            ranged: 20,
            exploder: 30,
            miniBoss: 100,
            boss: 500
        },
        BOSS_KILL: 500,             // Extra bonus for killing boss
        TIME_SURVIVED: 10,          // Points per minute survived
        POINTS_PER_SECOND: 1,       // Survival time bonus
        COMBO_MULTIPLIER: 0.1,      // Extra % per combo hit
        MAX_COMBO_MULT: 3.0
    },

    // Enemy Types Configuration
    ENEMIES: {
        basic: {
            size: 25,
            speed: 70,
            health: 20,
            damage: 5,
            color: '#66bb6a',
            spawnWeight: 40
        },
        fast: {
            size: 20,
            speed: 130,
            health: 10,
            damage: 4,
            color: '#ffeb3b',
            spawnWeight: 25
        },
        tank: {
            size: 40,
            speed: 35,
            health: 80,
            damage: 12,
            color: '#8d6e63',
            spawnWeight: 15
        },
        ranged: {
            size: 22,
            speed: 50,
            health: 15,
            damage: 8,
            color: '#ba68c8',
            attackRange: 250,
            projectileSpeed: 250,
            fireRate: 2500,
            spawnWeight: 12
        },
        exploder: {
            size: 28,
            speed: 90,
            health: 30,
            damage: 15,
            explosionRadius: 80,
            color: '#ff7043',
            spawnWeight: 8
        }
    },

    // Mini Boss Configuration
    MINI_BOSS: {
        spawnInterval: 60000,       // Every 60 seconds
        health: 300,
        damage: 45,
        size: 60,
        speed: 50,
        color: '#e91e63',
        abilities: ['charge', 'summon']
    },

    // Boss Configuration
    BOSS: {
        spawnInterval: 180000,      // Every 3 minutes
        health: 1000,
        damage: 75,
        size: 100,
        speed: 30,
        color: '#9c27b0',
        phases: 3,
        warningDuration: 3000
    },

    // Weapon Types Configuration
    WEAPONS: {
        pistol: {
            name: 'Pistol',
            icon: '🔫',
            damage: 10,
            fireRate: 800,          // ms between shots (slower start)
            projectileSpeed: 500,
            projectileSize: 8,
            projectileColor: '#ffeb3b',
            range: 400,
            pierce: 1,
            spread: 0,
            projectiles: 1
        },
        shotgun: {
            name: 'Shotgun',
            icon: '💢',
            damage: 8,
            fireRate: 1500,         // Slower start
            projectileSpeed: 400,
            projectileSize: 6,
            projectileColor: '#ff9800',
            range: 250,
            pierce: 1,
            spread: 30,             // degrees
            projectiles: 5
        },
        machineGun: {
            name: 'Machine Gun',
            icon: '💨',
            damage: 5,
            fireRate: 250,          // Slower start, still fast
            projectileSpeed: 600,
            projectileSize: 5,
            projectileColor: '#4caf50',
            range: 350,
            pierce: 1,
            spread: 5,
            projectiles: 1
        },
        laser: {
            name: 'Death Ray',
            icon: '⚡',
            damage: 150,            // High burst damage
            fireRate: 3000,         // 3 second cooldown
            range: 400,             // Long range
            width: 8,               // Beam width
            color: '#00ffff',
            pierce: 1,
            beamDuration: 300       // Beam visible for 0.3 seconds
        },
        rocket: {
            name: 'Rocket Launcher',
            icon: '🚀',
            damage: 40,
            fireRate: 2500,         // Slower start
            projectileSpeed: 250,
            projectileSize: 15,
            projectileColor: '#f44336',
            range: 500,
            pierce: 1,
            explosionRadius: 120,
            spread: 0,
            projectiles: 1
        },
        boomerang: {
            name: 'Boomerang',
            icon: '🪃',
            damage: 15,
            fireRate: 2500,         // Slower cooldown
            projectileSpeed: 200,   // Slower animation
            projectileSize: 20,
            projectileColor: '#795548',
            range: 300,
            pierce: 1,
            returns: true
        },
        forcefield: {
            name: 'Force Field',
            icon: '🛡️',
            damage: 8,
            fireRate: 0,            // Continuous
            radius: 100,
            color: 'rgba(0, 191, 255, 0.3)',
            rotationSpeed: 2
        },
        drone: {
            name: 'Attack Drone',
            icon: '🤖',
            damage: 7,
            fireRate: 600,          // Slower start
            projectileSpeed: 450,
            projectileSize: 5,
            projectileColor: '#9e9e9e',
            range: 250,
            count: 1,
            orbitRadius: 80
        }
    },

    // Upgrade Options
    UPGRADES: {
        // Weapon upgrades
        weaponDamage: {
            name: 'Damage Up',
            icon: '⚔️',
            description: '+15% weapon damage',
            effect: { stat: 'damage', multiplier: 1.15 },
            rarity: 'common',
            weight: 30
        },
        weaponSpeed: {
            name: 'Fire Rate Up',
            icon: '⏱️',
            description: '+10% attack speed',
            effect: { stat: 'fireRate', multiplier: 0.9 },
            rarity: 'common',
            weight: 30
        },
        projectileCount: {
            name: 'Multi-Shot',
            icon: '🔢',
            description: '+1 projectile',
            effect: { stat: 'projectiles', add: 1 },
            rarity: 'rare',
            weight: 15
        },

        
        // Player upgrades
        maxHealth: {
            name: 'Max Health Up',
            icon: '❤️',
            description: '+20 max health',
            effect: { stat: 'maxHealth', add: 20 },
            rarity: 'common',
            weight: 25
        },
        healthRegen: {
            name: 'Health Regen',
            icon: '💚',
            description: '+1 HP/sec regen',
            effect: { stat: 'healthRegen', add: 1 },
            rarity: 'rare',
            weight: 12
        },
        moveSpeed: {
            name: 'Speed Up',
            icon: '👟',
            description: '+10% movement speed',
            effect: { stat: 'speed', multiplier: 1.1 },
            rarity: 'common',
            weight: 20
        },
        armor: {
            name: 'Armor',
            icon: '🪖',
            description: '-10% damage taken',
            effect: { stat: 'armor', add: 0.1 },
            rarity: 'rare',
            weight: 15
        },
        
        // New weapons
        newShotgun: {
            name: 'Shotgun',
            icon: '�',
            description: 'Adds a powerful shotgun',
            effect: { weapon: 'shotgun' },
            rarity: 'epic',
            weight: 8,
            isNewWeapon: true
        },
        newMachineGun: {
            name: 'Machine Gun',
            icon: '�',
            description: 'Rapid fire weapon',
            effect: { weapon: 'machineGun' },
            rarity: 'epic',
            weight: 8,
            isNewWeapon: true
        },
        newRocket: {
            name: 'Rocket Launcher',
            icon: '🚀',
            description: 'Explosive rockets',
            effect: { weapon: 'rocket' },
            rarity: 'legendary',
            weight: 4,
            isNewWeapon: true
        },
        newBoomerang: {
            name: 'Boomerang',
            icon: '🪃',
            description: 'Returns after thrown',
            effect: { weapon: 'boomerang' },
            rarity: 'epic',
            weight: 6,
            isNewWeapon: true
        },
        newForcefield: {
            name: 'Force Field',
            icon: '🛡️',
            description: 'Damages nearby enemies',
            effect: { weapon: 'forcefield' },
            rarity: 'legendary',
            weight: 4,
            isNewWeapon: true
        },
        newDrone: {
            name: 'Attack Drone',
            icon: '🤖',
            description: 'Auto-targeting drone',
            effect: { weapon: 'drone' },
            rarity: 'epic',
            weight: 6,
            isNewWeapon: true
        }
    },

    // Pickup Types
    PICKUPS: {
        xpOrb: {
            size: 12,
            color: '#00ff88',
            magnetRange: 100,
            value: 1
        },
        healthPack: {
            size: 20,
            color: '#ff4444',
            healAmount: 25,
            spawnChance: 0.05       // 5% on enemy death
        },
        magnet: {
            size: 20,
            color: '#9c27b0',
            duration: 5000,
            range: 500,
            spawnChance: 0.02       // 2% on enemy death
        },
        bomb: {
            size: 20,
            color: '#ff9800',
            damage: 100,
            radius: 200,
            spawnChance: 0.01       // 1% on enemy death
        }
    },

    // Spawn Configuration
    SPAWNING: {
        INITIAL_SPAWN_RATE: 3500,   // ms between spawns (slower start)
        MIN_SPAWN_RATE: 600,        // Faster minimum spawn rate
        SPAWN_RATE_DECREASE: 15,    // Faster decrease per minute
        SPAWN_DISTANCE_MIN: 600,
        SPAWN_DISTANCE_MAX: 900,
        MAX_ENEMIES: 60,            // More max enemies
        WAVE_SIZE_BASE: 2,          // Start with fewer enemies
        WAVE_SIZE_GROWTH: 0.2,     // Faster growth
        
        // Wave system
        WAVE_INTERVAL: 60000,       // Special wave every 60 seconds
        HORDE_INTERVAL: 120000,     // Huge horde every 2 minutes
        HORDE_SIZE_BASE: 6,         // Smaller hordes
        HORDE_SIZE_GROWTH: 2,       // Slower growth
        
        // Rarity system (higher = more rare)
        RARITY: {
            common: { weight: 75, healthMult: 1.0, damageMult: 1.0, color: null, xpMult: 1.0 },
            uncommon: { weight: 18, healthMult: 1.3, damageMult: 1.1, color: '#4fc3f7', xpMult: 1.5 },
            rare: { weight: 5, healthMult: 1.8, damageMult: 1.3, color: '#ab47bc', xpMult: 2.0 },
            epic: { weight: 1.5, healthMult: 2.5, damageMult: 1.6, color: '#ffa726', xpMult: 3.0 },
            legendary: { weight: 0.5, healthMult: 4.0, damageMult: 2.0, color: '#ef5350', xpMult: 5.0 }
        }
    },

    // Visual Effects
    EFFECTS: {
        PARTICLE_LIFETIME: 1000,
        DAMAGE_NUMBER_DURATION: 800,
        SCREEN_SHAKE_INTENSITY: 5,
        SCREEN_SHAKE_DURATION: 200
    },

    // Audio
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.5
    }
});

// Difficulty scaling based on game time (spread over 60 minutes / 1 hour)
const DIFFICULTY_SCALING = Object.freeze({
    // Time in seconds -> multipliers (every 2 minutes)
    0:    { enemyHealth: 1.0, enemyDamage: 1.0, enemySpeed: 1.0, spawnRate: 1.0 },
    120:  { enemyHealth: 1.1, enemyDamage: 1.1, enemySpeed: 1.05, spawnRate: 1.1 },
    240:  { enemyHealth: 1.2, enemyDamage: 1.15, enemySpeed: 1.08, spawnRate: 1.2 },
    360:  { enemyHealth: 1.3, enemyDamage: 1.2, enemySpeed: 1.1, spawnRate: 1.3 },
    480:  { enemyHealth: 1.4, enemyDamage: 1.25, enemySpeed: 1.12, spawnRate: 1.4 },
    600:  { enemyHealth: 1.5, enemyDamage: 1.3, enemySpeed: 1.15, spawnRate: 1.5 },
    720:  { enemyHealth: 1.8, enemyDamage: 1.5, enemySpeed: 1.2, spawnRate: 1.8 },
    840:  { enemyHealth: 2.0, enemyDamage: 1.6, enemySpeed: 1.22, spawnRate: 1.9 },
    960:  { enemyHealth: 2.2, enemyDamage: 1.7, enemySpeed: 1.25, spawnRate: 2.0 },
    1080: { enemyHealth: 2.5, enemyDamage: 1.9, enemySpeed: 1.27, spawnRate: 2.2 },
    1200: { enemyHealth: 2.8, enemyDamage: 2.0, enemySpeed: 1.3, spawnRate: 2.5 },
    1320: { enemyHealth: 3.2, enemyDamage: 2.3, enemySpeed: 1.32, spawnRate: 2.8 },
    1440: { enemyHealth: 3.5, enemyDamage: 2.5, enemySpeed: 1.35, spawnRate: 3.0 },
    1560: { enemyHealth: 4.0, enemyDamage: 2.7, enemySpeed: 1.37, spawnRate: 3.2 },
    1680: { enemyHealth: 4.5, enemyDamage: 3.0, enemySpeed: 1.4, spawnRate: 3.5 },
    1800: { enemyHealth: 5.0, enemyDamage: 3.5, enemySpeed: 1.45, spawnRate: 4.0 },
    // Extended to 60 minutes
    1920: { enemyHealth: 5.5, enemyDamage: 3.8, enemySpeed: 1.47, spawnRate: 4.3 },
    2040: { enemyHealth: 6.0, enemyDamage: 4.0, enemySpeed: 1.5, spawnRate: 4.6 },
    2160: { enemyHealth: 6.5, enemyDamage: 4.3, enemySpeed: 1.52, spawnRate: 5.0 },
    2280: { enemyHealth: 7.0, enemyDamage: 4.6, enemySpeed: 1.55, spawnRate: 5.4 },
    2400: { enemyHealth: 7.5, enemyDamage: 5.0, enemySpeed: 1.57, spawnRate: 5.8 },
    2520: { enemyHealth: 8.0, enemyDamage: 5.3, enemySpeed: 1.6, spawnRate: 6.2 },
    2640: { enemyHealth: 8.5, enemyDamage: 5.7, enemySpeed: 1.62, spawnRate: 6.6 },
    2760: { enemyHealth: 9.0, enemyDamage: 6.0, enemySpeed: 1.65, spawnRate: 7.0 },
    2880: { enemyHealth: 9.5, enemyDamage: 6.5, enemySpeed: 1.67, spawnRate: 7.5 },
    3000: { enemyHealth: 10.0, enemyDamage: 7.0, enemySpeed: 1.7, spawnRate: 8.0 },
    3120: { enemyHealth: 11.0, enemyDamage: 7.5, enemySpeed: 1.72, spawnRate: 8.5 },
    3240: { enemyHealth: 12.0, enemyDamage: 8.0, enemySpeed: 1.75, spawnRate: 9.0 },
    3360: { enemyHealth: 13.0, enemyDamage: 8.5, enemySpeed: 1.77, spawnRate: 9.5 },
    3480: { enemyHealth: 14.0, enemyDamage: 9.0, enemySpeed: 1.8, spawnRate: 10.0 },
    3600: { enemyHealth: 15.0, enemyDamage: 10.0, enemySpeed: 1.85, spawnRate: 11.0 }
});

// ============================================================
// WORLD / DIMENSION SYSTEM
// ============================================================
const WORLDS = Object.freeze({
    voidAbyss: {
        id: 'voidAbyss',
        name: 'Void Abyss',
        icon: '🌌',
        description: 'The endless void where it all began',
        background: {
            color: '#0d0518',
            gridColor: 'rgba(100, 50, 180, 0.2)',
            dotColor: 'rgba(180, 120, 255, 0.5)',
            bigDotColor: 'rgba(100, 40, 160, 0.15)',
            accentColor: '#7b2ff7',
            theme: 'void',
            particles: { color1: '#9944ff', color2: '#5500cc', count: 30 },
            nebula: true
        },
        enemyTypes: ['basic', 'fast', 'tank', 'ranged', 'exploder'],
        weapons: ['pistol', 'shotgun', 'machineGun', 'rocket', 'laser', 'boomerang', 'forcefield', 'drone'],
        boss: {
            name: 'Void Overlord',
            icon: '👑',
            color: '#9c27b0',
            auraColor: '#ce93d8',
            size: 100,
            healthMult: 1.0,
            speedMult: 1.0,
            abilities: ['charge', 'summon', 'aoe', 'shoot'],
            shape: 'crown'
        }
    },
    infernoCore: {
        id: 'infernoCore',
        name: 'Inferno Core',
        icon: '🔥',
        description: 'A realm of fire and molten fury',
        background: {
            color: '#2a1208',
            gridColor: 'rgba(200, 60, 10, 0.2)',
            dotColor: 'rgba(255, 140, 40, 0.5)',
            bigDotColor: 'rgba(180, 40, 5, 0.15)',
            accentColor: '#ff4400',
            theme: 'inferno',
            particles: { color1: '#ff6600', color2: '#ff2200', count: 40 },
            lavaStreaks: true
        },
        enemyTypes: ['flameImp', 'emberSprinter', 'magmaGolem', 'lavaCaster', 'pyroBlob'],
        weapons: ['flamethrower', 'meteorStaff', 'rocket', 'boomerang'],
        boss: {
            name: 'Pyroclasm',
            icon: '🌋',
            color: '#ff3300',
            auraColor: '#ff8800',
            size: 110,
            healthMult: 1.3,
            speedMult: 0.8,
            abilities: ['charge', 'fireRing', 'eruption', 'summon'],
            shape: 'lava'
        }
    },
    frozenWastes: {
        id: 'frozenWastes',
        name: 'Frozen Wastes',
        icon: '❄️',
        description: 'An icy wasteland of frost and silence',
        background: {
            color: '#1a2838',
            gridColor: 'rgba(80, 160, 220, 0.15)',
            dotColor: 'rgba(180, 230, 255, 0.5)',
            bigDotColor: 'rgba(60, 120, 180, 0.12)',
            accentColor: '#00bfff',
            theme: 'frozen',
            particles: { color1: '#aaddff', color2: '#4488cc', count: 35 },
            snowflakes: true
        },
        enemyTypes: ['iceWraith', 'blizzardWolf', 'frostGiant', 'frostArcher', 'iceDetonator'],
        weapons: ['iceShard', 'iceGrenade', 'laser', 'forcefield'],
        boss: {
            name: 'Cryomancer',
            icon: '🧊',
            color: '#00ccff',
            auraColor: '#80e0ff',
            size: 95,
            healthMult: 1.1,
            speedMult: 0.7,
            abilities: ['charge', 'freezeZone', 'iceStorm', 'summon'],
            shape: 'crystal'
        }
    },
    neonNexus: {
        id: 'neonNexus',
        name: 'Neon Nexus',
        icon: '⚡',
        description: 'A digital battleground of circuits and energy',
        background: {
            color: '#081210',
            gridColor: 'rgba(0, 255, 80, 0.15)',
            dotColor: 'rgba(0, 255, 180, 0.5)',
            bigDotColor: 'rgba(0, 120, 60, 0.12)',
            accentColor: '#00ff88',
            theme: 'neon',
            particles: { color1: '#00ff88', color2: '#00ccff', count: 25 },
            scanlines: true
        },
        enemyTypes: ['droneSwarm', 'sparkRunner', 'mechSentinel', 'laserTurret', 'emPulser'],
        weapons: ['teslaCoil', 'plasmaCannon', 'drone', 'laser'],
        boss: {
            name: 'Overload Prime',
            icon: '🤖',
            color: '#00ff88',
            auraColor: '#80ffcc',
            size: 90,
            healthMult: 1.0,
            speedMult: 1.3,
            abilities: ['charge', 'droneBarrage', 'laserSweep', 'summon'],
            shape: 'mech'
        }
    },
    shadowRealm: {
        id: 'shadowRealm',
        name: 'Shadow Realm',
        icon: '👁️',
        description: 'The darkest dimension, where nightmares dwell',
        background: {
            color: '#0e0814',
            gridColor: 'rgba(60, 0, 80, 0.2)',
            dotColor: 'rgba(150, 0, 200, 0.4)',
            bigDotColor: 'rgba(50, 0, 60, 0.15)',
            accentColor: '#aa00ff',
            theme: 'shadow',
            particles: { color1: '#9900ff', color2: '#440066', count: 30 },
            darkness: true
        },
        enemyTypes: ['shadowClone', 'phantasm', 'voidDevourer', 'darkCaster', 'voidMine'],
        weapons: ['soulDrain', 'phantomBlade', 'boomerang', 'forcefield'],
        boss: {
            name: 'The Devourer',
            icon: '👁️',
            color: '#660099',
            auraColor: '#aa44ff',
            size: 120,
            healthMult: 1.5,
            speedMult: 0.6,
            abilities: ['charge', 'voidPull', 'shadowClones', 'summon'],
            shape: 'eye'
        }
    }
});

// World-specific enemy configs (merged with base ENEMIES at runtime)
// Each world has 5 unique enemy types mirroring the base archetypes
const WORLD_ENEMIES = Object.freeze({
    // --- Inferno Core (5 types) ---
    flameImp: {
        size: 22, speed: 100, health: 18, damage: 6,
        color: '#ff6600', spawnWeight: 35,
        icon: '🔥',
        trailDamage: 3, trailDuration: 2000
    },
    magmaGolem: {
        size: 42, speed: 28, health: 95, damage: 14,
        color: '#cc3300', spawnWeight: 10,
        icon: '🌋',
        splitsOnDeath: true, splitCount: 2
    },
    emberSprinter: {
        size: 18, speed: 145, health: 12, damage: 5,
        color: '#ff9944', spawnWeight: 25,
        icon: '💨'
    },
    lavaCaster: {
        size: 24, speed: 45, health: 16, damage: 9,
        color: '#ff4400', spawnWeight: 12,
        icon: '🎯',
        attackRange: 260, projectileSpeed: 230, fireRate: 2200
    },
    pyroBlob: {
        size: 26, speed: 95, health: 28, damage: 18,
        color: '#ff5500', spawnWeight: 8,
        icon: '💥',
        explosionRadius: 90
    },

    // --- Frozen Wastes (5 types) ---
    iceWraith: {
        size: 24, speed: 85, health: 15, damage: 5,
        color: '#80d8ff', spawnWeight: 35,
        icon: '👻',
        slowOnHit: 0.4, slowDuration: 1500
    },
    frostGiant: {
        size: 48, speed: 22, health: 110, damage: 16,
        color: '#0088cc', spawnWeight: 8,
        icon: '🧊',
        freezeRadius: 120, freezeDuration: 2000
    },
    blizzardWolf: {
        size: 20, speed: 140, health: 11, damage: 4,
        color: '#aaddff', spawnWeight: 25,
        icon: '🐺'
    },
    frostArcher: {
        size: 22, speed: 48, health: 14, damage: 8,
        color: '#44aadd', spawnWeight: 12,
        icon: '🏹',
        attackRange: 280, projectileSpeed: 260, fireRate: 2400
    },
    iceDetonator: {
        size: 28, speed: 80, health: 32, damage: 14,
        color: '#00ccff', spawnWeight: 10,
        icon: '💎',
        explosionRadius: 100, freezeOnExplode: true
    },

    // --- Neon Nexus (5 types) ---
    droneSwarm: {
        size: 14, speed: 140, health: 8, damage: 3,
        color: '#00ff88', spawnWeight: 30,
        icon: '🤖',
        swarmSize: 3
    },
    mechSentinel: {
        size: 38, speed: 35, health: 80, damage: 12,
        color: '#00cc66', spawnWeight: 10,
        icon: '🛡️',
        shieldHP: 30, shieldRegenDelay: 3000
    },
    sparkRunner: {
        size: 18, speed: 150, health: 10, damage: 4,
        color: '#44ffaa', spawnWeight: 25,
        icon: '⚡'
    },
    laserTurret: {
        size: 26, speed: 30, health: 22, damage: 10,
        color: '#00ffcc', spawnWeight: 12,
        icon: '🔫',
        attackRange: 300, projectileSpeed: 400, fireRate: 1800
    },
    emPulser: {
        size: 30, speed: 75, health: 35, damage: 16,
        color: '#22dd88', spawnWeight: 8,
        icon: '💫',
        explosionRadius: 110, disableWeapons: true
    },

    // --- Shadow Realm (5 types) ---
    shadowClone: {
        size: 22, speed: 110, health: 12, damage: 7,
        color: '#6600aa', spawnWeight: 30,
        icon: '👤',
        teleportCooldown: 3000, teleportRange: 200
    },
    voidDevourer: {
        size: 40, speed: 30, health: 70, damage: 11,
        color: '#330066', spawnWeight: 10,
        icon: '👁️',
        pullRadius: 180, pullForce: 80
    },
    phantasm: {
        size: 19, speed: 135, health: 10, damage: 5,
        color: '#9944cc', spawnWeight: 25,
        icon: '💀'
    },
    darkCaster: {
        size: 23, speed: 42, health: 15, damage: 9,
        color: '#7700bb', spawnWeight: 12,
        icon: '🔮',
        attackRange: 270, projectileSpeed: 240, fireRate: 2300
    },
    voidMine: {
        size: 24, speed: 60, health: 20, damage: 20,
        color: '#440077', spawnWeight: 8,
        icon: '🕳️',
        explosionRadius: 85, pullOnExplode: true
    }
});

// World-specific weapon configs (merged with base WEAPONS at runtime)
const WORLD_WEAPONS = Object.freeze({
    // --- Inferno Core ---
    flamethrower: {
        name: 'Flamethrower',
        icon: '🔥',
        damage: 4,
        fireRate: 100,
        projectileSpeed: 300,
        projectileSize: 12,
        projectileColor: '#ff6600',
        range: 180,
        pierce: 1,
        spread: 25,
        projectiles: 3,
        description: 'Short range cone of fire'
    },
    meteorStaff: {
        name: 'Meteor Staff',
        icon: '☄️',
        damage: 60,
        fireRate: 3500,
        projectileSpeed: 200,
        projectileSize: 20,
        projectileColor: '#ff4400',
        range: 500,
        pierce: 1,
        explosionRadius: 160,
        spread: 0,
        projectiles: 1,
        description: 'Slow massive AOE meteor'
    },
    // --- Frozen Wastes ---
    iceShard: {
        name: 'Ice Shards',
        icon: '🧊',
        damage: 7,
        fireRate: 1200,
        projectileSpeed: 380,
        projectileSize: 10,
        projectileColor: '#80d8ff',
        range: 350,
        pierce: 1,
        spread: 40,
        projectiles: 4,
        description: 'Spread of freezing shards'
    },
    iceGrenade: {
        name: 'Ice Grenade',
        icon: '💣',
        damage: 30,
        fireRate: 3000,
        projectileSpeed: 220,
        projectileSize: 14,
        projectileColor: '#88ddff',
        range: 350,
        pierce: 1,
        explosionRadius: 130,
        bounces: 3,
        freezeDuration: 2500,
        arcHeight: 40,
        spread: 0,
        projectiles: 1,
        description: 'Bouncing grenade that freezes enemies on explosion'
    },
    // --- Neon Nexus ---
    teslaCoil: {
        name: 'Tesla Coil',
        icon: '🌩️',
        damage: 12,
        fireRate: 800,
        range: 250,
        chainTargets: 3,
        chainRange: 120,
        color: '#00ff88',
        description: 'Lightning chains between enemies'
    },
    plasmaCannon: {
        name: 'Plasma Cannon',
        icon: '💠',
        damage: 50,
        fireRate: 2800,
        projectileSpeed: 350,
        projectileSize: 18,
        projectileColor: '#00ffcc',
        range: 450,
        pierce: 1,
        explosionRadius: 110,
        spread: 0,
        projectiles: 1,
        description: 'Charged plasma with AOE'
    },
    // --- Shadow Realm ---
    soulDrain: {
        name: 'Soul Drain',
        icon: '💜',
        damage: 8,
        fireRate: 0,
        range: 200,
        width: 6,
        color: '#aa00ff',
        lifeSteal: 0.15,
        description: 'Beam that heals on damage'
    },
    phantomBlade: {
        name: 'Phantom Blade',
        icon: '🗡️',
        damage: 22,
        fireRate: 1800,
        projectileSpeed: 220,
        projectileSize: 16,
        projectileColor: '#8800cc',
        range: 1500,
        pierce: 1,
        homing: true,
        homingStrength: 4,
        spread: 0,
        projectiles: 1,
        description: 'Spinning spectral blade that seeks enemies'
    }
});

// Portal configuration
const PORTAL_CONFIG = Object.freeze({
    DURATION: 15000,          // 15 seconds visible
    SIZE: 50,                 // Portal radius
    PULSE_SPEED: 2,           // Visual pulse speed
    ACTIVATION_RANGE: 60,     // Player must be this close
    APPEAR_ANIMATION: 1000    // 1s fade-in
});

// Boss drop temporary weapons (20 seconds each, one per world boss)
const BOSS_DROP_WEAPONS = Object.freeze({
    voidAbyss: {
        name: 'Void Lightning',
        icon: '🌀',
        color: '#aa44ff',
        glowColor: 'rgba(170, 68, 255, 0.3)',
        duration: 30000,
        // Direct lightning bolts from player to individual enemies
        type: 'voidLightning',
        damage: 150,            // Damage per bolt
        radius: 380,            // Max targeting radius
        maxArcs: 14,            // Simultaneous bolts
        arcInterval: 300,       // New volley every 300ms
        arcLifetime: 400        // Visual bolt display time
    },
    infernoCore: {
        name: 'Inferno Storm',
        icon: '🌋',
        color: '#ff4400',
        glowColor: 'rgba(255, 68, 0, 0.3)',
        duration: 30000,
        // Fire nova waves expanding outward + persistent flame ring
        type: 'fireNova',
        damage: 160,            // Nova wave damage
        radius: 350,            // Max nova expansion
        novaInterval: 1200,     // Nova every 1.2s
        novaSpeed: 450,         // Expansion speed
        ringRadius: 120,        // Persistent flame ring radius
        ringDamage: 50,         // Flame ring DPS
        ringTickRate: 150       // Ring damage tick interval
    },
    frozenWastes: {
        name: 'Absolute Zero',
        icon: '❄️',
        color: '#00ccff',
        glowColor: 'rgba(0, 204, 255, 0.3)',
        duration: 30000,
        // Ice stalactites raining from sky + blizzard field
        type: 'iceStorm',
        damage: 140,            // Stalactite impact damage
        stalactiteRate: 80,     // Stalactite every 80ms (massive barrage)
        stalactiteRadius: 350,  // Spawn radius around player
        impactRadius: 80,       // Explosion radius on impact
        blizzardRadius: 320,    // Blizzard slow field
        freezeChance: 0.5,      // 50% chance to freeze on hit
        freezeDuration: 2500
    },
    neonNexus: {
        name: 'Laser Grid',
        icon: '🔋',
        color: '#00ff88',
        glowColor: 'rgba(0, 255, 136, 0.3)',
        duration: 30000,
        // Rotating laser beams that slice through everything
        type: 'laserGrid',
        damage: 80,             // Damage per tick per beam
        beamCount: 6,           // Number of laser beams
        beamLength: 400,        // How far beams reach
        beamWidth: 16,          // Visual width
        rotationSpeed: 2.2,     // Rotation speed (rad/s)
        tickRate: 100,          // Damage tick interval
        hitCooldown: 150        // Per-enemy hit cooldown
    },
    shadowRealm: {
        name: "Death's Harvest",
        icon: '💀',
        color: '#cc00ff',
        glowColor: 'rgba(204, 0, 255, 0.3)',
        duration: 30000,
        // Spectral souls that burst outward, pass through enemies, then return
        type: 'soulBurst',
        damage: 130,            // Damage per soul hit
        soulCount: 20,          // Souls per burst
        burstRadius: 400,       // How far souls travel
        burstInterval: 1500,    // Burst every 1.5s
        soulSpeed: 500,         // Soul travel speed
        returnDamage: 100,      // Damage on return trip
        lingering: true         // Souls leave damaging trail
    }
});

// World order for portal destinations
const WORLD_ORDER = ['voidAbyss', 'infernoCore', 'frozenWastes', 'neonNexus', 'shadowRealm'];

export { CONFIG, DIFFICULTY_SCALING, WORLDS, WORLD_ENEMIES, WORLD_WEAPONS, PORTAL_CONFIG, WORLD_ORDER, BOSS_DROP_WEAPONS };
