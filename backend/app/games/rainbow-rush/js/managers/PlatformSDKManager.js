/**
 * PlatformSDKManager - Manages integration with the game platform SDK
 * Follows Adapter Pattern and Dependency Inversion
 * Uses the global PlatformSDK instance loaded by the platform
 */
export class PlatformSDKManager {
    initialized = false;

    constructor() {
        this.parentOrigin = this._getParentOrigin();
    }

    _getParentOrigin() {
        try {
            if (document.referrer) {
                const url = new URL(document.referrer);
                return url.origin;
            }
        } catch (e) {
            console.warn('[PlatformSDKManager] Could not determine parent origin:', e);
        }
        return null;
    }

    async initialize() {
        try {
            // Use the global PlatformSDK instance
            if (globalThis.PlatformSDK !== 'undefined') {
                // Initialize if needed
                await globalThis.PlatformSDK.init();
                this.initialized = true;
            }
        } catch (error) {
            console.error('Failed to initialize Platform SDK:', error);
            this.initialized = false;
        }
    }

    async submitScore(score) {
        try {
            if (globalThis.PlatformSDK === 'undefined') {
                return { success: false, score: null };
            } else {
                globalThis.PlatformSDK.sendScore(score);
                return { success: true, score };
            }
        } catch (error) {
            console.error('Failed to submit score:', error);
            return { success: false, score: null };
        }
    }

    async gameOver(score, details) {


        try {
            // Primary: Use PlatformSDK if available
            if ( globalThis.PlatformSDK !== 'undefined') {
                globalThis.PlatformSDK.gameOver(score, details);
            } 

            // ALWAYS send postMessage as backup (critical for mobile)
            if (globalThis.parent?.postMessage && typeof globalThis.parent.postMessage === 'function' && this.parentOrigin) {
                globalThis.parent.postMessage({
                    type: 'gameOver',
                    payload: {
                        score: score,
                        extra_data: details
                    },
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, this.parentOrigin);

            }
        } catch (error) {
            console.error('❌ [PlatformSDKManager] Failed to report game over:', error);
        }
    }

    async gameStarted() {
        try {
            // Send message directly to parent window (platform)
            // Always send this message even if SDK didn't initialize properly
            if (globalThis.parent?.postMessage && typeof globalThis.parent.postMessage === 'function' && this.parentOrigin) {
                globalThis.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, this.parentOrigin);

            } 
        } catch (error) {
            console.error('Failed to report game started:', error);
        }
    }

    async getLeaderboard(limit = 10) {
        // The platform handles leaderboard display
        // This is just a placeholder for compatibility
        return [];
    }

    async getUserStats() {
        // User stats are managed by the platform
        return null;
    }

    getUser() {
        // User data is managed by the platform
        return null;
    }

    isAuthenticated() {
        return this.initialized;
    }

    async trackEvent(eventName, eventData) {
        if (!this.initialized ||  globalThis.PlatformSDK === 'undefined') {
            return;
        }
    }
}
