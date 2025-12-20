/**
 * Tower Sprite Library
 * Professional vector-based tower/cannon designs
 * Each tower type has unique mechanical design and firing animations
 */

// ============================================================================
// TOWER SPRITE DEFINITIONS
// ============================================================================

const TowerSpriteLibrary = {

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

// Export to global scope
window.TowerSpriteLibrary = TowerSpriteLibrary;
