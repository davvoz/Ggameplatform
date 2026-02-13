/**
 * LevelData - Definizioni discrete per 100 livelli
 * 
 * RIBILANCIATO: ritmo più incalzante fin da subito, unlock nemici più rapidi,
 * difficoltà che scala in modo continuo fino a livelli infernali.
 * 
 * Ogni livello specifica:
 *   enemyPool:       array di { type, weight } per la selezione random pesata
 *   waveSize:        numero di nemici per wave (enemy1/2/3 standard)
 *   maxEnemies:      numero massimo di nemici contemporanei sullo schermo
 *   speedMultiplier: moltiplicatore velocità nemici
 *   waveInterval:    secondi tra una wave e l'altra (minimo)
 *   formationChance: probabilità (0-1) che la wave sia in formazione
 *   patterns:        pattern di movimento disponibili per le wave normali
 *   formations:      formazioni disponibili
 *   phantomCount:    quanti phantom per wave (enemy4)
 *   sentinelCount:   quanti sentinel per wave (enemy5)
 *   swarmCount:      quanti swarm per wave (enemy6)
 */

const LEVEL_DATA = [
    // === LIVELLI 1-3: Intro rapida ===
    { // Livello 1
        enemyPool: [{ type: 'enemy1', weight: 1 }],
        waveSize: 3, maxEnemies: 8, speedMultiplier: 1.0,
        waveInterval: 3.5, formationChance: 0.15,
        patterns: ['straight', 'sine', 'zigzag'],
        formations: ['line', 'v', 'spiral'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 0
    },
    { // Livello 2 - unlock enemy2
        enemyPool: [{ type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.3 }],
        waveSize: 4, maxEnemies: 10, speedMultiplier: 1.05,
        waveInterval: 3.2, formationChance: 0.20,
        patterns: ['straight', 'sine', 'dive'],
        formations: ['line', 'v', 'arrow', 'wall'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 0
    },
    { // Livello 3 - unlock enemy6 (swarm)
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.4 },
            { type: 'enemy6', weight: 0.15 }
        ],
        waveSize: 4, maxEnemies: 11, speedMultiplier: 1.10,
        waveInterval: 3.0, formationChance: 0.25,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['line', 'v', 'arrow', 'wall'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 4
    },

    // === LIVELLI 4-6: Crescita veloce ===
    { // Livello 4 - unlock enemy3
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.5 },
            { type: 'enemy3', weight: 0.15 }, { type: 'enemy6', weight: 0.2 }
        ],
        waveSize: 5, maxEnemies: 12, speedMultiplier: 1.15,
        waveInterval: 2.8, formationChance: 0.30,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['line', 'v', 'arrow', 'wall', 'diamond'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 5
    },
    { // Livello 5
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.6 },
            { type: 'enemy3', weight: 0.25 }, { type: 'enemy6', weight: 0.25 }
        ],
        waveSize: 5, maxEnemies: 13, speedMultiplier: 1.20,
        waveInterval: 2.6, formationChance: 0.35,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['line', 'v', 'arrow', 'wall', 'diamond', 'spiral'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 5
    },
    { // Livello 6
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.7 },
            { type: 'enemy3', weight: 0.3 }, { type: 'enemy6', weight: 0.3 }
        ],
        waveSize: 5, maxEnemies: 14, speedMultiplier: 1.25,
        waveInterval: 2.5, formationChance: 0.38,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'wall', 'arrow'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 6
    },

    // === LIVELLI 7-10: Intensificazione ===
    { // Livello 7
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.8 },
            { type: 'enemy3', weight: 0.35 }, { type: 'enemy6', weight: 0.3 }
        ],
        waveSize: 6, maxEnemies: 15, speedMultiplier: 1.30,
        waveInterval: 2.3, formationChance: 0.42,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 0, sentinelCount: 0, swarmCount: 6
    },
    { // Livello 8 - unlock enemy4 (Phantom)
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.85 },
            { type: 'enemy3', weight: 0.4 }, { type: 'enemy6', weight: 0.3 },
            { type: 'enemy4', weight: 0.15 }
        ],
        waveSize: 6, maxEnemies: 16, speedMultiplier: 1.35,
        waveInterval: 2.2, formationChance: 0.45,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 0, swarmCount: 6
    },
    { // Livello 9
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.9 },
            { type: 'enemy3', weight: 0.45 }, { type: 'enemy6', weight: 0.35 },
            { type: 'enemy4', weight: 0.2 }
        ],
        waveSize: 6, maxEnemies: 17, speedMultiplier: 1.38,
        waveInterval: 2.1, formationChance: 0.48,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 0, swarmCount: 7
    },
    { // Livello 10 - unlock enemy5 (Sentinel)
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.8 },
            { type: 'enemy3', weight: 0.35 }, { type: 'enemy6', weight: 0.3 },
            { type: 'enemy4', weight: 0.18 }, { type: 'enemy5', weight: 0.08 }
        ],
        waveSize: 5, maxEnemies: 15, speedMultiplier: 1.30,
        waveInterval: 2.4, formationChance: 0.42,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 1, sentinelCount: 1, swarmCount: 6
    },

    // === LIVELLI 11-15: Full roster, pressione crescente ===
    { // Livello 11
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.85 },
            { type: 'enemy3', weight: 0.4 }, { type: 'enemy6', weight: 0.35 },
            { type: 'enemy4', weight: 0.22 }, { type: 'enemy5', weight: 0.1 }
        ],
        waveSize: 5, maxEnemies: 16, speedMultiplier: 1.34,
        waveInterval: 2.3, formationChance: 0.48,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 1, sentinelCount: 1, swarmCount: 6
    },
    { // Livello 12
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.9 },
            { type: 'enemy3', weight: 0.45 }, { type: 'enemy6', weight: 0.35 },
            { type: 'enemy4', weight: 0.25 }, { type: 'enemy5', weight: 0.14 }
        ],
        waveSize: 6, maxEnemies: 16, speedMultiplier: 1.38,
        waveInterval: 2.2, formationChance: 0.50,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 1, swarmCount: 7
    },
    { // Livello 13
        enemyPool: [
            { type: 'enemy1', weight: 1 }, { type: 'enemy2', weight: 0.95 },
            { type: 'enemy3', weight: 0.5 }, { type: 'enemy6', weight: 0.38 },
            { type: 'enemy4', weight: 0.28 }, { type: 'enemy5', weight: 0.18 }
        ],
        waveSize: 6, maxEnemies: 17, speedMultiplier: 1.42,
        waveInterval: 2.1, formationChance: 0.52,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 1, swarmCount: 7
    },
    { // Livello 14
        enemyPool: [
            { type: 'enemy1', weight: 0.95 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.55 }, { type: 'enemy6', weight: 0.4 },
            { type: 'enemy4', weight: 0.32 }, { type: 'enemy5', weight: 0.2 }
        ],
        waveSize: 6, maxEnemies: 18, speedMultiplier: 1.46,
        waveInterval: 2.0, formationChance: 0.55,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 1, swarmCount: 7
    },
    { // Livello 15
        enemyPool: [
            { type: 'enemy1', weight: 0.9 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.6 }, { type: 'enemy6', weight: 0.42 },
            { type: 'enemy4', weight: 0.35 }, { type: 'enemy5', weight: 0.24 }
        ],
        waveSize: 7, maxEnemies: 19, speedMultiplier: 1.50,
        waveInterval: 1.9, formationChance: 0.58,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 2, swarmCount: 8
    },

    // === LIVELLI 16-20: Difficoltà seria ===
    { // Livello 16
        enemyPool: [
            { type: 'enemy1', weight: 0.75 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.5 },
            { type: 'enemy4', weight: 0.48 }, { type: 'enemy5', weight: 0.32 }
        ],
        waveSize: 8, maxEnemies: 22, speedMultiplier: 1.66,
        waveInterval: 1.65, formationChance: 0.68,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 3, sentinelCount: 2, swarmCount: 9
    },
    { // Livello 17
        enemyPool: [
            { type: 'enemy1', weight: 0.7 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.55 },
            { type: 'enemy4', weight: 0.5 }, { type: 'enemy5', weight: 0.35 }
        ],
        waveSize: 8, maxEnemies: 22, speedMultiplier: 1.70,
        waveInterval: 1.60, formationChance: 0.70,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 3, sentinelCount: 2, swarmCount: 9
    },
    { // Livello 18
        enemyPool: [
            { type: 'enemy1', weight: 0.8 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.65 }, { type: 'enemy6', weight: 0.45 },
            { type: 'enemy4', weight: 0.38 }, { type: 'enemy5', weight: 0.28 }
        ],
        waveSize: 7, maxEnemies: 20, speedMultiplier: 1.58,
        waveInterval: 1.80, formationChance: 0.62,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 2, sentinelCount: 2, swarmCount: 8
    },
    { // Livello 19
        enemyPool: [
            { type: 'enemy1', weight: 0.6 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.55 },
            { type: 'enemy4', weight: 0.55 }, { type: 'enemy5', weight: 0.4 }
        ],
        waveSize: 8, maxEnemies: 23, speedMultiplier: 1.78,
        waveInterval: 1.50, formationChance: 0.74,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 2, swarmCount: 10
    },
    { // Livello 20
        enemyPool: [
            { type: 'enemy1', weight: 0.55 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.55 }, { type: 'enemy5', weight: 0.42 }
        ],
        waveSize: 8, maxEnemies: 24, speedMultiplier: 1.82,
        waveInterval: 1.45, formationChance: 0.76,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 2, swarmCount: 10
    },

    // === LIVELLI 21-30: Sfida vera ===
    { // Livello 21
        enemyPool: [
            { type: 'enemy1', weight: 0.5 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.55 }, { type: 'enemy5', weight: 0.44 }
        ],
        waveSize: 8, maxEnemies: 24, speedMultiplier: 1.85,
        waveInterval: 1.42, formationChance: 0.78,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 10
    },
    { // Livello 22
        enemyPool: [
            { type: 'enemy1', weight: 0.45 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.55 }, { type: 'enemy5', weight: 0.45 }
        ],
        waveSize: 8, maxEnemies: 25, speedMultiplier: 1.88,
        waveInterval: 1.38, formationChance: 0.78,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 10
    },
    { // Livello 23
        enemyPool: [
            { type: 'enemy1', weight: 0.4 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.58 }, { type: 'enemy5', weight: 0.45 }
        ],
        waveSize: 8, maxEnemies: 25, speedMultiplier: 1.90,
        waveInterval: 1.35, formationChance: 0.80,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 11
    },
    { // Livello 24
        enemyPool: [
            { type: 'enemy1', weight: 0.38 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.58 }, { type: 'enemy5', weight: 0.46 }
        ],
        waveSize: 8, maxEnemies: 25, speedMultiplier: 1.92,
        waveInterval: 1.32, formationChance: 0.80,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 11
    },
    { // Livello 25
        enemyPool: [
            { type: 'enemy1', weight: 0.35 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.48 }
        ],
        waveSize: 8, maxEnemies: 26, speedMultiplier: 1.95,
        waveInterval: 1.28, formationChance: 0.82,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 11
    },
    { // Livello 26
        enemyPool: [
            { type: 'enemy1', weight: 0.3 }, { type: 'enemy2', weight: 1.0 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.48 }
        ],
        waveSize: 8, maxEnemies: 26, speedMultiplier: 1.98,
        waveInterval: 1.25, formationChance: 0.82,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 11
    },
    { // Livello 27
        enemyPool: [
            { type: 'enemy1', weight: 0.28 }, { type: 'enemy2', weight: 0.95 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 26, speedMultiplier: 2.00,
        waveInterval: 1.22, formationChance: 0.82,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 11
    },
    { // Livello 28
        enemyPool: [
            { type: 'enemy1', weight: 0.25 }, { type: 'enemy2', weight: 0.9 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 27, speedMultiplier: 2.02,
        waveInterval: 1.20, formationChance: 0.84,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 29
        enemyPool: [
            { type: 'enemy1', weight: 0.22 }, { type: 'enemy2', weight: 0.85 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 27, speedMultiplier: 2.05,
        waveInterval: 1.18, formationChance: 0.84,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 30
        enemyPool: [
            { type: 'enemy1', weight: 0.2 }, { type: 'enemy2', weight: 0.8 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 28, speedMultiplier: 2.08,
        waveInterval: 1.15, formationChance: 0.85,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 31-40: Avanzato ===
    { // Livello 31
        enemyPool: [
            { type: 'enemy1', weight: 0.18 }, { type: 'enemy2', weight: 0.75 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 28, speedMultiplier: 2.10,
        waveInterval: 1.12, formationChance: 0.85,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 32
        enemyPool: [
            { type: 'enemy1', weight: 0.15 }, { type: 'enemy2', weight: 0.7 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 28, speedMultiplier: 2.12,
        waveInterval: 1.10, formationChance: 0.86,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 33
        enemyPool: [
            { type: 'enemy1', weight: 0.12 }, { type: 'enemy2', weight: 0.65 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 28, speedMultiplier: 2.14,
        waveInterval: 1.08, formationChance: 0.86,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 34
        enemyPool: [
            { type: 'enemy1', weight: 0.1 }, { type: 'enemy2', weight: 0.6 },
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.6 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 29, speedMultiplier: 2.16,
        waveInterval: 1.06, formationChance: 0.87,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 35
        enemyPool: [
            { type: 'enemy2', weight: 0.55 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 29, speedMultiplier: 2.18,
        waveInterval: 1.04, formationChance: 0.87,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 36
        enemyPool: [
            { type: 'enemy2', weight: 0.5 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 29, speedMultiplier: 2.20,
        waveInterval: 1.02, formationChance: 0.88,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 37
        enemyPool: [
            { type: 'enemy2', weight: 0.45 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.22,
        waveInterval: 1.00, formationChance: 0.88,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 38
        enemyPool: [
            { type: 'enemy2', weight: 0.4 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.24,
        waveInterval: 1.00, formationChance: 0.88,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 39
        enemyPool: [
            { type: 'enemy2', weight: 0.35 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.5 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.26,
        waveInterval: 1.00, formationChance: 0.90,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 40
        enemyPool: [
            { type: 'enemy2', weight: 0.3 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.28,
        waveInterval: 1.00, formationChance: 0.90,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 41-50: Esperto ===
    { // Livello 41
        enemyPool: [
            { type: 'enemy2', weight: 0.25 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.30,
        waveInterval: 1.00, formationChance: 0.90,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 42
        enemyPool: [
            { type: 'enemy2', weight: 0.22 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.6 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.32,
        waveInterval: 0.98, formationChance: 0.90,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 43
        enemyPool: [
            { type: 'enemy2', weight: 0.2 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.65 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.34,
        waveInterval: 0.96, formationChance: 0.90,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 44
        enemyPool: [
            { type: 'enemy2', weight: 0.18 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.65 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.36,
        waveInterval: 0.94, formationChance: 0.92,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 45
        enemyPool: [
            { type: 'enemy2', weight: 0.15 }, { type: 'enemy3', weight: 0.85 },
            { type: 'enemy6', weight: 0.65 }, { type: 'enemy4', weight: 0.6 },
            { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.38,
        waveInterval: 0.92, formationChance: 0.92,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 46
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.40,
        waveInterval: 0.90, formationChance: 0.92,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 47
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.42,
        waveInterval: 0.88, formationChance: 0.92,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 48
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.55 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.44,
        waveInterval: 0.86, formationChance: 0.92,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 49
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.58 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.46,
        waveInterval: 0.84, formationChance: 0.93,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 50
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.48,
        waveInterval: 0.82, formationChance: 0.93,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 51-60: Endgame ===
    { // Livello 51
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.50,
        waveInterval: 0.80, formationChance: 0.93,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 52
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.65 },
            { type: 'enemy4', weight: 0.6 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.52,
        waveInterval: 0.80, formationChance: 0.93,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 53
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.68 },
            { type: 'enemy4', weight: 0.62 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.54,
        waveInterval: 0.80, formationChance: 0.93,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 54
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.68 },
            { type: 'enemy4', weight: 0.62 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.56,
        waveInterval: 0.80, formationChance: 0.94,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 55
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.62 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.58,
        waveInterval: 0.80, formationChance: 0.94,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 56
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.65 }, { type: 'enemy5', weight: 0.6 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.60,
        waveInterval: 0.80, formationChance: 0.94,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 57
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.65 }, { type: 'enemy5', weight: 0.62 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.62,
        waveInterval: 0.80, formationChance: 0.94,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 58
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.65 }, { type: 'enemy5', weight: 0.62 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.64,
        waveInterval: 0.80, formationChance: 0.94,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 59
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.68 }, { type: 'enemy5', weight: 0.65 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.66,
        waveInterval: 0.80, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 60
        enemyPool: [
            { type: 'enemy3', weight: 0.85 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.68 }, { type: 'enemy5', weight: 0.65 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.68,
        waveInterval: 0.80, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 61-70: Hardcore ===
    { // Livello 61
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.7 }, { type: 'enemy5', weight: 0.65 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.70,
        waveInterval: 0.78, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 62
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.7 }, { type: 'enemy5', weight: 0.65 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.72,
        waveInterval: 0.78, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 63
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.7 }, { type: 'enemy5', weight: 0.68 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.74,
        waveInterval: 0.76, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 64
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.7 }, { type: 'enemy5', weight: 0.68 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.76,
        waveInterval: 0.76, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 65
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.7 },
            { type: 'enemy4', weight: 0.72 }, { type: 'enemy5', weight: 0.7 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.78,
        waveInterval: 0.74, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 66
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.72 },
            { type: 'enemy4', weight: 0.72 }, { type: 'enemy5', weight: 0.7 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.80,
        waveInterval: 0.74, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 67
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.72 },
            { type: 'enemy4', weight: 0.72 }, { type: 'enemy5', weight: 0.7 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.82,
        waveInterval: 0.72, formationChance: 0.95,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 68
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.72 },
            { type: 'enemy4', weight: 0.74 }, { type: 'enemy5', weight: 0.72 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.84,
        waveInterval: 0.72, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 69
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.74 },
            { type: 'enemy4', weight: 0.74 }, { type: 'enemy5', weight: 0.72 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.86,
        waveInterval: 0.70, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 70
        enemyPool: [
            { type: 'enemy3', weight: 0.8 }, { type: 'enemy6', weight: 0.75 },
            { type: 'enemy4', weight: 0.75 }, { type: 'enemy5', weight: 0.72 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.88,
        waveInterval: 0.70, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 71-80: Nightmare ===
    { // Livello 71
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.75 },
            { type: 'enemy4', weight: 0.75 }, { type: 'enemy5', weight: 0.75 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.90,
        waveInterval: 0.68, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 72
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.75 },
            { type: 'enemy4', weight: 0.75 }, { type: 'enemy5', weight: 0.75 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.92,
        waveInterval: 0.68, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 73
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.75 },
            { type: 'enemy4', weight: 0.78 }, { type: 'enemy5', weight: 0.75 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.94,
        waveInterval: 0.66, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 74
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.75 },
            { type: 'enemy4', weight: 0.78 }, { type: 'enemy5', weight: 0.78 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.96,
        waveInterval: 0.66, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 75
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.78 },
            { type: 'enemy4', weight: 0.8 }, { type: 'enemy5', weight: 0.78 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 2.98,
        waveInterval: 0.64, formationChance: 0.96,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 76
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.78 },
            { type: 'enemy4', weight: 0.8 }, { type: 'enemy5', weight: 0.8 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.00,
        waveInterval: 0.64, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 77
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.8 },
            { type: 'enemy4', weight: 0.8 }, { type: 'enemy5', weight: 0.8 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.02,
        waveInterval: 0.62, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 78
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.8 },
            { type: 'enemy4', weight: 0.82 }, { type: 'enemy5', weight: 0.8 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.04,
        waveInterval: 0.62, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 79
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.8 },
            { type: 'enemy4', weight: 0.82 }, { type: 'enemy5', weight: 0.82 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.06,
        waveInterval: 0.60, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 80
        enemyPool: [
            { type: 'enemy3', weight: 0.75 }, { type: 'enemy6', weight: 0.82 },
            { type: 'enemy4', weight: 0.85 }, { type: 'enemy5', weight: 0.85 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.08,
        waveInterval: 0.60, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 81-90: Ultra ===
    { // Livello 81
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.82 },
            { type: 'enemy4', weight: 0.85 }, { type: 'enemy5', weight: 0.85 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.10,
        waveInterval: 0.58, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 82
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.82 },
            { type: 'enemy4', weight: 0.85 }, { type: 'enemy5', weight: 0.85 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.12,
        waveInterval: 0.58, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 83
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.85 },
            { type: 'enemy4', weight: 0.85 }, { type: 'enemy5', weight: 0.85 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.14,
        waveInterval: 0.56, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 84
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.85 },
            { type: 'enemy4', weight: 0.88 }, { type: 'enemy5', weight: 0.85 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.16,
        waveInterval: 0.56, formationChance: 0.97,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 85
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.85 },
            { type: 'enemy4', weight: 0.88 }, { type: 'enemy5', weight: 0.88 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.18,
        waveInterval: 0.54, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 86
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.85 },
            { type: 'enemy4', weight: 0.9 }, { type: 'enemy5', weight: 0.88 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.20,
        waveInterval: 0.54, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 87
        enemyPool: [
            { type: 'enemy3', weight: 0.7 }, { type: 'enemy6', weight: 0.85 },
            { type: 'enemy4', weight: 0.9 }, { type: 'enemy5', weight: 0.9 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.22,
        waveInterval: 0.52, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 88
        enemyPool: [
            { type: 'enemy3', weight: 0.65 }, { type: 'enemy6', weight: 0.88 },
            { type: 'enemy4', weight: 0.9 }, { type: 'enemy5', weight: 0.9 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.24,
        waveInterval: 0.52, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 89
        enemyPool: [
            { type: 'enemy3', weight: 0.65 }, { type: 'enemy6', weight: 0.88 },
            { type: 'enemy4', weight: 0.92 }, { type: 'enemy5', weight: 0.9 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.26,
        waveInterval: 0.50, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 90
        enemyPool: [
            { type: 'enemy3', weight: 0.65 }, { type: 'enemy6', weight: 0.9 },
            { type: 'enemy4', weight: 0.92 }, { type: 'enemy5', weight: 0.92 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.28,
        waveInterval: 0.50, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },

    // === LIVELLI 91-100: Inferno ===
    { // Livello 91
        enemyPool: [
            { type: 'enemy3', weight: 0.6 }, { type: 'enemy6', weight: 0.9 },
            { type: 'enemy4', weight: 0.92 }, { type: 'enemy5', weight: 0.92 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.30,
        waveInterval: 0.50, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 92
        enemyPool: [
            { type: 'enemy3', weight: 0.6 }, { type: 'enemy6', weight: 0.9 },
            { type: 'enemy4', weight: 0.95 }, { type: 'enemy5', weight: 0.92 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.32,
        waveInterval: 0.48, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 93
        enemyPool: [
            { type: 'enemy3', weight: 0.6 }, { type: 'enemy6', weight: 0.9 },
            { type: 'enemy4', weight: 0.95 }, { type: 'enemy5', weight: 0.95 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.34,
        waveInterval: 0.48, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 94
        enemyPool: [
            { type: 'enemy6', weight: 0.9 }, { type: 'enemy4', weight: 0.95 },
            { type: 'enemy5', weight: 0.95 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.36,
        waveInterval: 0.46, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 95
        enemyPool: [
            { type: 'enemy6', weight: 0.9 }, { type: 'enemy4', weight: 0.95 },
            { type: 'enemy5', weight: 0.95 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.38,
        waveInterval: 0.46, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 96
        enemyPool: [
            { type: 'enemy6', weight: 0.92 }, { type: 'enemy4', weight: 0.95 },
            { type: 'enemy5', weight: 0.95 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.40,
        waveInterval: 0.44, formationChance: 0.98,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 97
        enemyPool: [
            { type: 'enemy6', weight: 0.92 }, { type: 'enemy4', weight: 0.98 },
            { type: 'enemy5', weight: 0.98 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.42,
        waveInterval: 0.44, formationChance: 0.99,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 98
        enemyPool: [
            { type: 'enemy6', weight: 0.95 }, { type: 'enemy4', weight: 1.0 },
            { type: 'enemy5', weight: 1.0 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.44,
        waveInterval: 0.42, formationChance: 0.99,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 99
        enemyPool: [
            { type: 'enemy6', weight: 0.95 }, { type: 'enemy4', weight: 1.0 },
            { type: 'enemy5', weight: 1.0 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.46,
        waveInterval: 0.42, formationChance: 0.99,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    },
    { // Livello 100
        enemyPool: [
            { type: 'enemy6', weight: 1.0 }, { type: 'enemy4', weight: 1.0 },
            { type: 'enemy5', weight: 1.0 }
        ],
        waveSize: 8, maxEnemies: 30, speedMultiplier: 3.50,
        waveInterval: 0.40, formationChance: 1.0,
        patterns: ['straight', 'sine', 'zigzag', 'dive'],
        formations: ['v', 'line', 'diamond', 'spiral', 'pincer', 'cross', 'wall', 'arrow'],
        phantomCount: 4, sentinelCount: 3, swarmCount: 12
    }
];

/**
 * Ottieni i dati del livello. Per livelli > 100, usa il livello 100.
 * @param {number} level - Livello corrente (1-based)
 * @returns {object} Dati del livello
 */
function getLevelData(level) {
    const index = Math.min(level, LEVEL_DATA.length) - 1;
    return LEVEL_DATA[Math.max(0, index)];
}

export { getLevelData };