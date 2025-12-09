/**
 * PlatformSDKManager - Manages integration with the game platform SDK
 * Follows Adapter Pattern and Dependency Inversion
 * Uses the global PlatformSDK instance loaded by the platform
 */
export class PlatformSDKManager {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        try {
            // Use the global PlatformSDK instance
            if (typeof window.PlatformSDK !== 'undefined') {
                // Initialize if needed
                await window.PlatformSDK.init();
                this.initialized = true;
                console.log('Platform SDK initialized');
            } else {
                console.warn('PlatformSDK not available - running in standalone mode');
            }
        } catch (error) {
            console.error('Failed to initialize Platform SDK:', error);
            this.initialized = false;
        }
    }

    async submitScore(score) {
        if (!this.initialized || typeof window.PlatformSDK === 'undefined') {
            console.warn('SDK not initialized, score not submitted');
            return null;
        }

        try {
            window.PlatformSDK.sendScore(score);
            console.log('Score submitted:', score);
            return { success: true, score };
        } catch (error) {
            console.error('Failed to submit score:', error);
            return null;
        }
    }

    async gameOver(score, details) {
        console.log('🎯 [PlatformSDKManager] gameOver called with score:', score, 'details:', details);
        
        if (!this.initialized || typeof window.PlatformSDK === 'undefined') {
            console.warn('SDK not initialized, game over not reported');
            return;
        }
        try {
            console.log('📡 [PlatformSDKManager] Calling window.PlatformSDK.gameOver with score:', score);
            window.PlatformSDK.gameOver(score, details);
            console.log('✅ [PlatformSDKManager] Game over reported:', score, details);
        } catch (error) {
            console.error('❌ [PlatformSDKManager] Failed to report game over:', error);
        }
    }

    async gameStarted() {
        if (!this.initialized || typeof window.PlatformSDK === 'undefined') {
            console.warn('SDK not initialized, game started not reported');
            return;
        }
        try {
            // Send message directly to parent window (platform)
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0'
            }, '*');
            console.log('🎮 Game started event sent to platform');
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
        if (!this.initialized || typeof window.PlatformSDK === 'undefined') {
            return;
        }

        try {
            console.log('Event tracked:', eventName, eventData);
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }
}
