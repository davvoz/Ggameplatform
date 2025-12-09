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
        
        // Get user ID from platform SDK or localStorage
        if (!this.userId) {
            this.userId = await this.getCurrentUserId();
        }
        
        if (!this.userId) {
            throw new Error('User ID required for Rainbow Rush SDK');
        }
        
        this.initialized = true;
        console.log('[RainbowRushSDK] Initialized for user:', this.userId);
        
        // Load initial progress
        return await this.getProgress();
    }
    
    /**
     * Get current user ID from platform or create anonymous user
     * @private
     * @returns {Promise<string>} User ID
     */
    async getCurrentUserId() {
        // PRIORITY 1: Try to get from global AuthManager (Ggameplatform)
        if (window.AuthManager && window.AuthManager.isLoggedIn()) {
            const user = window.AuthManager.getUser();
            if (user && user.user_id) {
                console.log('[RainbowRushSDK] ✅ Using AuthManager user_id:', user.user_id);
                // IMPORTANTE: Clear any anonymous ID when using real user
                const oldId = localStorage.getItem('rr_user_id');
                if (oldId && oldId !== user.user_id) {
                    console.log('[RainbowRushSDK] 🗑️ Removing old anonymous ID:', oldId);
                    localStorage.removeItem('rr_user_id');
                }
                return user.user_id;
            }
        }
        
        // PRIORITY 2: Try to get from global PlatformSDK (fallback)
        if (window.PlatformSDK && window.PlatformSDK.config?.userId) {
            console.log('[RainbowRushSDK] Using PlatformSDK user:', window.PlatformSDK.config.userId);
            return window.PlatformSDK.config.userId;
        }
        
        // PRIORITY 3: Se AuthManager esiste ma non è loggato, NON creare utente anonimo
        // Questo previene la creazione di ID anonimi quando c'è un sistema di autenticazione
        if (window.AuthManager && !window.AuthManager.isLoggedIn()) {
            console.warn('[RainbowRushSDK] ⚠️ AuthManager found but user not logged in. Please login first.');
            throw new Error('User not logged in. Please login to play Rainbow Rush.');
        }
        
        // PRIORITY 4: Try localStorage (solo se non c'è AuthManager)
        let userId = localStorage.getItem('rr_user_id');
        if (userId) {
            console.log('[RainbowRushSDK] Using cached user:', userId);
            return userId;
        }
        
        // PRIORITY 5: Create anonymous user (solo se non c'è sistema di auth)
        userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('rr_user_id', userId);
        console.log('[RainbowRushSDK] Created anonymous user:', userId);
        return userId;
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
