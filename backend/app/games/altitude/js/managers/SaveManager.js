/**
 * SaveManager - Game progress persistence via PlatformSDK (DB).
 * Single Responsibility: Handle save/load operations.
 */

import { UPGRADE_CATALOG } from '../config/Constants.js';

export class SaveManager {
    #data = null;

    constructor() {
        // Data starts as defaults; call init() async before using
        this.#data = this.#getDefaultData();
    }

    /**
     * Load saved data from PlatformSDK (DB). Call once at startup.
     */
    async init() {
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.loadProgress) {
            try {
                const progress = await PlatformSDK.loadProgress();
                if (progress?.save_data) {
                    this.#data = { ...this.#getDefaultData(), ...progress.save_data };
                }
            } catch (e) {
                console.warn('[SaveManager] Failed to load from SDK:', e);
            }
        }
    }

    /**
     * Persist current data to PlatformSDK (DB).
     */
    async save() {
        this.#data.lastSaved = Date.now();
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.saveProgress) {
            try {
                // Merge into existing progress record (preserves other fields like worlds_unlocked)
                const existing = await PlatformSDK.loadProgress().catch(() => ({})) || {};
                await PlatformSDK.saveProgress({ ...existing, save_data: this.#data });
            } catch (e) {
                console.warn('[SaveManager] Failed to save to SDK:', e);
            }
        }
    }

    #getDefaultData() {
        return {
            version: 1,
            totalCoins: 0,
            highScore: 0,
            maxAltitude: 0,
            gamesPlayed: 0,
            totalEnemiesDefeated: 0,
            totalCoinsCollected: 0,
            infiniteUnlocked: true,
            unlockedLevels: [0],
            upgrades: {},
            prestigeCount: 0,
            prestigeBonuses: [],   // array of 'lives' | 'coins' | 'altitude'
            settings: {
                soundEnabled: true,
            },
            lastSaved: Date.now(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // COINS
    // ═══════════════════════════════════════════════════════════════

    get totalCoins() {
        return this.#data.totalCoins;
    }

    getCoins() {
        return this.#data.totalCoins;
    }

    addCoins(amount) {
        this.#data.totalCoins += amount;
        this.save(); // fire-and-forget async
    }

    spendCoins(amount) {
        if (this.#data.totalCoins >= amount) {
            this.#data.totalCoins -= amount;
            this.save(); // fire-and-forget async
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════════

    get highScore() {
        return this.#data.highScore;
    }

    getHighScore() {
        return this.#data.highScore;
    }

    get maxAltitude() {
        return this.#data.maxAltitude;
    }

    get gamesPlayed() {
        return this.#data.gamesPlayed;
    }

    updateStats(score, altitude, enemiesDefeated, coinsCollected) {
        this.#data.gamesPlayed++;
        this.#data.totalEnemiesDefeated += enemiesDefeated;
        this.#data.totalCoinsCollected += coinsCollected;

        let newRecord = false;
        if (score > this.#data.highScore) {
            this.#data.highScore = score;
            newRecord = true;
        }
        if (altitude > this.#data.maxAltitude) {
            this.#data.maxAltitude = altitude;
            newRecord = true;
        }

        this.save(); // fire-and-forget async
        return newRecord;
    }

    // ═══════════════════════════════════════════════════════════════
    // UPGRADES
    // ═══════════════════════════════════════════════════════════════

    getUpgradeLevel(upgradeId) {
        return this.#data.upgrades[upgradeId] || 0;
    }

    setUpgradeLevel(upgradeId, level) {
        this.#data.upgrades[upgradeId] = level;
        this.save(); // fire-and-forget async
    }

    upgradeLevel(upgradeId) {
        const currentLevel = this.getUpgradeLevel(upgradeId);
        this.setUpgradeLevel(upgradeId, currentLevel + 1);
    }

    getUpgradeCost(upgradeId) {
        const upgrade = UPGRADE_CATALOG[upgradeId];
        if (!upgrade) return Infinity;

        const currentLevel = this.getUpgradeLevel(upgradeId);
        if (currentLevel >= upgrade.maxLevel) return Infinity;

        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, currentLevel));
    }

    canPurchaseUpgrade(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        return this.#data.totalCoins >= cost;
    }

    purchaseUpgrade(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        const upgrade = UPGRADE_CATALOG[upgradeId];
        
        if (!upgrade) return false;
        
        const currentLevel = this.getUpgradeLevel(upgradeId);
        if (currentLevel >= upgrade.maxLevel) return false;
        
        if (this.spendCoins(cost)) {
            this.setUpgradeLevel(upgradeId, currentLevel + 1);
            return true;
        }
        return false;
    }

    /**
     * Get the total effect value for an upgrade
     */
    getUpgradeEffect(upgradeId) {
        const upgrade = UPGRADE_CATALOG[upgradeId];
        if (!upgrade) return 0;
        
        const level = this.getUpgradeLevel(upgradeId);
        return upgrade.effectPerLevel * level;
    }

    /**
     * Check if an upgrade is unlocked (level > 0)
     */
    hasUpgrade(upgradeId) {
        return this.getUpgradeLevel(upgradeId) > 0;
    }

    /**
     * Get all owned upgrades
     */
    getOwnedUpgrades() {
        return { ...this.#data.upgrades };
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    get soundEnabled() {
        return this.#data.settings.soundEnabled;
    }

    set soundEnabled(value) {
        this.#data.settings.soundEnabled = value;
        this.save(); // fire-and-forget async
    }

    // ═══════════════════════════════════════════════════════════════
    // INFINITE MODE
    // ═══════════════════════════════════════════════════════════════

    get infiniteUnlocked() {
        return true;
    }

    set infiniteUnlocked(value) {
        this.#data.infiniteUnlocked = value;
        this.save(); // fire-and-forget async
    }

    // ═══════════════════════════════════════════════════════════════
    // LEVEL UNLOCK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Returns true when the given level index has been unlocked.
     * Level 0 is always unlocked.
     */
    isLevelUnlocked(levelIndex) {
        if (levelIndex === 0) return true;
        const list = this.#data.unlockedLevels ?? [0];
        return list.includes(levelIndex);
    }

    /**
     * Mark a level index as unlocked and persist.
     * Out-of-range or already-unlocked indices are silently ignored.
     */
    unlockLevel(levelIndex) {
        if (!this.#data.unlockedLevels) this.#data.unlockedLevels = [0];
        if (levelIndex > 0 && !this.#data.unlockedLevels.includes(levelIndex)) {
            this.#data.unlockedLevels.push(levelIndex);
            this.save(); // fire-and-forget async
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════════════════════

    resetProgress() {
        const settings = this.#data.settings;
        this.#data = this.#getDefaultData();
        this.#data.settings = settings;
        this.save(); // fire-and-forget async
    }

    // ═══════════════════════════════════════════════════════════════
    // PRESTIGE
    // ═══════════════════════════════════════════════════════════════

    getPrestigeCount() {
        return this.#data.prestigeCount ?? 0;
    }

    getPrestigeBonuses() {
        return [...(this.#data.prestigeBonuses ?? [])];
    }

    /** Returns true when every upgrade in UPGRADE_CATALOG is at max level. */
    isAllUpgradesMaxed() {
        return Object.values(UPGRADE_CATALOG).every(
            u => this.getUpgradeLevel(u.id) >= u.maxLevel
        );
    }

    /**
     * Apply prestige: record bonus, reset all upgrades, increment counter.
     * Coins are kept. Call save() is invoked internally.
     * @param {'lives'|'coins'|'altitude'} bonusId
     */
    applyPrestige(bonusId) {
        if (!this.#data.prestigeCount) this.#data.prestigeCount = 0;
        if (!this.#data.prestigeBonuses) this.#data.prestigeBonuses = [];
        this.#data.prestigeCount++;
        this.#data.prestigeBonuses.push(bonusId);
        this.#data.upgrades = {};
        this.#data.unlockedLevels = [0];
        this.save(); // fire-and-forget async
    }

    /**
     * Altitude score multiplier from prestige (1.0 base + 0.5 per altitude prestige).
     */
    getPrestigeAltMultiplier() {
        const bonuses = this.#data.prestigeBonuses ?? [];
        return 1 + bonuses.filter(b => b === 'altitude').length * 0.5;
    }

    /**
     * Get computed player stats based on upgrades
     */
    getPlayerStats() {
        const bonuses = this.#data.prestigeBonuses ?? [];
        const prestigeLives      = bonuses.filter(b => b === 'lives').length * 2;
        const prestigeCoinBonus  = bonuses.filter(b => b === 'coins').length * 0.5;
        return {
            jumpMultiplier: 1 + this.getUpgradeEffect('jump_power'),
            ghostRepelLevel: this.getUpgradeLevel('ghost_repel'),
            hasDoubleJump: this.hasUpgrade('double_jump'),
            hasGlide: this.hasUpgrade('glide'),
            dashCount: this.getUpgradeLevel('dash'),
            stompMultiplier: 1 + this.getUpgradeEffect('stomp_power'),
            hasShockwave: this.hasUpgrade('shockwave'),
            knockbackResist: this.getUpgradeEffect('thick_skin'),
            extraLives: this.getUpgradeLevel('extra_life') + prestigeLives,
            magnetRange: this.getUpgradeEffect('coin_magnet_range'),
            coinMultiplier: 1 + this.getUpgradeEffect('coin_value') + prestigeCoinBonus,
            powerupDuration: 1 + this.getUpgradeEffect('powerup_duration'),
            luckySpawn: this.getUpgradeEffect('lucky_spawn'),
            scoreMultiplier: 1 + this.getUpgradeEffect('score_multiplier'),
            comboKeeper: 1 + this.getUpgradeEffect('combo_keeper'),
            spikeCount: this.getUpgradeLevel('spike_head'),
        };
    }
}
