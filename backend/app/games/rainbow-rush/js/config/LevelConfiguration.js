/**
 * LevelConfiguration - Definizione predefinita di tutti i 200 livelli
 * Refactored per essere OOP, SOLID-compliant e configurabile
 * Usa LevelGenerator per generazione procedurale basata su config
 */

import { LevelGenerator } from './LevelGenerator.js';

/**
 * GENERAZIONE LIVELLI 1-200
 * Usa il nuovo sistema OOP con LevelGenerator
 * FORCE RELOAD: v2024-11-23-01
 */
export const Levels = LevelGenerator.generateAllLevels();

// Esporta anche i tipi e pattern per compatibilità con codice esistente
export { PlatformPatterns } from './LevelGeneratorConfig.js';

/**
 * Difficulty tiers for levels (legacy export per compatibilità)
 */
export const DifficultyTier = {
    TUTORIAL: 'tutorial',
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard',
    EXPERT: 'expert',
    MASTER: 'master'
};

/**
 * Level objectives (legacy export per compatibilità)
 */
export const LevelObjective = {
    REACH_END: 'reach_end',
    COLLECT_ALL: 'collect_all_coins',
    KILL_ALL: 'kill_all_enemies',
    TIME_TRIAL: 'time_trial',
    NO_DAMAGE: 'no_damage',
    HIGH_COMBO: 'high_combo',
    BOSS_FIGHT: 'boss_fight'
};

/**
 * Get level by ID
 */
export function getLevel(levelId) {
    return Levels.find(l => l.id === levelId) || null;
}

/**
 * Get total level count
 */
export function getTotalLevels() {
    return Levels.length;
}
