/**
 * Rainbow Rush SDK
 * Secure client-side SDK for Rainbow Rush game
 * Handles all backend communication with anti-cheat measures
 * 
 * @version 1.0.0
 * @author Rainbow Rush Team
 */

export class RainbowRushSDK {
    /**
     * Initialize the SDK
     * @param {Object} config - Configuration options
     * @param {string} config.apiBaseUrl - Base URL for API (default: current origin)
     * @param {string} config.userId - User ID
     */
    constructor(config = {}) {
        this.apiBaseUrl = config.apiBaseUrl || window.location.origin;
        this.userId = config.userId || null;
        this.username = config.username || null;
        this.platformUserId = null; // For comparison with game userId
        this.sessionId = null;
        this.sessionStartTime = null;
        this.heartbeatInterval = null;
        this.initialized = false;
        
        // Event listeners
        this.listeners = new Map();
        
        // Anti-cheat: Track client-side state
        this.clientState = {
            sessionEvents: [],
            lastHeartbeat: null,
            anomalyCount: 0
        };
        
        // Listen for config messages from parent (runtimeShell)
        this.setupPlatformListener();
    }
    
    /**
     * Setup listener for platform messages (from parent window)
     * @private
     */
    setupPlatformListener() {
        window.addEventListener('message', (event) => {
            // Only accept config messages
            if (event.data && event.data.type === 'config') {
                const payload = event.data.payload;
                console.log('[RainbowRushSDK] 📥 Received config from platform:', payload);
                
                // Store platform user data - THIS IS THE ONLY SOURCE OF TRUTH
                if (payload.userId) {
                    this.userId = payload.userId; // Set userId from parent
                    this.platformUserId = payload.userId;
                    console.log('[RainbowRushSDK] 📥 userId set to:', this.userId);
                }
                if (payload.username) {
                    this.username = payload.username;
                    console.log('[RainbowRushSDK] 📥 username set to:', this.username);
                }
                
                // Resolve the pending promise if waiting
                if (this._configPromiseResolve) {
                    this._configPromiseResolve();
                    this._configPromiseResolve = null;
                }
            }
        });
    }
    
    /**
     * Initialize SDK and load user progress
     * @returns {Promise<Object>} User progress data
     */
    async init() {
        if (this.initialized) {
            console.warn('[RainbowRushSDK] Already initialized');
            return;
        }
        
        console.log('[RainbowRushSDK] Initializing...');
        
        // Wait for config message from parent if not already received
        if (!this.userId) {
            console.log('[RainbowRushSDK] ⏳ Waiting for platform config...');
            await this.waitForConfig();
        }
        
        // Verify we have userId
        if (!this.userId) {
            console.error('[RainbowRushSDK] ❌ No userId received from platform');
            throw new Error('User ID required for Rainbow Rush SDK - config not received from platform');
        }
        
        this.initialized = true;
        console.log('[RainbowRushSDK] ✅ Initialized for user:', this.userId);
        console.log('[RainbowRushSDK] Username:', this.username);
        
        // Load initial progress
        return await this.getProgress();
    }
    
    /**
     * Wait for platform config message
     * @private
     */
    async waitForConfig() {
        // If userId is already set, return immediately
        if (this.userId) {
            console.log('[RainbowRushSDK] ✅ Already have userId');
            return;
        }
        
        // Wait for config message - promise resolves when config arrives
        await new Promise((resolve) => {
            this._configPromiseResolve = resolve;
        });
        
        // Clean up
        this._configPromiseResolve = null;
    }
    
    // ==================== PROGRESS API ====================
    
    /**
     * Get player progress from server
     * @returns {Promise<Object>} Progress data
     */
    async getProgress() {
        try {
            const response = await this.apiRequest('GET', `/api/rainbow-rush/progress/${this.userId}`);
            console.log('[RainbowRushSDK] Progress loaded:', response);
            return response;
        } catch (error) {
            console.error('[RainbowRushSDK] Error loading progress:', error);
            // Return default progress if server fails
            return this.getDefaultProgress();
        }
    }
    
    /**
     * Save level progress to server
     * @param {number} levelId - Level identifier
     * @param {Object} levelData - Level completion data
     * @returns {Promise<Object>} Updated progress
     */
    async saveLevelProgress(levelId, levelData) {
        try {
            const response = await this.apiRequest('POST', `/api/rainbow-rush/progress/${this.userId}/save-level`, {
                level_id: levelId,
                stars: levelData.stars || 0,
                best_time: levelData.best_time || 0,
                completed: levelData.completed !== false,
                coins: levelData.coins || 0
            });
            
            console.log('[RainbowRushSDK] Level progress saved:', response);
            this.emit('progressSaved', response);
            return response;
        } catch (error) {
            console.error('[RainbowRushSDK] Error saving level progress:', error);
            throw error;
        }
    }
    
    /**
     * Submit level completion with anti-cheat validation
     * @param {Object} completionData - Completion data
     * @returns {Promise<Object>} Completion result with validation
     */
    async submitLevelCompletion(completionData) {
        try {
            // Add client timestamp for validation
            const submission = {
                ...completionData,
                client_timestamp: new Date().toISOString(),
                session_duration: this.sessionId ? this.getSessionDuration() : 0
            };
            
            const response = await this.apiRequest('POST', `/api/rainbow-rush/completion/${this.userId}`, submission);
            
            console.log('[RainbowRushSDK] Level completion submitted:', response);
            
            // Check validation result
            if (response.completion?.validation) {
                const validation = response.completion.validation;
                if (!validation.is_valid) {
                    console.warn('[RainbowRushSDK] Completion flagged:', validation.anomalies);
                }
                console.log('[RainbowRushSDK] Validation score:', validation.validation_score);
            }
            
            this.emit('levelCompleted', response);
            return response;
        } catch (error) {
            console.error('[RainbowRushSDK] Error submitting completion:', error);
            throw error;
        }
    }
    
    /**
     * Get completion history
     * @param {number} levelId - Optional level filter
     * @returns {Promise<Object>} Completion history
     */
    async getCompletionHistory(levelId = null) {
        try {
            const url = `/api/rainbow-rush/completion/${this.userId}/history${levelId ? `?level_id=${levelId}` : ''}`;
            return await this.apiRequest('GET', url);
        } catch (error) {
            console.error('[RainbowRushSDK] Error fetching history:', error);
            return { completions: [], total: 0 };
        }
    }
    
    // ==================== LEADERBOARD API ====================
    
    /**
     * Get user's high score for Rainbow Rush from backend leaderboard
     * This is the authoritative source for the user's max score
     * @returns {Promise<number>} High score from backend or 0
     */
    async getUserHighScore() {
        try {
            // Rainbow Rush game ID (should match backend registration)
            const gameId = 'rainbow-rush';
            
            // Get all-time leaderboard filtered by game
            const response = await this.apiRequest('GET', `/api/leaderboard/all-time?game_id=${gameId}&limit=100`);
            
            if (response.success && response.leaderboard) {
                // Find user's entry in the leaderboard
                const userEntry = response.leaderboard.find(entry => entry.user_id === this.userId);
                
                if (userEntry) {
                    console.log('[RainbowRushSDK] 🏆 High score from backend:', userEntry.score);
                    return userEntry.score;
                }
            }
            
            console.log('[RainbowRushSDK] No high score found in leaderboard, returning 0');
            return 0;
        } catch (error) {
            console.error('[RainbowRushSDK] Error fetching high score from leaderboard:', error);
            return 0;
        }
    }
    
    // ==================== SESSION API ====================
    
    /**
     * Start game session
     * @param {number} levelId - Level being played
     * @returns {Promise<Object>} Session data
     */
    async startSession(levelId) {
        try {
            const response = await this.apiRequest('POST', `/api/rainbow-rush/session/${this.userId}/start`, {
                level_id: levelId
            });
            
            this.sessionId = response.session.session_id;
            this.sessionStartTime = Date.now();
            
            console.log('[RainbowRushSDK] Session started:', this.sessionId);
            
            // Start heartbeat
            this.startHeartbeat();
            
            this.emit('sessionStarted', response.session);
            return response.session;
        } catch (error) {
            console.error('[RainbowRushSDK] Error starting session:', error);
            throw error;
        }
    }
    
    /**
     * Update session (heartbeat or stats)
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated session
     */
    async updateSession(updateData = {}) {
        if (!this.sessionId) {
            console.warn('[RainbowRushSDK] No active session');
            return null;
        }
        
        try {
            const response = await this.apiRequest('PUT', `/api/rainbow-rush/session/${this.sessionId}`, updateData);
            return response.session;
        } catch (error) {
            console.error('[RainbowRushSDK] Error updating session:', error);
            return null;
        }
    }
    
    /**
     * End current session
     * @param {number} finalScore - Final score achieved (optional)
     * @param {Object} finalStats - Final game statistics (optional)
     * @returns {Promise<Object>} Ended session
     */
    async endSession(finalScore = null, finalStats = null) {
        if (!this.sessionId) {
            console.warn('[RainbowRushSDK] No active session to end');
            return null;
        }
        
        try {
            this.stopHeartbeat();
            
            const sessionId = this.sessionId;
            
            // Prepare payload with score and stats
            const payload = {};
            if (finalScore !== null) {
                payload.score = finalScore;
                console.log(`[RainbowRushSDK] 🎯 Sending final score: ${finalScore}`);
            }
            if (finalStats !== null) {
                payload.current_stats = finalStats;
                console.log(`[RainbowRushSDK] 📊 Sending final stats:`, finalStats);
            }
            
            console.log(`[RainbowRushSDK] 📤 Payload to send:`, payload);
            const response = await this.apiRequest('POST', `/api/rainbow-rush/session/${sessionId}/end`, payload);
            
            console.log('[RainbowRushSDK] Rainbow Rush session ended:', sessionId);
            
            // DON'T request XP notification here - let the platform handle it when it receives gameOver
            // The platform (RuntimeShell) will show XP notification when it processes the gameOver message
            // Requesting it here causes the platform session to close BEFORE score is received
            
            this.emit('sessionEnded', response.session);
            this.sessionId = null;
            this.sessionStartTime = null;
            
            return response.session;
        } catch (error) {
            console.error('[RainbowRushSDK] Error ending session:', error);
            return null;
        }
    }
    
    /**
     * Get active session
     * @returns {Promise<Object>} Active session or null
     */
    async getActiveSession() {
        try {
            const response = await this.apiRequest('GET', `/api/rainbow-rush/session/${this.userId}/active`);
            return response.session;
        } catch (error) {
            console.error('[RainbowRushSDK] Error fetching active session:', error);
            return null;
        }
    }
    
    // ==================== HEARTBEAT ====================
    
    /**
     * Start heartbeat interval
     * @private
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Send heartbeat every 10 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 10000);
        
        console.log('[RainbowRushSDK] Heartbeat started');
    }
    
    /**
     * Stop heartbeat interval
     * @private
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('[RainbowRushSDK] Heartbeat stopped');
        }
    }
    
    /**
     * Send heartbeat to server
     * @private
     */
    async sendHeartbeat() {
        try {
            await this.updateSession({ heartbeat: true });
            this.clientState.lastHeartbeat = Date.now();
        } catch (error) {
            console.error('[RainbowRushSDK] Heartbeat error:', error);
            this.clientState.anomalyCount++;
        }
    }
    
    /**
     * Get session duration in seconds
     * @private
     * @returns {number} Duration in seconds
     */
    getSessionDuration() {
        if (!this.sessionStartTime) return 0;
        return (Date.now() - this.sessionStartTime) / 1000;
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Make API request
     * @private
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Response data
     */
    async apiRequest(method, endpoint, data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `API request failed: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Get default progress (fallback)
     * @private
     * @returns {Object} Default progress
     */
    getDefaultProgress() {
        return {
            progress_id: `rr_prog_${this.userId}`,
            user_id: this.userId,
            current_level: 1,
            max_level_unlocked: 1,
            total_coins: 0,
            total_stars: 0,
            high_score: 0,
            level_completions: {},
            unlocked_items: {
                skins: ['default'],
                abilities: ['jump']
            },
            statistics: {},
            created_at: new Date().toISOString(),
            last_played: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
    
    // ==================== EVENT SYSTEM ====================
    
    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Emit event
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[RainbowRushSDK] Error in ${event} callback:`, error);
                }
            });
        }
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopHeartbeat();
        if (this.sessionId) {
            this.endSession();
        }
        this.listeners.clear();
        this.initialized = false;
        console.log('[RainbowRushSDK] Destroyed');
    }
}

// Export as ES6 module
export default RainbowRushSDK;
