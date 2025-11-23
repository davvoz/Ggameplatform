/**
 * LevelConfiguration - Definizione predefinita di tutti i 200 livelli
 * Ogni livello ha una struttura fissa di piattaforme, nemici e obiettivi
 */

import { EnemyTypes } from './EnemyTypes.js';

/**
 * Difficulty tiers for levels
 */
export const DifficultyTier = {
    TUTORIAL: 'tutorial',       // 1-10: Imparare meccaniche
    EASY: 'easy',              // 11-40: Facile, poche minacce
    NORMAL: 'normal',          // 41-80: Normale, bilanciato
    HARD: 'hard',              // 81-140: Difficile, molti nemici
    EXPERT: 'expert',          // 141-180: Esperto, pattern complessi
    MASTER: 'master'           // 181-200: Master, sfide estreme
};

/**
 * Platform pattern templates
 */
export const PlatformPatterns = {
    STRAIGHT: 'straight',        // Piattaforme in linea retta
    STAIRS_UP: 'stairs_up',      // Scalinate verso l'alto
    STAIRS_DOWN: 'stairs_down',  // Scalinate verso il basso
    ZIGZAG: 'zigzag',            // Pattern a zigzag
    GAPS: 'gaps',                // Grandi spazi tra piattaforme
    NARROW: 'narrow',            // Piattaforme strette
    MOVING: 'moving',            // Piattaforme mobili
    CRUMBLING: 'crumbling',      // Molte piattaforme instabili
    BOUNCY: 'bouncy',            // Trampolini
    ICY: 'icy'                   // Piattaforme ghiacciate
};

/**
 * Level objectives/challenges
 */
export const LevelObjective = {
    REACH_END: 'reach_end',              // Raggiungi la fine
    COLLECT_ALL: 'collect_all_coins',    // Raccogli tutte le monete
    KILL_ALL: 'kill_all_enemies',        // Uccidi tutti i nemici
    TIME_TRIAL: 'time_trial',            // Completa entro tempo limite
    NO_DAMAGE: 'no_damage',              // Non subire danni
    HIGH_COMBO: 'high_combo',            // Mantieni combo alta
    BOSS_FIGHT: 'boss_fight'             // Sconfiggi il boss
};

/**
 * Generate level configuration
 * Ogni livello ha:
 * - id: numero livello (1-200)
 * - name: nome del livello
 * - difficulty: tier di difficoltà
 * - platforms: array di piattaforme con posizioni fisse
 * - enemies: array di nemici con posizioni fisse
 * - collectibles: monete e power-up posizionati
 * - objectives: obiettivi da completare
 * - par_time: tempo obiettivo per 3 stelle
 * - theme: tema visivo del livello
 */

/**
 * Livello template base
 */
function createBaseLevel(id, overrides = {}) {
    return {
        id,
        name: `Level ${id}`,
        difficulty: DifficultyTier.EASY,
        theme: 'rainbow',
        platforms: [],
        enemies: [],
        collectibles: [],
        obstacles: [],
        objectives: [LevelObjective.REACH_END],
        parTime: {
            threeStars: 15,  // < 15s = 3 stelle
            twoStars: 25,    // < 25s = 2 stelle
            oneStar: 45      // < 45s = 1 stella
        },
        starRequirements: {
            threeStars: { time: 15, coins: 1.0, enemies: 1.0, noDamage: true },
            twoStars: { time: 25, coins: 0.8, enemies: 0.7 },
            oneStar: { time: 45, coins: 0.5 }
        },
        ...overrides
    };
}

/**
 * Genera piattaforme con pattern
 */
function generatePlatformPattern(pattern, startX, startY, count, options = {}) {
    const platforms = [];
    const spacing = options.spacing || 100;
    const width = options.width || 250;
    const height = 20;
    
    // Limiti Y per mantenere piattaforme visibili (canvas 800px altezza)
    const MIN_Y = 100;
    const MAX_Y = 650;
    
    const clampY = (y) => Math.max(MIN_Y, Math.min(MAX_Y, y));
    
    switch (pattern) {
        case PlatformPatterns.STRAIGHT:
            for (let i = 0; i < count; i++) {
                platforms.push({
                    x: startX + i * spacing,
                    y: clampY(startY),
                    width,
                    height,
                    type: options.platformType || 'normal'
                });
            }
            break;
            
        case PlatformPatterns.STAIRS_UP:
            for (let i = 0; i < count; i++) {
                platforms.push({
                    x: startX + i * spacing,
                    y: clampY(startY - i * 50),
                    width,
                    height,
                    type: options.platformType || 'normal'
                });
            }
            break;
            
        case PlatformPatterns.STAIRS_DOWN:
            for (let i = 0; i < count; i++) {
                platforms.push({
                    x: startX + i * spacing,
                    y: clampY(startY + i * 50),
                    width,
                    height,
                    type: options.platformType || 'normal'
                });
            }
            break;
            
        case PlatformPatterns.ZIGZAG:
            for (let i = 0; i < count; i++) {
                const yOffset = (i % 2 === 0) ? 0 : -60;
                platforms.push({
                    x: startX + i * spacing,
                    y: clampY(startY + yOffset),
                    width,
                    height,
                    type: options.platformType || 'normal'
                });
            }
            break;
            
        case PlatformPatterns.GAPS:
            for (let i = 0; i < count; i++) {
                platforms.push({
                    x: startX + i * spacing * 2, // Spazi più larghi
                    y: clampY(startY),
                    width: width * 0.7, // Piattaforme più strette
                    height,
                    type: options.platformType || 'normal'
                });
            }
            break;
    }
    
    return platforms;
}

/**
 * Genera nemici su piattaforme
 */
function placeEnemyOnPlatform(platform, enemyType, offset = 0) {
    if (!platform) {
        console.warn('Platform is undefined for enemy placement');
        return null;
    }
    const enemy = {
        type: enemyType,
        x: platform.x + platform.width / 2 + offset,
        y: platform.y - 30,
        platformIndex: platform.index || 0
    };
    return enemy;
}

/**
 * GENERAZIONE LIVELLI 1-200
 */
export const Levels = [];

// ============================================
// LIVELLI TUTORIAL (1-3) - Imparare le basi VELOCEMENTE
// ============================================
for (let i = 1; i <= 3; i++) {
    const level = createBaseLevel(i, {
        name: `Tutorial ${i}`,
        difficulty: DifficultyTier.TUTORIAL,
        parTime: { threeStars: 12, twoStars: 18, oneStar: 30 }
    });
    
    // Tutorial più corto ma con più azione
    level.platforms = generatePlatformPattern(
        PlatformPatterns.STRAIGHT,
        50, 500, 8,
        { spacing: 160, width: 280 }
    );
    
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Livello 2 e 3 hanno più nemici per insegnare subito
    if (i >= 2 && level.platforms.length > 5) {
        const enemies = [
            placeEnemyOnPlatform(level.platforms[2], EnemyTypes.SLUG.id),
            placeEnemyOnPlatform(level.platforms[4], EnemyTypes.SLUG.id),
            placeEnemyOnPlatform(level.platforms[6], EnemyTypes.SLUG.id)
        ];
        level.enemies = enemies.filter(e => e !== null);
    }
    
    // Più monete per premiare esplorazione
    level.collectibles = level.platforms.filter((_, idx) => idx % 2 === 1).slice(0, -1).map(p => ({
        type: 'coin',
        x: p.x + p.width / 2,
        y: p.y - 60,
        value: 10
    }));
    
    // Aggiungi powerup nel livello 3
    if (i === 3 && level.platforms.length > 4) {
        level.collectibles.push({
            type: 'powerup',
            powerupType: 'superJump',
            x: level.platforms[4].x + level.platforms[4].width / 2,
            y: level.platforms[4].y - 80
        });
    }
    
    // Aggiungi cuore bonus nel livello 2 e 3
    if (i === 2 && level.platforms.length > 3) {
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[3].x + level.platforms[3].width / 2,
            y: level.platforms[3].y - 80,
            value: 1
        });
    }
    if (i === 3 && level.platforms.length > 3) {
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[3].x + level.platforms[3].width / 2,
            y: level.platforms[3].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI FACILI (4-15) - Curva difficoltà più ripida
// ============================================
for (let i = 4; i <= 15; i++) {
    const level = createBaseLevel(i, {
        name: `World 1-${i - 3}`,
        difficulty: DifficultyTier.EASY,
        theme: 'sky',
        parTime: { threeStars: 25, twoStars: 35, oneStar: 55 }
    });
    
    // Pattern sempre più complessi
    const patterns = [PlatformPatterns.ZIGZAG, PlatformPatterns.STAIRS_UP, PlatformPatterns.GAPS, PlatformPatterns.STAIRS_DOWN];
    const pattern = patterns[(i - 4) % patterns.length];
    
    // Livelli più lunghi - da 15 a 25 piattaforme
    const platformCount = 15 + Math.floor((i - 4) * 1.2);
    
    level.platforms = generatePlatformPattern(
        pattern,
        50, 450, platformCount,
        { spacing: pattern === PlatformPatterns.GAPS ? 200 : 120, width: 240 }
    );
    
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Introduci tipi di piattaforme speciali prima
    if (i >= 5) {
        for (let j = 3; j < level.platforms.length; j += 3) {
            level.platforms[j].type = 'fast';
        }
    }
    if (i >= 6) {
        for (let j = 4; j < level.platforms.length; j += 4) {
            level.platforms[j].type = 'bouncy';
        }
    }
    if (i >= 8) {
        for (let j = 2; j < level.platforms.length; j += 5) {
            level.platforms[j].type = 'crumbling';
        }
    }
    if (i >= 10) {
        for (let j = 6; j < level.platforms.length; j += 6) {
            level.platforms[j].type = 'icy';
        }
    }
    
    // Più nemici - curva ripida (50% in più)
    const enemyCount = Math.floor((i - 3) * 1.8);
    level.enemies = [];
    for (let e = 0; e < enemyCount; e++) {
        const platformIdx = Math.floor((e + 1) * (level.platforms.length / (enemyCount + 1)));
        if (platformIdx < level.platforms.length) {
            let enemyType = EnemyTypes.SLUG.id;
            if (i >= 6 && e % 3 === 0) enemyType = EnemyTypes.SPIKE_BALL.id;
            if (i >= 8 && e % 4 === 0) enemyType = EnemyTypes.FLY.id;
            if (i >= 12 && e % 5 === 0) enemyType = EnemyTypes.WASP.id;
            
            const enemy = placeEnemyOnPlatform(level.platforms[platformIdx], enemyType);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Più monete e powerup strategici
    level.collectibles = [];
    for (let c = 1; c < level.platforms.length - 1; c += 2) {
        level.collectibles.push({
            type: 'coin',
            x: level.platforms[c].x + level.platforms[c].width / 2,
            y: level.platforms[c].y - 80,
            value: 10
        });
    }
    
    // Powerup ogni 4 livelli
    if (i % 4 === 0 && level.platforms.length > 6) {
        const powerupTypes = ['superJump', 'flight', 'immortality'];
        const powerupType = powerupTypes[Math.floor(i / 4) % powerupTypes.length];
        const platformIdx = Math.floor(level.platforms.length * 0.6);
        
        level.collectibles.push({
            type: 'powerup',
            powerupType: powerupType,
            x: level.platforms[platformIdx].x + level.platforms[platformIdx].width / 2,
            y: level.platforms[platformIdx].y - 80
        });
    }
    
    // Bonus vita ogni 2 livelli - 2 cuoricini per livello
    if (i % 2 === 0 && level.platforms.length >= 5) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.3);
        const platformIdx2 = Math.floor(level.platforms.length * 0.7);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI NORMALI (16-40) - Sfide bilanciate che RICHIEDONO turbo/volo
// ============================================
for (let i = 16; i <= 40; i++) {
    const level = createBaseLevel(i, {
        name: `World 2-${i - 15}`,
        difficulty: DifficultyTier.NORMAL,
        theme: 'forest',
        parTime: { threeStars: 25, twoStars: 40, oneStar: 60 }
    });
    
    const platformCount = 18 + Math.floor((i - 16) * 0.8);
    
    // Mix di pattern complessi
    const useGaps = i % 3 === 0;
    const useZigzag = i % 3 === 1;
    
    if (useGaps) {
        // Gaps LARGHI che richiedono TURBO o VOLO per superare
        level.platforms = generatePlatformPattern(
            PlatformPatterns.GAPS,
            50, 450, platformCount,
            { spacing: 220, width: 180 }
        );
    } else if (useZigzag) {
        level.platforms = generatePlatformPattern(
            PlatformPatterns.ZIGZAG,
            50, 400, platformCount,
            { spacing: 110, width: 200 }
        );
    } else {
        // Mix di stairs su/giù
        const half = Math.floor(platformCount / 2);
        level.platforms = [
            ...generatePlatformPattern(PlatformPatterns.STAIRS_UP, 50, 500, half, { spacing: 100, width: 200 }),
            ...generatePlatformPattern(PlatformPatterns.STAIRS_DOWN, 50 + half * 100, 500 - half * 50, half, { spacing: 100, width: 200 })
        ];
    }
    
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Tipi di piattaforme speciali più frequenti
    for (let j = 0; j < level.platforms.length; j++) {
        if (j % 5 === 2) level.platforms[j].type = 'fast';
        if (j % 6 === 4) level.platforms[j].type = 'bouncy';
        if (j % 8 === 6) level.platforms[j].type = 'crumbling';
        if (i >= 25 && j % 10 === 8) level.platforms[j].type = 'icy';
    }
    
    // Molti nemici variati
    const enemyCount = Math.floor(platformCount * 0.6);
    level.enemies = [];
    const enemyTypes = [EnemyTypes.SLUG.id, EnemyTypes.SPIKE_BALL.id, EnemyTypes.FLY.id];
    if (i >= 25) enemyTypes.push(EnemyTypes.CHOMPER.id);
    if (i >= 35) enemyTypes.push(EnemyTypes.WASP.id);
    
    for (let e = 0; e < enemyCount; e++) {
        const platformIdx = Math.floor((e + 1) * (level.platforms.length / (enemyCount + 1)));
        if (platformIdx < level.platforms.length && level.platforms[platformIdx]) {
            const enemyType = enemyTypes[e % enemyTypes.length];
            const enemy = placeEnemyOnPlatform(level.platforms[platformIdx], enemyType);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Monete in posizioni sfidanti - richiedono salti precisi o volo
    level.collectibles = [];
    for (let c = 0; c < level.platforms.length; c += 2) {
        level.collectibles.push({
            type: 'coin',
            x: level.platforms[c].x + level.platforms[c].width / 2,
            y: level.platforms[c].y - (c % 4 === 0 ? 120 : 70), // Alcune alte
            value: 10
        });
    }
    
    // Boss ogni 10 livelli
    if (i % 10 === 0) {
        level.name = `Boss: ${i === 20 ? 'Spike Guardian' : i === 30 ? 'Fly Swarm' : 'Wasp Queen'}`;
        level.objectives.push(LevelObjective.KILL_ALL);
        const bossPlatform = level.platforms[Math.floor(level.platforms.length * 0.7)];
        if (bossPlatform) {
            level.enemies = [
                {
                    type: i === 20 ? EnemyTypes.GOLEM.id : i === 30 ? EnemyTypes.CHOMPER.id : EnemyTypes.WASP.id,
                    x: bossPlatform.x,
                    y: bossPlatform.y - 70
                },
                // Nemici di supporto
                ...Array.from({ length: 5 }, (_, idx) => {
                    const pIdx = Math.floor(idx * level.platforms.length / 6);
                    if (pIdx < level.platforms.length && level.platforms[pIdx]) {
                        return placeEnemyOnPlatform(level.platforms[pIdx], EnemyTypes.SLUG.id);
                    }
                    return null;
                }).filter(e => e !== null)
            ];
        }
    }
    
    // Shield bonus ogni 5 livelli
    if (i % 5 === 0 && level.platforms.length > 8) {
        const platformIdx = Math.floor(level.platforms.length * 0.3);
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'shield',
            x: level.platforms[platformIdx].x + level.platforms[platformIdx].width / 2,
            y: level.platforms[platformIdx].y - 80,
            value: 1
        });
    }
    
    // Magnet bonus ogni 7 livelli
    if (i % 7 === 0 && level.platforms.length > 10) {
        const platformIdx = Math.floor(level.platforms.length * 0.5);
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'magnet',
            x: level.platforms[platformIdx].x + level.platforms[platformIdx].width / 2,
            y: level.platforms[platformIdx].y - 80,
            value: 1
        });
    }
    
    // Health bonus ogni 2 livelli - 2 cuoricini per livello
    if (i % 2 === 0 && level.platforms.length > 8) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.2);
        const platformIdx2 = Math.floor(level.platforms.length * 0.6);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI NORMALI (26-60) - Sfide bilanciate
// ============================================
for (let i = 26; i <= 60; i++) {
    const level = createBaseLevel(i, {
        name: `World 2-${i - 25}`,
        difficulty: DifficultyTier.NORMAL,
        theme: 'forest',
        parTime: { threeStars: 16, twoStars: 25, oneStar: 40 }
    });
    
    // Pattern più complessi
    const patterns = [
        PlatformPatterns.ZIGZAG,
        PlatformPatterns.STAIRS_DOWN,
        PlatformPatterns.GAPS,
        PlatformPatterns.NARROW
    ];
    const pattern = patterns[i % patterns.length];
    
    level.platforms = generatePlatformPattern(
        pattern,
        50, 400, 35,
        { spacing: 90, width: 200 }
    );
    
    // Aggiungi indici alle piattaforme
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Nemici intermedi
    const enemyTypes = [
        EnemyTypes.CHOMPER.id,
        EnemyTypes.WASP.id,
        EnemyTypes.HOPPER.id,
        EnemyTypes.CANNON.id
    ];
    
    const enemyCount = Math.min(Math.floor((i - 40) / 4) + 4, 10);
    level.enemies = [];
    for (let e = 0; e < enemyCount; e++) {
        const platformIdx = Math.floor((e + 1) * (level.platforms.length / (enemyCount + 1)));
        if (platformIdx < level.platforms.length) {
            const enemyType = enemyTypes[e % enemyTypes.length];
            const enemy = placeEnemyOnPlatform(level.platforms[platformIdx], enemyType);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Aggiungi ostacoli
    level.obstacles = [];
    if (level.platforms.length > 0) {
        for (let o = 0; o < 5; o++) {
            const platformIdx = Math.floor(Math.random() * level.platforms.length);
            const platform = level.platforms[platformIdx];
            if (platform) {
                level.obstacles.push({
                    type: 'spike',
                    x: platform.x + Math.random() * platform.width,
                    y: platform.y - 20
                });
            }
        }
    }
    
    // Boss ogni 10 livelli
    if (i % 10 === 0 && level.platforms.length > 2) {
        level.objectives.push(LevelObjective.BOSS_FIGHT);
        level.name = `Boss: Forest Guardian`;
        const bossPlatform = level.platforms[level.platforms.length - 2];
        level.enemies = [{
            type: EnemyTypes.GOLEM.id,
            x: bossPlatform.x,
            y: bossPlatform.y - 70
        }];
    }
    
    // Health bonus ogni 2 livelli - 2 cuoricini per livello
    if (i % 2 === 0 && level.platforms.length > 8) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.25);
        const platformIdx2 = Math.floor(level.platforms.length * 0.65);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI DIFFICILI (61-120) - Alta difficoltà
// ============================================
for (let i = 61; i <= 120; i++) {
    const level = createBaseLevel(i, {
        name: `World 3-${i - 60}`,
        difficulty: DifficultyTier.HARD,
        theme: 'volcano',
        parTime: { threeStars: 14, twoStars: 22, oneStar: 35 }
    });
    
    // Pattern difficili
    level.platforms = generatePlatformPattern(
        i % 2 === 0 ? PlatformPatterns.GAPS : PlatformPatterns.NARROW,
        50, 380, 40,
        { spacing: 80, width: 180, platformType: i % 3 === 0 ? 'crumbling' : 'normal' }
    );
    
    // Aggiungi indici alle piattaforme
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Molti nemici avanzati
    const enemyTypes = [
        EnemyTypes.GHOST.id,
        EnemyTypes.BOUNCER.id,
        EnemyTypes.SEEKER.id,
        EnemyTypes.LASER_TURRET.id
    ];
    
    const enemyCount = Math.min(Math.floor((i - 80) / 3) + 6, 15);
    level.enemies = [];
    for (let e = 0; e < enemyCount; e++) {
        const platformIdx = Math.floor((e + 1) * (level.platforms.length / (enemyCount + 1)));
        if (platformIdx < level.platforms.length) {
            const enemyType = enemyTypes[e % enemyTypes.length];
            const enemy = placeEnemyOnPlatform(level.platforms[platformIdx], enemyType);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Obiettivi multipli
    if (i % 5 === 0) {
        level.objectives.push(LevelObjective.HIGH_COMBO);
    }
    
    // Boss ogni 10 livelli
    if (i % 10 === 0 && level.platforms.length > 2) {
        level.objectives = [LevelObjective.BOSS_FIGHT];
        level.name = `Boss: Lava Titan`;
        const bossPlatform = level.platforms[level.platforms.length - 2];
        level.enemies = [{
            type: EnemyTypes.DRAGON.id,
            x: bossPlatform.x,
            y: bossPlatform.y - 80
        }];
    }
    
    // Health bonus ogni 2 livelli - 3 cuoricini per livello (difficoltà alta)
    if (i % 2 === 0 && level.platforms.length > 10) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.2);
        const platformIdx2 = Math.floor(level.platforms.length * 0.5);
        const platformIdx3 = Math.floor(level.platforms.length * 0.8);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx3].x + level.platforms[platformIdx3].width / 2,
            y: level.platforms[platformIdx3].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI ESPERTI (121-170) - Estrema precisione
// ============================================
for (let i = 121; i <= 170; i++) {
    const level = createBaseLevel(i, {
        name: `World 4-${i - 120}`,
        difficulty: DifficultyTier.EXPERT,
        theme: 'space',
        parTime: { threeStars: 12, twoStars: 20, oneStar: 30 }
    });
    
    // Mix di tutti i pattern
    const segment1 = generatePlatformPattern(PlatformPatterns.STAIRS_UP, 50, 500, 10, { spacing: 70 });
    const segment2 = generatePlatformPattern(PlatformPatterns.GAPS, 700, 300, 10, { spacing: 120 });
    const segment3 = generatePlatformPattern(PlatformPatterns.STAIRS_DOWN, 1500, 280, 10, { spacing: 70 });
    level.platforms = [...segment1, ...segment2, ...segment3];
    
    // Aggiungi indici alle piattaforme
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Tutti i tipi di nemici
    const enemyTypes = [
        EnemyTypes.TANK.id,
        EnemyTypes.PHOENIX.id,
        EnemyTypes.TELEPORTER.id,
        EnemyTypes.SPAWNER.id
    ];
    
    level.enemies = [];
    for (let e = 0; e < 12; e++) {
        const platformIdx = e + 1;
        if (platformIdx < level.platforms.length) {
            const enemyType = enemyTypes[e % enemyTypes.length];
            const enemy = placeEnemyOnPlatform(level.platforms[platformIdx], enemyType);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Obiettivi estremi
    level.objectives.push(LevelObjective.TIME_TRIAL);
    if (i % 20 === 0) {
        level.objectives = [LevelObjective.BOSS_FIGHT, LevelObjective.NO_DAMAGE];
    }
    
    // Boss ogni 10 livelli
    if (i % 10 === 0 && level.platforms.length > 2) {
        level.name = `Boss: Shadow Lord`;
        const bossPlatform = level.platforms[level.platforms.length - 2];
        level.enemies = [{
            type: EnemyTypes.SHADOW_LORD.id,
            x: bossPlatform.x,
            y: bossPlatform.y - 90
        }];
    }
    
    // Health bonus ogni 2 livelli - 3 cuoricini per livello (difficoltà estrema)
    if (i % 2 === 0 && level.platforms.length > 10) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.15);
        const platformIdx2 = Math.floor(level.platforms.length * 0.45);
        const platformIdx3 = Math.floor(level.platforms.length * 0.75);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx3].x + level.platforms[platformIdx3].width / 2,
            y: level.platforms[platformIdx3].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

// ============================================
// LIVELLI MASTER (181-200) - Sfide estreme
// ============================================
for (let i = 181; i <= 200; i++) {
    const level = createBaseLevel(i, {
        name: `Master ${i - 180}`,
        difficulty: DifficultyTier.MASTER,
        theme: 'rainbow_final',
        parTime: { threeStars: 10, twoStars: 18, oneStar: 28 }
    });
    
    // Pattern estremi con tutto
    const patterns = [];
    patterns.push(...generatePlatformPattern(PlatformPatterns.NARROW, 50, 450, 4, { spacing: 60, width: 140, platformType: 'crumbling' }));
    patterns.push(...generatePlatformPattern(PlatformPatterns.GAPS, 350, 350, 3, { spacing: 150, width: 120 }));
    patterns.push(...generatePlatformPattern(PlatformPatterns.BOUNCY, 750, 400, 3, { platformType: 'bouncy' }));
    patterns.push(...generatePlatformPattern(PlatformPatterns.ICY, 1050, 300, 4, { platformType: 'icy', width: 160 }));
    level.platforms = patterns;
    
    // Aggiungi indici alle piattaforme
    level.platforms.forEach((p, idx) => p.index = idx);
    
    // Mix di tutti i nemici elite
    const allEnemies = Object.values(EnemyTypes).filter(e => e.unlockLevel <= i);
    level.enemies = [];
    for (let e = 0; e < Math.min(15, level.platforms.length); e++) {
        if (e < level.platforms.length) {
            const randomEnemy = allEnemies[Math.floor(Math.random() * allEnemies.length)];
            const enemy = placeEnemyOnPlatform(level.platforms[e], randomEnemy.id);
            if (enemy) level.enemies.push(enemy);
        }
    }
    
    // Obiettivi master
    level.objectives = [
        LevelObjective.REACH_END,
        LevelObjective.KILL_ALL,
        LevelObjective.NO_DAMAGE
    ];
    
    // BOSS FINALE - Livello 200
    if (i === 200 && level.platforms.length > 0) {
        level.name = 'FINAL BOSS: Rainbow King';
        level.objectives = [LevelObjective.BOSS_FIGHT];
        const bossPlatform = level.platforms[level.platforms.length - 1];
        level.enemies = [{
            type: EnemyTypes.RAINBOW_KING.id,
            x: bossPlatform.x,
            y: bossPlatform.y - 100
        }];
        level.parTime = { threeStars: 30, twoStars: 45, oneStar: 60 };
    }
    
    // Health bonus ogni 2 livelli - 3 cuoricini per livello (difficoltà master)
    if (i % 2 === 0 && level.platforms.length > 8) {
        const platformIdx1 = Math.floor(level.platforms.length * 0.2);
        const platformIdx2 = Math.floor(level.platforms.length * 0.5);
        const platformIdx3 = Math.floor(level.platforms.length * 0.8);
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx1].x + level.platforms[platformIdx1].width / 2,
            y: level.platforms[platformIdx1].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx2].x + level.platforms[platformIdx2].width / 2,
            y: level.platforms[platformIdx2].y - 80,
            value: 1
        });
        
        level.collectibles.push({
            type: 'bonus',
            bonusType: 'health',
            x: level.platforms[platformIdx3].x + level.platforms[platformIdx3].width / 2,
            y: level.platforms[platformIdx3].y - 80,
            value: 1
        });
    }
    
    Levels.push(level);
}

/**
 * Get level by ID
 */
export function getLevel(levelId) {
    return Levels.find(l => l.id === levelId) || null;
}

/**
 * Get levels by difficulty
 */
export function getLevelsByDifficulty(difficulty) {
    return Levels.filter(l => l.difficulty === difficulty);
}

/**
 * Get total level count
 */
export function getTotalLevels() {
    return Levels.length;
}
