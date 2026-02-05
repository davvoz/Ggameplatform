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
        WIDTH: 1400,
        HEIGHT: 1400,
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
        damage: 30,
        size: 60,
        speed: 50,
        color: '#e91e63',
        abilities: ['charge', 'summon']
    },

    // Boss Configuration
    BOSS: {
        spawnInterval: 180000,      // Every 3 minutes
        health: 1000,
        damage: 50,
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
            pierce: 999,            // Pierces all enemies
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
            explosionRadius: 60,
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
            pierce: 5,
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
        pierce: {
            name: 'Pierce',
            icon: '🎯',
            description: '+1 pierce',
            effect: { stat: 'pierce', add: 1 },
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
            icon: '🛡️',
            description: '-10% damage taken',
            effect: { stat: 'armor', add: 0.1 },
            rarity: 'rare',
            weight: 15
        },
        
        // New weapons
        newShotgun: {
            name: 'Shotgun',
            icon: '🔫',
            description: 'Adds a powerful shotgun',
            effect: { weapon: 'shotgun' },
            rarity: 'epic',
            weight: 8,
            isNewWeapon: true
        },
        newMachineGun: {
            name: 'Machine Gun',
            icon: '🔫',
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

// Difficulty scaling based on game time (spread over 30 minutes)
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
    1800: { enemyHealth: 5.0, enemyDamage: 3.5, enemySpeed: 1.45, spawnRate: 4.0 }
});


export { CONFIG, DIFFICULTY_SCALING };
