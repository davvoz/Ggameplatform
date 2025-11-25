/**
 * EnemyTypes - Definizione di tutti i tipi di nemici con caratteristiche e pattern
 * Ogni nemico ha comportamenti, velocità e difficoltà diverse
 */

export const EnemyCategory = {
    GROUND: 'ground',      // Nemici terrestri (camminano su piattaforme)
    FLYING: 'flying',      // Nemici volanti (movimento aereo)
    CHASER: 'chaser',      // Nemici che inseguono il player
    JUMPER: 'jumper',      // Nemici che saltano
    TURRET: 'turret',      // Torrette statiche che sparano
    MINI_BOSS: 'miniboss'  // Mini-boss più difficili
};

export const EnemyTypes = {
    // ============================================
    // NEMICI BASE (Livelli 1-20)
    // ============================================
    
    SLUG: {
        id: 'slug',
        name: 'Riccio Spinato',
        category: EnemyCategory.GROUND,
        icon: '🦔',
        hp: 1,
        damage: 1,
        speed: 80,
        width: 30,
        height: 20,
        color: [0.5, 0.8, 0.3, 1.0],
        points: 10,
        pattern: 'patrol', // Cammina avanti/indietro
        patrolDistance: 120,
        description: 'Riccio spinato che pattuglia la piattaforma',
        unlockLevel: 1
    },
    
    SPIKE_BALL: {
        id: 'spikeball',
        name: 'Cespuglio Spinato',
        category: EnemyCategory.GROUND,
        icon: '🌵',
        hp: 1,
        damage: 1,
        speed: 150,
        width: 25,
        height: 25,
        color: [0.2, 0.7, 0.2, 1.0],
        points: 15,
        pattern: 'roll', // Rotola velocemente
        description: 'Cespuglio spinato che rotola pericolosamente',
        unlockLevel: 3
    },
    
    FLY: {
        id: 'fly',
        name: 'Mosca',
        category: EnemyCategory.FLYING,
        icon: '🪰',
        hp: 1,
        damage: 1,
        speed: 120,
        width: 20,
        height: 20,
        color: [0.3, 0.3, 0.3, 1.0],
        points: 20,
        pattern: 'sine_wave', // Vola con movimento sinusoidale
        amplitude: 40,
        frequency: 2,
        description: 'Mosca volante con movimento ondulato',
        unlockLevel: 5
    },
    
    // ============================================
    // NEMICI INTERMEDI (Livelli 21-50)
    // ============================================
    
    CHOMPER: {
        id: 'chomper',
        name: 'Mangiatore',
        category: EnemyCategory.GROUND,
        icon: '👾',
        hp: 2,
        damage: 1,
        speed: 100,
        width: 35,
        height: 30,
        color: [0.8, 0.3, 0.8, 1.0],
        points: 25,
        pattern: 'charge', // Si ferma, poi carica verso il player
        chargeSpeed: 300,
        chargeDetectRange: 200,
        chargeCooldown: 2.0,
        description: 'Nemico che carica verso il giocatore',
        unlockLevel: 21
    },
    
    WASP: {
        id: 'wasp',
        name: 'Vespa',
        category: EnemyCategory.CHASER,
        icon: '🐝',
        hp: 1,
        damage: 1,
        speed: 180,
        width: 22,
        height: 22,
        color: [1.0, 0.8, 0.0, 1.0],
        points: 30,
        pattern: 'chase', // Insegue il player
        chaseRange: 250,
        description: 'Vespa aggressiva che insegue il giocatore',
        unlockLevel: 25
    },
    
    HOPPER: {
        id: 'hopper',
        name: 'Saltatore',
        category: EnemyCategory.JUMPER,
        icon: '🦘',
        hp: 2,
        damage: 1,
        speed: 90,
        width: 28,
        height: 32,
        color: [0.4, 0.7, 0.4, 1.0],
        points: 35,
        pattern: 'jump', // Salta periodicamente
        jumpForce: -400,
        jumpInterval: 1.5,
        jumpHeight: 150,
        description: 'Nemico che salta in modo imprevedibile',
        unlockLevel: 30
    },
    
    CANNON: {
        id: 'cannon',
        name: 'Cannone',
        category: EnemyCategory.TURRET,
        icon: '🔫',
        hp: 3,
        damage: 1,
        speed: 0, // Statico
        width: 35,
        height: 35,
        color: [0.5, 0.5, 0.5, 1.0],
        points: 40,
        pattern: 'shoot', // Spara proiettili
        shootInterval: 2.5,
        shootRange: 300,
        projectileSpeed: 200,
        description: 'Torretta statica che spara proiettili',
        unlockLevel: 35
    },
    
    // ============================================
    // NEMICI AVANZATI (Livelli 51-100)
    // ============================================
    
    GHOST: {
        id: 'ghost',
        name: 'Fantasma',
        category: EnemyCategory.FLYING,
        icon: '👻',
        hp: 2,
        damage: 2,
        speed: 140,
        width: 32,
        height: 32,
        color: [0.7, 0.7, 1.0, 0.6],
        points: 50,
        pattern: 'phase', // Può attraversare piattaforme
        phaseInterval: 3.0,
        description: 'Fantasma che può attraversare le piattaforme',
        unlockLevel: 51
    },
    
    BOUNCER: {
        id: 'bouncer',
        name: 'Rimbalzante',
        category: EnemyCategory.JUMPER,
        icon: '⚽',
        hp: 2,
        damage: 1,
        speed: 200,
        width: 30,
        height: 30,
        color: [0.2, 0.6, 1.0, 1.0],
        points: 55,
        pattern: 'bounce', // Rimbalza continuamente
        bounceForce: -500,
        bounceMultiplier: 1.2,
        description: 'Nemico che rimbalza continuamente',
        unlockLevel: 60
    },
    
    SEEKER: {
        id: 'seeker',
        name: 'Cercatore',
        category: EnemyCategory.CHASER,
        icon: '🎯',
        hp: 3,
        damage: 2,
        speed: 220,
        width: 26,
        height: 26,
        color: [1.0, 0.4, 0.2, 1.0],
        points: 65,
        pattern: 'smart_chase', // Inseguimento intelligente con predizione
        predictionTime: 0.5,
        chaseRange: 350,
        description: 'Nemico intelligente che predice i movimenti',
        unlockLevel: 70
    },
    
    LASER_TURRET: {
        id: 'laser_turret',
        name: 'Torretta Laser',
        category: EnemyCategory.TURRET,
        icon: '🔴',
        hp: 4,
        damage: 2,
        speed: 0,
        width: 40,
        height: 40,
        color: [1.0, 0.1, 0.1, 1.0],
        points: 70,
        pattern: 'laser', // Spara laser continuo
        laserChargeTime: 1.5,
        laserDuration: 1.0,
        laserCooldown: 3.0,
        laserRange: 400,
        description: 'Torretta che spara laser devastanti',
        unlockLevel: 80
    },
    
    // ============================================
    // NEMICI ELITE (Livelli 101-150)
    // ============================================
    
    TANK: {
        id: 'tank',
        name: 'Carro Armato',
        category: EnemyCategory.GROUND,
        icon: '🚜',
        hp: 5,
        damage: 2,
        speed: 60,
        width: 50,
        height: 40,
        color: [0.3, 0.5, 0.3, 1.0],
        points: 80,
        pattern: 'heavy_patrol', // Lento ma resistente, spara
        shootInterval: 2.0,
        projectileSpeed: 250,
        armor: 2, // Riduce danno ricevuto
        description: 'Nemico corazzato lento ma potente',
        unlockLevel: 101
    },
    
    PHOENIX: {
        id: 'phoenix',
        name: 'Fenice',
        category: EnemyCategory.FLYING,
        icon: '🔥',
        hp: 3,
        damage: 2,
        speed: 160,
        width: 35,
        height: 35,
        color: [1.0, 0.5, 0.0, 1.0],
        points: 90,
        pattern: 'dive_bomb', // Vola, poi si tuffa sul player
        diveSpeed: 400,
        diveCooldown: 4.0,
        respawns: 1, // Rinasce una volta
        description: 'Uccello di fuoco che si tuffa e rinasce',
        unlockLevel: 110
    },
    
    TELEPORTER: {
        id: 'teleporter',
        name: 'Teletrasportatore',
        category: EnemyCategory.CHASER,
        icon: '✨',
        hp: 2,
        damage: 2,
        speed: 100,
        width: 28,
        height: 28,
        color: [0.8, 0.2, 0.8, 1.0],
        points: 100,
        pattern: 'teleport', // Si teletrasporta vicino al player
        teleportInterval: 3.0,
        teleportRange: 150,
        description: 'Nemico che si teletrasporta imprevedibilmente',
        unlockLevel: 120
    },
    
    SPAWNER: {
        id: 'spawner',
        name: 'Generatore',
        category: EnemyCategory.TURRET,
        icon: '🥚',
        hp: 6,
        damage: 0,
        speed: 0,
        width: 45,
        height: 45,
        color: [0.6, 0.4, 0.8, 1.0],
        points: 110,
        pattern: 'spawn', // Genera nemici minori
        spawnInterval: 5.0,
        maxSpawns: 3,
        spawnType: 'slug', // Genera lumache
        description: 'Genera continuamente nemici minori',
        unlockLevel: 130
    },
    
    // ============================================
    // MINI-BOSS (Livelli 151-200, ogni 10 livelli)
    // ============================================
    
    GOLEM: {
        id: 'golem',
        name: 'Golem',
        category: EnemyCategory.MINI_BOSS,
        icon: '🗿',
        hp: 15,
        damage: 3,
        speed: 40,
        width: 70,
        height: 70,
        color: [0.5, 0.4, 0.3, 1.0],
        points: 200,
        pattern: 'boss_multi', // Combina più pattern
        phases: [
            { hp: 15, pattern: 'stomp', stompRadius: 100, stompDamage: 2 },
            { hp: 8, pattern: 'throw_rocks', throwInterval: 1.5 },
            { hp: 3, pattern: 'rage', speedMultiplier: 2 }
        ],
        description: 'Boss di pietra con attacchi devastanti',
        unlockLevel: 150
    },
    
    DRAGON: {
        id: 'dragon',
        name: 'Drago',
        category: EnemyCategory.MINI_BOSS,
        icon: '🐉',
        hp: 20,
        damage: 3,
        speed: 120,
        width: 80,
        height: 60,
        color: [0.8, 0.2, 0.2, 1.0],
        points: 300,
        pattern: 'boss_multi',
        phases: [
            { hp: 20, pattern: 'fly_circle', fireBreath: true, fireInterval: 2.0 },
            { hp: 10, pattern: 'swoop', swoopSpeed: 500, swoopInterval: 3.0 },
            { hp: 5, pattern: 'meteor_shower', meteorCount: 8 }
        ],
        description: 'Drago maestoso con soffio di fuoco',
        unlockLevel: 160
    },
    
    SHADOW_LORD: {
        id: 'shadow_lord',
        name: 'Signore delle Ombre',
        category: EnemyCategory.MINI_BOSS,
        icon: '🌑',
        hp: 25,
        damage: 4,
        speed: 180,
        width: 60,
        height: 70,
        color: [0.2, 0.1, 0.3, 1.0],
        points: 400,
        pattern: 'boss_multi',
        phases: [
            { hp: 25, pattern: 'shadow_clone', cloneCount: 3, cloneHP: 3 },
            { hp: 15, pattern: 'teleport_strike', strikeCount: 5 },
            { hp: 5, pattern: 'void_zone', zoneDamage: 2, zoneSize: 150 }
        ],
        description: 'Boss oscuro che manipola le ombre',
        unlockLevel: 180
    },
    
    RAINBOW_KING: {
        id: 'rainbow_king',
        name: 'Re Arcobaleno',
        category: EnemyCategory.MINI_BOSS,
        icon: '👑',
        hp: 30,
        damage: 5,
        speed: 150,
        width: 90,
        height: 90,
        color: [1.0, 0.5, 0.8, 1.0],
        points: 500,
        pattern: 'boss_multi',
        phases: [
            { hp: 30, pattern: 'rainbow_beam', beamDamage: 3, beamCount: 7 },
            { hp: 20, pattern: 'prism_split', splitCount: 5 },
            { hp: 10, pattern: 'color_chaos', chaosIntensity: 1.5 },
            { hp: 5, pattern: 'final_burst', burstDamage: 5 }
        ],
        description: 'Boss finale maestoso con poteri arcobaleno',
        unlockLevel: 200,
        isFinalBoss: true
    }
};

/**
 * Get enemy configuration by ID
 */
export function getEnemyConfig(enemyId) {
    for (const key in EnemyTypes) {
        if (EnemyTypes[key].id === enemyId) {
            return EnemyTypes[key];
        }
    }
    return null;
}

/**
 * Get all enemies available at a specific level
 */
export function getAvailableEnemies(level) {
    const available = [];
    for (const key in EnemyTypes) {
        const enemy = EnemyTypes[key];
        if (enemy.unlockLevel <= level) {
            available.push(enemy);
        }
    }
    return available;
}

/**
 * Get enemies by category
 */
export function getEnemiesByCategory(category) {
    const enemies = [];
    for (const key in EnemyTypes) {
        if (EnemyTypes[key].category === category) {
            enemies.push(EnemyTypes[key]);
        }
    }
    return enemies;
}
