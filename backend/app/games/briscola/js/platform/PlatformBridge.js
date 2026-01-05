/**
 * Platform Bridge
 * 
 * Integrates with the game platform SDK for score tracking,
 * user info, and session management
 */

export class PlatformBridge {
    constructor() {
        this.sdk = null;
        this.isAvailable = false;
        this.config = null;
        this.userId = null;
        this.username = null;
    }
    
    /**
     * Initialize platform SDK
     */
    async init() {
        // Check if PlatformSDK is available
        if (typeof PlatformSDK !== 'undefined') {
            try {
                this.sdk = PlatformSDK;
                
                await this.sdk.init({
                    onPause: () => this.handlePause(),
                    onResume: () => this.handleResume(),
                    onExit: () => this.handleExit()
                });
                
                this.isAvailable = true;
                
                // Wait for config
                await this.waitForConfig();
                
                console.log('[PlatformBridge] SDK initialized');
                
            } catch (error) {
                console.warn('[PlatformBridge] SDK init failed:', error);
                this.isAvailable = false;
            }
        } else {
            console.log('[PlatformBridge] SDK not available, running standalone');
            this.isAvailable = false;
        }
    }
    
    /**
     * Wait for platform config
     */
    async waitForConfig() {
        const maxWait = 3000;
        const startTime = Date.now();
        
        while (!window.platformConfig && (Date.now() - startTime < maxWait)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (window.platformConfig) {
            this.config = window.platformConfig;
            this.userId = this.config.userId;
            this.username = this.config.username;
            console.log('[PlatformBridge] Got config:', this.config);
        }
    }
    
    /**
     * Get username
     */
    getUsername() {
        return this.username || null;
    }
    
    /**
     * Get user ID
     */
    getUserId() {
        return this.userId || null;
    }
    
    /**
     * Report game start
     */
    reportGameStart() {
        if (!this.isAvailable) return;
        
        // Platform SDK handles session start via ready event
        console.log('[PlatformBridge] Game started');
    }
    
    /**
     * Report score update
     */
    reportScore(score) {
        if (!this.isAvailable) return;
        
        try {
            this.sdk.sendScore(score);
        } catch (error) {
            console.error('[PlatformBridge] Failed to send score:', error);
        }
    }
    
    /**
     * Report game over
     */
    reportGameOver(score, extraData = {}) {
        if (!this.isAvailable) return;
        
        try {
            this.sdk.gameOver(score, {
                extra_data: extraData
            });
            console.log('[PlatformBridge] Game over reported:', score, extraData);
        } catch (error) {
            console.error('[PlatformBridge] Failed to report game over:', error);
        }
    }
    
    /**
     * Report pause
     */
    reportPause() {
        console.log('[PlatformBridge] Game paused');
    }
    
    /**
     * Report resume
     */
    reportResume() {
        console.log('[PlatformBridge] Game resumed');
    }
    
    /**
     * Handle platform pause event
     */
    handlePause() {
        // Dispatch custom event for game to handle
        window.dispatchEvent(new CustomEvent('platform:pause'));
    }
    
    /**
     * Handle platform resume event
     */
    handleResume() {
        window.dispatchEvent(new CustomEvent('platform:resume'));
    }
    
    /**
     * Handle platform exit event
     */
    handleExit() {
        window.dispatchEvent(new CustomEvent('platform:exit'));
    }
    
    /**
     * Request fullscreen
     */
    requestFullscreen() {
        if (!this.isAvailable) {
            // Fallback to native API
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
            return;
        }
        
        try {
            this.sdk.requestFullscreen();
        } catch (error) {
            console.error('[PlatformBridge] Fullscreen request failed:', error);
        }
    }
}
