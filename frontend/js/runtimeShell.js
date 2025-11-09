/**
 * RuntimeShell - Game Platform Communication Layer
 * 
 * Manages communication between the platform and games loaded in iframes
 * using the postMessage API with proper origin validation and event handling.
 * 
 * Features:
 * - Secure iframe communication via postMessage
 * - Platform → Game events: start, pause, resume, exit, config
 * - Game → Platform events: scoreUpdate, gameOver, levelCompleted, requestFullScreen, log
 * - Origin validation for security
 * - Event bus system for extensibility
 * - UI overlay management
 */

const PROTOCOL_VERSION = '1.0.0';

// Allowed game message types (Game → Platform)
const GAME_MESSAGE_TYPES = {
    SCORE_UPDATE: 'scoreUpdate',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETED: 'levelCompleted',
    REQUEST_FULLSCREEN: 'requestFullScreen',
    LOG: 'log',
    READY: 'ready'
};

// Allowed platform message types (Platform → Game)
const PLATFORM_MESSAGE_TYPES = {
    START: 'start',
    PAUSE: 'pause',
    RESUME: 'resume',
    EXIT: 'exit',
    CONFIG: 'config'
};

export default class RuntimeShell {
    /**
     * Create a new RuntimeShell instance
     * @param {HTMLIFrameElement} iframeElement - The iframe element containing the game
     * @param {string} gameId - Unique identifier for the game
     * @param {Object} config - Configuration options
     */
    constructor(iframeElement, gameId, config = {}) {
        this.iframe = iframeElement;
        this.gameId = gameId;
        this.config = {
            allowedOrigins: config.allowedOrigins || ['http://localhost:8000', window.location.origin],
            debug: config.debug || false,
            timeout: config.timeout || 30000
        };
        
        // Game session tracking
        this.sessionId = null;
        this.sessionStartTime = null;
        this.currentScore = 0;
        
        // State management
        this.state = {
            isReady: false,
            isPaused: false,
            score: 0,
            level: 1,
            isGameOver: false
        };
        
        // Event handlers registry
        this.eventHandlers = new Map();
        
        // Message queue for messages sent before game is ready
        this.messageQueue = [];
        
        // Bound message handler for cleanup
        this.boundMessageHandler = this.handleMessage.bind(this);
        
        this.log('RuntimeShell initialized for game:', gameId);
    }
    
    /**
     * Initialize the runtime shell
     */
    init() {
        // Listen for messages from the game
        window.addEventListener('message', this.boundMessageHandler);
        
        // Wait for iframe to load
        this.iframe.addEventListener('load', () => {
            this.log('Iframe loaded, waiting for game ready signal...');
            
            // Send initial config after a short delay
            setTimeout(() => {
                this.sendConfig();
            }, 500);
        });
        
        this.log('RuntimeShell initialized and listening for messages');
    }
    
    /**
     * Handle incoming messages from the game
     * @param {MessageEvent} event - The message event
     */
    handleMessage(event) {
        // Validate origin
        if (!this.isValidOrigin(event.origin)) {
            this.log('Rejected message from invalid origin:', event.origin);
            return;
        }
        
        const message = event.data;
        
        // Validate message format
        if (!this.isValidMessage(message)) {
            this.log('Rejected invalid message format:', message);
            return;
        }
        
        this.log('Received message:', message);
        
        // Handle the message based on type
        switch (message.type) {
            case GAME_MESSAGE_TYPES.READY:
                this.handleReady(message.payload);
                break;
            
            case GAME_MESSAGE_TYPES.SCORE_UPDATE:
                this.handleScoreUpdate(message.payload);
                break;
            
            case GAME_MESSAGE_TYPES.GAME_OVER:
                this.handleGameOver(message.payload);
                break;
            
            case GAME_MESSAGE_TYPES.LEVEL_COMPLETED:
                this.handleLevelCompleted(message.payload);
                break;
            
            case GAME_MESSAGE_TYPES.REQUEST_FULLSCREEN:
                this.handleFullscreenRequest();
                break;
            
            case GAME_MESSAGE_TYPES.LOG:
                this.handleLog(message.payload);
                break;
            
            default:
                this.log('Unknown message type:', message.type);
        }
        
        // Emit event for external listeners
        this.emit(message.type, message.payload);
    }
    
    /**
     * Validate message origin
     * @param {string} origin - The origin to validate
     * @returns {boolean} Whether the origin is valid
     */
    isValidOrigin(origin) {
        return this.config.allowedOrigins.includes(origin) || 
               this.config.allowedOrigins.includes('*');
    }
    
    /**
     * Validate message format
     * @param {Object} message - The message to validate
     * @returns {boolean} Whether the message is valid
     */
    isValidMessage(message) {
        return message && 
               typeof message === 'object' && 
               typeof message.type === 'string' &&
               message.protocolVersion === PROTOCOL_VERSION;
    }
    
    /**
     * Handle game ready event
     * @param {Object} payload - The payload data
     */
    handleReady(payload) {
        this.state.isReady = true;
        this.log('Game is ready:', payload);
        
        // Start game session tracking
        this.startGameSession();
        
        // Process queued messages
        this.processMessageQueue();
        
        // Send start signal
        this.start();
    }
    
    /**
     * Handle score update event
     * @param {Object} payload - The payload containing score data
     */
    handleScoreUpdate(payload) {
        if (payload && typeof payload.score === 'number') {
            this.state.score = payload.score;
            this.updateScoreDisplay(payload.score);
        }
    }
    
    /**
     * Handle game over event
     * @param {Object} payload - The payload containing final score
     */
    handleGameOver(payload) {
        this.state.isGameOver = true;
        
        // Log the received payload for debugging
        this.log('GameOver payload received:', payload);
        this.log('Current state.score before update:', this.state.score);
        
        // Get score from payload, fallback to current state
        const finalScore = payload?.score ?? this.state.score ?? 0;
        this.state.score = finalScore;
        
        this.log('Game Over! Final score:', this.state.score);
        this.showGameOverOverlay(this.state.score);
        
        // End game session and save score (prevent double-ending by clearing sessionId first)
        if (this.sessionId) {
            const sessionToEnd = this.sessionId;
            const startTime = this.sessionStartTime; // Save before clearing
            this.sessionId = null; // Clear immediately to prevent double-ending
            this.sessionStartTime = null;
            this.endGameSessionById(sessionToEnd, this.state.score, startTime, false);
        }
    }
    
    /**
     * Handle level completed event
     * @param {Object} payload - The payload containing level data
     */
    handleLevelCompleted(payload) {
        if (payload && typeof payload.level === 'number') {
            this.state.level = payload.level;
            this.log('Level completed:', payload.level);
            this.showLevelCompleteOverlay(payload.level);
        }
    }
    
    /**
     * Handle fullscreen request
     */
    handleFullscreenRequest() {
        const container = this.iframe.parentElement;
        
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
    }
    
    /**
     * Handle log message from game
     * @param {Object} payload - The log payload
     */
    handleLog(payload) {
        if (payload && payload.message) {
            console.log(`[Game ${this.gameId}]:`, payload.message, payload.data || '');
        }
    }
    
    /**
     * Send a message to the game
     * @param {string} type - Message type
     * @param {Object} payload - Message payload
     */
    sendMessage(type, payload = {}) {
        if (!this.iframe.contentWindow) {
            this.log('Cannot send message: iframe contentWindow not available');
            return;
        }
        
        const message = {
            type,
            payload,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
            gameId: this.gameId
        };
        
        // Queue message if game is not ready
        if (!this.state.isReady && type !== PLATFORM_MESSAGE_TYPES.CONFIG) {
            this.log('Game not ready, queuing message:', type);
            this.messageQueue.push(message);
            return;
        }
        
        this.log('Sending message to game:', message);
        this.iframe.contentWindow.postMessage(message, '*');
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        this.log('Processing message queue:', this.messageQueue.length, 'messages');
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }
    
    /**
     * Send configuration to the game
     */
    sendConfig() {
        this.sendMessage(PLATFORM_MESSAGE_TYPES.CONFIG, {
            gameId: this.gameId,
            platformVersion: PROTOCOL_VERSION,
            features: {
                scoreTracking: true,
                levelTracking: true,
                fullscreen: true
            }
        });
    }
    
    /**
     * Start the game
     */
    start() {
        this.log('Starting game');
        this.sendMessage(PLATFORM_MESSAGE_TYPES.START, {
            timestamp: Date.now()
        });
    }
    
    /**
     * Pause the game
     */
    pause() {
        if (this.state.isPaused) return;
        
        this.state.isPaused = true;
        this.log('Pausing game');
        this.sendMessage(PLATFORM_MESSAGE_TYPES.PAUSE, {
            timestamp: Date.now()
        });
        
        this.showPauseOverlay();
    }
    
    /**
     * Resume the game
     */
    resume() {
        if (!this.state.isPaused) return;
        
        this.state.isPaused = false;
        this.log('Resuming game');
        this.sendMessage(PLATFORM_MESSAGE_TYPES.RESUME, {
            timestamp: Date.now()
        });
        
        this.hidePauseOverlay();
    }
    
    /**
     * Exit the game
     */
    exit() {
        this.log('Exiting game');
        this.sendMessage(PLATFORM_MESSAGE_TYPES.EXIT, {
            timestamp: Date.now()
        });
        
        this.cleanup();
    }
    
    /**
     * Register an event handler
     * @param {string} eventType - The event type to listen for
     * @param {Function} handler - The handler function
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        
        this.eventHandlers.get(eventType).push(handler);
    }
    
    /**
     * Unregister an event handler
     * @param {string} eventType - The event type
     * @param {Function} handler - The handler function to remove
     */
    off(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) return;
        
        const handlers = this.eventHandlers.get(eventType);
        const index = handlers.indexOf(handler);
        
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }
    
    /**
     * Emit an event to all registered handlers
     * @param {string} eventType - The event type
     * @param {*} data - The event data
     */
    emit(eventType, data) {
        if (!this.eventHandlers.has(eventType)) return;
        
        const handlers = this.eventHandlers.get(eventType);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('Error in event handler:', error);
            }
        });
    }
    
    /**
     * Update score display in UI
     * @param {number} score - The current score
     */
    updateScoreDisplay(score) {
        const scoreElement = document.getElementById('current-score');
        if (scoreElement) {
            scoreElement.textContent = score;
        }
    }
    
    /**
     * Show pause overlay
     */
    showPauseOverlay() {
        // Update UI to show paused state
        const statusElement = document.querySelector('.game-status');
        if (statusElement) {
            statusElement.textContent = 'Game Paused';
            statusElement.style.color = 'var(--warning)';
        }
    }
    
    /**
     * Hide pause overlay
     */
    hidePauseOverlay() {
        const statusElement = document.querySelector('.game-status');
        if (statusElement) {
            statusElement.textContent = 'Playing';
            statusElement.style.color = 'var(--success)';
        }
    }
    
    /**
     * Show game over overlay
     * @param {number} finalScore - The final score
     */
    showGameOverOverlay(finalScore) {
        const statusElement = document.querySelector('.game-status');
        if (statusElement) {
            statusElement.textContent = `Game Over - Final Score: ${finalScore}`;
            statusElement.style.color = 'var(--error)';
        }
    }
    
    /**
     * Show level complete overlay
     * @param {number} level - The completed level
     */
    showLevelCompleteOverlay(level) {
        const statusElement = document.querySelector('.game-status');
        if (statusElement) {
            statusElement.textContent = `Level ${level} Complete!`;
            statusElement.style.color = 'var(--success)';
            
            // Clear message after 3 seconds
            setTimeout(() => {
                statusElement.textContent = 'Playing';
            }, 3000);
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup(useBeacon = false) {
        // End game session if active
        if (this.sessionId) {
            this.endGameSession(useBeacon);
        }
        
        window.removeEventListener('message', this.boundMessageHandler);
        this.eventHandlers.clear();
        this.messageQueue = [];
        this.log('RuntimeShell cleaned up');
    }
    
    /**
     * Start game session tracking
     */
    async startGameSession() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                this.log('No user logged in, skipping session tracking');
                return;
            }
            
            const response = await fetch('http://localhost:8000/users/sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    game_id: this.gameId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session.session_id;
                this.sessionStartTime = Date.now();
                this.log('Game session started:', this.sessionId);
            }
        } catch (error) {
            this.log('Failed to start game session:', error);
        }
    }
    
    /**
     * End game session and send stats
     */
    async endGameSession(useBeacon = false) {
        if (!this.sessionId) {
            return;
        }
        
        const sessionToEnd = this.sessionId;
        const finalScore = this.state.score;
        const startTime = this.sessionStartTime; // Save before clearing
        
        // Clear session immediately to prevent double-ending
        this.sessionId = null;
        this.sessionStartTime = null;
        
        await this.endGameSessionById(sessionToEnd, finalScore, startTime, useBeacon);
    }
    
    /**
     * End a specific game session by ID
     */
    async endGameSessionById(sessionId, score, startTime, useBeacon = false) {
        if (!sessionId) {
            return;
        }
        
        try {
            const durationSeconds = Math.floor((Date.now() - startTime) / 1000) || 0;
            
            // Ensure score is a valid number
            const finalScore = typeof score === 'number' ? Math.floor(score) : 0;
            
            this.log('Ending session - Session ID:', sessionId, 'Score:', finalScore, 'Duration:', durationSeconds);
            
            const payload = {
                session_id: sessionId,
                score: finalScore,
                duration_seconds: durationSeconds
            };
            
            this.log('Payload to send to backend:', JSON.stringify(payload));
            
            // Use sendBeacon for page unload (more reliable)
            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon('http://localhost:8000/users/sessions/end', blob);
                this.log('Game session ended via beacon');
                return;
            }
            
            // Regular fetch for normal game end
            const response = await fetch('http://localhost:8000/users/sessions/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            this.log('Backend response status:', response.status);
            
            const data = await response.json();
            
            this.log('Backend response data:', data);
            
            if (data.success) {
                this.log('Game session ended:', data.session);
                
                // Update user's CUR8 in authManager
                if (window.authManager) {
                    window.authManager.updateCur8(data.session.cur8_earned);
                }
                
                // Show CUR8 earned notification (only for normal end, not beacon)
                if (!useBeacon) {
                    this.showCur8Notification(data.session.cur8_earned);
                }
            }
        } catch (error) {
            this.log('Failed to end game session:', error);
        }
    }
    
    /**
     * Show CUR8 earned notification
     */
    showCur8Notification(cur8Amount) {
        const notification = document.createElement('div');
        notification.className = 'cur8-notification';
        notification.innerHTML = `
            <div class="cur8-badge">
                <span class="cur8-icon">💰</span>
                <span class="cur8-amount">+${cur8Amount.toFixed(2)} CUR8</span>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .cur8-notification {
                position: fixed;
                top: 70px;
                right: 20px;
                z-index: 10000;
                animation: slideInRight 0.5s ease, fadeOut 0.5s ease 3.5s;
            }
            .cur8-badge {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .cur8-icon {
                font-size: 1.5em;
            }
            .cur8-amount {
                font-size: 1.2em;
                font-weight: bold;
                color: #1a1a1a;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 4000);
    }
    
    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Log messages if debug is enabled
     * @param {...*} args - Arguments to log
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[RuntimeShell]', ...args);
        }
    }
}

// Export message type constants for external use
export { GAME_MESSAGE_TYPES, PLATFORM_MESSAGE_TYPES, PROTOCOL_VERSION };
