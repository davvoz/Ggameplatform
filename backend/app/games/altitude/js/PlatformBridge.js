/**
 * PlatformBridge - SDK integration layer
 * Handles communication with the game platform for leaderboards, sessions, etc.
 */

export class PlatformBridge {
    #sdk = null;
    #sessionActive = false;
    #sessionId = null;
    #lastScoreSubmit = 0;
    #pendingSubmit = null;
    #initialized = false;

    constructor() {
        // Get SDK reference
        this.#sdk = globalThis.PlatformSDK || null;
    }

    /**
     * Initialize the platform bridge
     * @returns {Promise<boolean>}
     */
    async initialize() {
        return this.init();
    }

    async init() {
        if (this.#initialized) return true;

        if (!this.#sdk) {
            console.warn('[PlatformBridge] SDK not loaded, running in standalone mode');
            this.#initialized = true;
            return false;
        }

        try {
            // Wait for SDK ready
            if (typeof this.#sdk.waitForReady === 'function') {
                await this.#sdk.waitForReady();
            }
            
            this.#initialized = true;
            console.log('[PlatformBridge] SDK initialized');
            return true;
        } catch (error) {
            console.error('[PlatformBridge] SDK init error:', error);
            this.#initialized = true;
            return false;
        }
    }

    /**
     * Check if SDK is available
     * @returns {boolean}
     */
    get isConnected() {
        return this.#sdk !== null && this.#initialized;
    }

    /**
     * Alias for startSession for compatibility
     */
    async sendGameStarted() {
        return this.startSession();
    }

    /**
     * Alias for endSession with score for compatibility
     */
    async gameOver(score, stats = {}) {
        return this.endSession({ ...stats, score });
    }

    /**
     * Start a game session
     * @returns {Promise<string|null>} Session ID or null
     */
    async startSession() {
        if (!this.#sdk) {
            this.#sessionActive = true;
            this.#sessionId = `local_${Date.now()}`;
            return this.#sessionId;
        }

        try {
            // resetSession() is the SDK method that signals a new game run to the platform
            if (typeof this.#sdk.resetSession === 'function') {
                await this.#sdk.resetSession();
            }
            this.#sessionActive = true;
            this.#sessionId = `sdk_${Date.now()}`;
            return this.#sessionId;
        } catch (error) {
            console.error('[PlatformBridge] Start session error:', error);
        }

        this.#sessionActive = true;
        return null;
    }

    /**
     * End the current game session
     * @param {Object} stats - Final game stats
     * @returns {Promise<boolean>}
     */
    async endSession(stats = {}) {
        try {
            if (this.#sdk && typeof this.#sdk.gameOver === 'function') {
                const score = Math.floor(stats.score ?? 0);
                const extra_data = {
                    distance:         Math.floor(stats.altitude          ?? 0),
                    coins_collected:  Math.floor(stats.coins             ?? 0),
                    enemies_defeated: Math.floor(stats.enemiesDefeated   ?? 0),
                    levels_completed: Math.floor(stats.levelsCompleted   ?? 0),
                };
                this.#sdk.gameOver(score, { extra_data });
            }
        } catch (error) {
            console.error('[PlatformBridge] End session error:', error);
        }

        this.#sessionActive = false;
        this.#sessionId = null;
        return true;
    }

    /**
     * Submit score to leaderboard
     * @param {number} score - The score to submit
     * @param {boolean} force - Force immediate submit
     * @returns {Promise<boolean>}
     */
    async submitScore(score, force = false) {
        // Debounce score submissions
        const now = Date.now();
        if (!force && now - this.#lastScoreSubmit < 1000) {
            this.#pendingSubmit = score;
            return false;
        }

        this.#lastScoreSubmit = now;
        this.#pendingSubmit = null;

        if (!this.#sdk) {
            return false;
        }

        try {
            if (typeof this.#sdk.sendScore === 'function') {
                this.#sdk.sendScore(Math.floor(score));
                return true;
            }
        } catch (error) {
            console.error('[PlatformBridge] Submit score error:', error);
        }

        return false;
    }

    /**
     * Notify platform that a level was completed
     * @param {number} level - 1-based level number
     */
    levelCompleted(level) {
        if (!this.#sdk) return;
        try {
            if (typeof this.#sdk.levelCompleted === 'function') {
                this.#sdk.levelCompleted(level);
                console.log('[PlatformBridge] Level completed:', level);
            }
        } catch (error) {
            console.error('[PlatformBridge] Level completed error:', error);
        }
    }

    /**
     * Report game event for quests/achievements
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {Promise<boolean>}
     */
    async reportEvent(eventType, data = {}) {
        if (!this.#sdk) {
            return false;
        }

        try {
            if (typeof this.#sdk.reportEvent === 'function') {
                await this.#sdk.reportEvent(eventType, {
                    sessionId: this.#sessionId,
                    timestamp: Date.now(),
                    ...data
                });
                return true;
            }
        } catch (error) {
            console.error('[PlatformBridge] Report event error:', error);
        }

        return false;
    }

    /**
     * Get leaderboard data
     * @param {string} type - 'daily', 'weekly', or 'allTime'
     * @param {number} limit - Max entries to fetch
     * @returns {Promise<Array>}
     */
    async getLeaderboard(type = 'allTime', limit = 10) {
        if (!this.#sdk) {
            return [];
        }

        try {
            if (typeof this.#sdk.getLeaderboard === 'function') {
                const data = await this.#sdk.getLeaderboard(type, limit);
                return data || [];
            }
        } catch (error) {
            console.error('[PlatformBridge] Get leaderboard error:', error);
        }

        return [];
    }

    /**
     * Get player's rank
     * @returns {Promise<Object|null>}
     */
    async getPlayerRank() {
        if (!this.#sdk) {
            return null;
        }

        try {
            if (typeof this.#sdk.getPlayerRank === 'function') {
                return await this.#sdk.getPlayerRank();
            }
        } catch (error) {
            console.error('[PlatformBridge] Get rank error:', error);
        }

        return null;
    }

    /**
     * Get player info
     * @returns {Object}
     */
    getPlayerInfo() {
        if (!this.#sdk || typeof this.#sdk.getPlayerInfo !== 'function') {
            return {
                username: 'Player',
                avatar: null,
                id: null
            };
        }

        try {
            return this.#sdk.getPlayerInfo() || {
                username: 'Player',
                avatar: null,
                id: null
            };
        } catch {
            return {
                username: 'Player',
                avatar: null,
                id: null
            };
        }
    }

    /**
     * Check if session is active
     * @returns {boolean}
     */
    get sessionActive() {
        return this.#sessionActive;
    }

    /**
     * Flush any pending operations
     * @returns {Promise<void>}
     */
    async flush() {
        if (this.#pendingSubmit !== null) {
            await this.submitScore(this.#pendingSubmit, true);
        }
    }
}
