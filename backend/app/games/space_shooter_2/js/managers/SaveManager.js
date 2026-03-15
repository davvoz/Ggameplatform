/**
 * SaveManager — Handles game checkpoint save/load via PlatformSDK + localStorage fallback.
 *
 * Saves happen automatically after each level completion (before perk selection).
 * The player can resume from the start screen via the CONTINUE button.
 */

const SAVE_VERSION = 1;
const LS_KEY = 'spaceShooter2_save';

class SaveManager {
    constructor(game) {
        this.game = game;
        /** Cached save metadata (loaded once at startup) */
        this._cachedSave = null;
    }

    // ─── Serialize current game state ──────────────────────────────────

    /**
     * Build a serializable snapshot of the game.
     * @param {boolean} levelCompleted - true when saving after level completion (saves next level)
     */
    _buildSaveData(levelCompleted = false) {
        const g = this.game;
        const player = g.entityManager.player;

        return {
            v: SAVE_VERSION,
            ts: Date.now(),
            level: levelCompleted ? g.levelManager.currentLevel + 1 : g.levelManager.currentLevel,
            score: g.scoreManager.score,
            totalPoints: g.scoreManager.totalPoints,
            totalEnemiesKilled: g.scoreManager.totalEnemiesKilled,
            shipId: g.selectedShipId,
            ultimateId: g.selectedUltimateId,
            difficultyId: g.difficulty?.id || 'boring',
            gameTime: g.gameTime,
            hasContinued: g.hasContinued,
            // Player
            bonusStats: player ? { ...player.bonusStats } : { hp: 0, speed: 0, resist: 0, fireRate: 0 },
            weaponLevel: player ? player.weaponLevel : 1,
            // Perks (Map → plain object)
            perks: this._serializePerks(),
        };
    }

    _serializePerks() {
        const map = this.game.perkSystem.activePerks;
        const out = {};
        for (const [id, stacks] of map) {
            out[id] = stacks;
        }
        return out;
    }

    // ─── Save ──────────────────────────────────────────────────────────

    /**
     * Persist the current game state.
     * @param {boolean} levelCompleted - true when called after level completion
     */
    async save(levelCompleted = false) {
        const data = this._buildSaveData(levelCompleted);
        this._cachedSave = data;

        // localStorage (instant, always works)
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(data));
        } catch (_) { /* quota exceeded – ignore */ }

        // PlatformSDK (async, may fail)
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.saveProgress) {
            try {
                // Merge with existing progress (keeps worlds_unlocked etc.)
                const existing = await PlatformSDK.loadProgress().catch(() => ({})) || {};
                await PlatformSDK.saveProgress({ ...existing, save_data: data });
            } catch (e) {
                console.warn('[SaveManager] SDK save failed:', e);
            }
        }

        this._showSaveIndicator();
    }

    // ─── Load ──────────────────────────────────────────────────────────

    /**
     * Fetch the most recent save (SDK preferred, localStorage fallback).
     * Returns null if no save exists.
     */
    async loadRaw() {
        let sdkData = null;
        let lsData = null;

        // Try PlatformSDK
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.loadProgress) {
            try {
                const progress = await PlatformSDK.loadProgress();
                if (progress?.save_data?.v === SAVE_VERSION) {
                    sdkData = progress.save_data;
                }
            } catch (_) { /* ignore */ }
        }

        // Try localStorage
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.v === SAVE_VERSION) lsData = parsed;
            }
        } catch (_) { /* corrupt – ignore */ }

        // Pick the most recent
        if (sdkData && lsData) {
            this._cachedSave = (sdkData.ts >= lsData.ts) ? sdkData : lsData;
        } else {
            this._cachedSave = sdkData || lsData || null;
        }
        return this._cachedSave;
    }

    /** Returns cached save data (call loadRaw() first at startup). */
    getCachedSave() {
        return this._cachedSave;
    }

    // ─── Delete ────────────────────────────────────────────────────────

    async deleteSave() {
        this._cachedSave = null;
        try { localStorage.removeItem(LS_KEY); } catch (_) {}

        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.saveProgress) {
            try {
                const existing = await PlatformSDK.loadProgress().catch(() => ({})) || {};
                delete existing.save_data;
                await PlatformSDK.saveProgress(existing);
            } catch (_) {}
        }
    }

    // ─── Visual feedback ───────────────────────────────────────────────

    _showSaveIndicator() {
        let el = document.getElementById('save-indicator');
        if (!el) {
            el = document.createElement('div');
            el.id = 'save-indicator';
            el.textContent = '💾 SAVED';
            document.getElementById('game-container')?.appendChild(el);
        }
        el.classList.remove('hidden', 'fade-out');
        el.classList.add('show');
        clearTimeout(this._saveIndicatorTimer);
        this._saveIndicatorTimer = setTimeout(() => {
            el.classList.add('fade-out');
            setTimeout(() => el.classList.remove('show', 'fade-out'), 400);
        }, 1500);
    }
}

export default SaveManager;
