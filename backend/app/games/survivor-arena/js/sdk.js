/**
 * Survivor Arena Platform SDK
 * Handles communication with the game platform (RuntimeShell)
 * 
 * @version 1.0.0
 */

const PROTOCOL_VERSION = '1.0.0';

class SurvivorArenaSDK {
    constructor() {
        this.userId = null;
        this.username = null;
        this.platformReady = false;
        this.gameStartSent = false;
        
        // Listen for platform config
        this.setupPlatformListener();
    }
    
    /**
     * Setup listener for platform messages
     */
    setupPlatformListener() {
        window.addEventListener('message', (event) => {
            // Only accept config messages
            if (event.data && event.data.type === 'config') {
                const payload = event.data.payload;
                console.log('[SDK] 📥 Received config from platform:', payload);
                
                if (payload.userId) {
                    this.userId = payload.userId;
                    console.log('[SDK] userId:', this.userId);
                }
                if (payload.username) {
                    this.username = payload.username;
                    console.log('[SDK] username:', this.username);
                }
                
                this.platformReady = true;
            }
        });
    }
    
    /**
     * Send ready signal to platform
     */
    sendReady() {
        this.postMessage('ready', {
            game: 'survivor-arena',
            version: '1.0.0'
        });
        console.log('[SDK] Ready signal sent');
    }
    
    /**
     * Send game started notification
     */
    sendGameStarted() {
        if (this.gameStartSent) return;
        
        this.postMessage('gameStarted', {
            game: 'survivor-arena'
        });
        
        this.gameStartSent = true;
        console.log('[SDK] Game started notification sent');
    }
    
    /**
     * Send score update
     * @param {number} score 
     */
    sendScoreUpdate(score) {
        this.postMessage('scoreUpdate', {
            score: score
        });
    }
    
    /**
     * Send game over with final stats
     * @param {Object} stats - Game statistics
     */
    sendGameOver(stats) {
        // Send only essential data, similar to blocky-road pattern
        const payload = {
            score: stats.score,
            extra_data: {
                kills: stats.kills,
                time: Math.floor(stats.time),
                level: stats.level
            }
        };
        
        this.postMessage('gameOver', payload);
        this.gameStartSent = false;
        console.log('[SDK] Game over sent, score:', stats.score);
    }
    
    /**
     * Send message to platform with proper protocol
     * @param {string} type - Message type
     * @param {Object} payload - Message payload
     */
    postMessage(type, payload) {
        if (window.parent === window) {
            console.log('[SDK] Not in iframe, skipping message:', type);
            return;
        }
        
        const message = {
            type: type,
            payload: payload,
            protocolVersion: PROTOCOL_VERSION
        };
        
        try {
            window.parent.postMessage(message, '*');
            console.log('[SDK] Sent message:', type, payload);
        } catch (error) {
            console.error('[SDK] Failed to send message:', error);
        }
    }
}

// Create global instance
window.SurvivorArenaSDK = new SurvivorArenaSDK();

// Auto-send ready signal when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SurvivorArenaSDK.sendReady();
    });
} else {
    window.SurvivorArenaSDK.sendReady();
}
