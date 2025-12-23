/**
 * Tower Sprite Library
 * Professional vector-based tower/cannon designs
 * Each tower type has unique mechanical design and firing animations
 */

// ============================================================================
// TOWER SPRITE DEFINITIONS
// ============================================================================

import { BasicTowerSprite } from './sprites/towers/basic.js';
import { RapidTowerSprite } from './sprites/towers/rapid.js';
import { SniperTowerSprite } from './sprites/towers/sniper.js';
import { SplashTowerSprite } from './sprites/towers/splash.js';
import { FreezeTowerSprite } from './sprites/towers/freeze.js';
import { LaserTowerSprite } from './sprites/towers/laser.js';
import { ElectricTowerSprite } from './sprites/towers/electric.js';

export const TowerSpriteLibrary = {

    // ========== BASIC - Standard ballistic turret ==========
    BASIC: BasicTowerSprite,

    // ========== RAPID - High-speed rotary cannon ==========
    RAPID: RapidTowerSprite,

    // ========== SNIPER - Precision long-range rifle ==========
    SNIPER: SniperTowerSprite,
    // ========== SPLASH - Area damage mortar launcher ==========
    SPLASH: SplashTowerSprite,

    // ========== FREEZE - Cryo emitter slowing system ==========
    FREEZE: FreezeTowerSprite,

    // ========== LASER - Focused energy beam weapon ==========
    LASER: LaserTowerSprite,

    // ========== ELECTRIC - Tesla coil chain lightning system ==========
    ELECTRIC: ElectricTowerSprite
};


