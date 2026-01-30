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

import { config } from './config.js';

const PROTOCOL_VERSION = '1.0.0';

// Allowed game message types (Game → Platform)
const GAME_MESSAGE_TYPES = {
    SCORE_UPDATE: 'scoreUpdate',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETED: 'levelCompleted',
    REQUEST_FULLSCREEN: 'requestFullScreen',
    LOG: 'log',
    READY: 'ready',
    RESET_SESSION: 'resetSession',
    GAME_STARTED: 'gameStarted'
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

        // Get allowed origins from config, fallback to current origin and API URL
        const apiUrl = window.ENV?.API_URL || window.location.origin;
        const defaultOrigins = [
            window.location.origin,
            apiUrl,
            'http://localhost:8000',
            'http://localhost:3000'
        ];

        this.config = {
            allowedOrigins: config.allowedOrigins || defaultOrigins,
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

        // Session restart flag
        this.needsNewSession = true; // Start true so first game creates session

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
        // Ignore MetaMask messages
        const message = event.data;
        if (message && typeof message === 'object' && 
            (message.target === 'metamask-inpage' || 
             message.target === 'metamask-provider' ||
             message.name === 'metamask-provider')) {
            return; // Silently ignore MetaMask messages
        }

        // Validate origin
        if (!this.isValidOrigin(event.origin)) {
            this.log('Rejected message from invalid origin:', event.origin);
            return;
        }

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

            case GAME_MESSAGE_TYPES.RESET_SESSION:
                // Handle async reset session
                this.resetSession().then(() => {
                    this.log('✅ Session reset complete');
                });
                break;

            case GAME_MESSAGE_TYPES.GAME_STARTED:
                // Game has actually started (level selected) - create session now
                console.log('🎮🎮🎮 [RuntimeShell] GAME_STARTED message received!');
                console.log('🎮 Current sessionId:', this.sessionId);
                this.log('🎮 Game started, creating session...');
                if (!this.sessionId) {
                    console.log('🎮 No sessionId, calling startGameSession()...');
                    this.startGameSession();
                } else {
                    console.log('🎮 SessionId already exists:', this.sessionId);
                }
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
        // Never allow wildcard in production
        if (this.config.allowedOrigins.includes('*')) {
            console.warn('⚠️ Wildcard origin (*) is allowed - this is insecure!');
            return true;
        }

        // Check if origin is in whitelist
        const isAllowed = this.config.allowedOrigins.includes(origin);

        if (!isAllowed) {
            console.warn('🔒 Rejected message from unauthorized origin:', origin);
            console.log('Allowed origins:', this.config.allowedOrigins);
        }

        return isAllowed;
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

        // DON'T start session here - wait for actual game start
        this.log('⏸️ Game ready, waiting for game start to create session...');

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
            // Check if this is a restart (game was over and score=0)
            const isRestart = this.state.isGameOver && payload.score === 0;

            if (isRestart) {
                this.log('🎮 Game restarted detected (score=0 after game over)');

                // Create new session immediately on restart
                if (this.needsNewSession && !this.sessionId) {
                    this.log('✅ Creating new session for restart...');
                    this.needsNewSession = false;
                    this.state.isGameOver = false; // Reset flag before creating session
                    this.startGameSession();
                } else {
                    this.state.isGameOver = false;
                }
            }

            this.state.score = payload.score;
            this.updateScoreDisplay(payload.score);
        }
    }

    /**
     * Handle game over event
     * @param {Object} payload - The payload containing final score and extra_data
     */
    handleGameOver(payload) {
        // Log the received payload for debugging
        this.log('🎯 GameOver payload received:', payload);
        this.log('📊 Current state.score before update:', this.state.score);
        this.log('🆔 Current sessionId:', this.sessionId);
        this.log('⏰ Session start time:', this.sessionStartTime);

        // Get score from payload, fallback to current state
        const finalScore = payload?.score ?? this.state.score ?? 0;
        this.state.score = finalScore;
        
        // Extract extra_data for cumulative XP system (levels, distance, etc.)
        // Support both 'extra_data' and 'game_data' keys for compatibility
        const extraData = payload?.extra_data || payload?.game_data || {};
        
        // Also merge top-level fields that games might send directly
        if (payload) {
            if (payload.kills !== undefined && !extraData.kills) extraData.kills = payload.kills;
            if (payload.time !== undefined && !extraData.time) extraData.time = payload.time;
            if (payload.level !== undefined && !extraData.level) extraData.level = payload.level;
            if (payload.survival_time !== undefined && !extraData.survival_time) extraData.survival_time = payload.survival_time;
            if (payload.enemies_killed !== undefined && !extraData.enemies_killed) extraData.enemies_killed = payload.enemies_killed;
            if (payload.player_level !== undefined && !extraData.player_level) extraData.player_level = payload.player_level;
        }

        this.log('💀 Game Over! Final score:', this.state.score);
        this.log('📊 Extra data:', extraData);
        this.showGameOverOverlay(this.state.score);

        // End game session and save score ONLY if session exists
        if (this.sessionId) {
            this.log('✅ SessionId exists, ending session:', this.sessionId);
            const sessionToEnd = this.sessionId;
            const startTime = this.sessionStartTime; // Save before clearing
            this.sessionId = null; // Clear immediately to prevent double-ending
            this.sessionStartTime = null;
            this.endGameSessionById(sessionToEnd, this.state.score, startTime, false, extraData);

            // Mark game over AFTER ending session
            this.state.isGameOver = true;
            // Mark that we need a new session on next game
            this.needsNewSession = true;
        } else {
            this.log('⚠️ No sessionId - game ended before session was created');
            // Still mark game over
            this.state.isGameOver = true;
            // Keep needsNewSession true (should already be true from init)
            this.needsNewSession = true;
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
     * Handle fullscreen request - TOGGLES fullscreen on/off
     */
    handleFullscreenRequest() {
        const container = this.iframe.parentElement;
        const gamePlayer = document.querySelector('.game-player');
        const targetElement = gamePlayer || container;

        // iOS/iPadOS Safari detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // Check if Fullscreen API is actually supported (iOS Safari returns false)
        const fullscreenSupported = document.fullscreenEnabled || 
                                     document.webkitFullscreenEnabled || 
                                     document.msFullscreenEnabled;
        
        // Check if already in fullscreen (native or CSS)
        const isInNativeFullscreen = document.fullscreenElement || 
                                      document.webkitFullscreenElement || 
                                      document.msFullscreenElement;
        const isInCSSFullscreen = targetElement.classList.contains('ios-fullscreen');
        
        if ((isIOS || isIPadOS) && !fullscreenSupported) {
            // iOS/iPadOS Safari doesn't support Fullscreen API
            // Use CSS-based fullscreen fallback (already toggles)
            this.enableIOSFullscreenFallback(container, gamePlayer);
        } else if (isSafari && !fullscreenSupported) {
            // Safari on Mac without fullscreen support
            this.enableIOSFullscreenFallback(container, gamePlayer);
        } else if (isInNativeFullscreen) {
            // Already in fullscreen - EXIT
            this.log('Exiting native fullscreen');
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else if (isInCSSFullscreen) {
            // In CSS fullscreen - exit
            this.exitIOSFullscreen(targetElement);
        } else {
            // Not in fullscreen - ENTER
            this.log('Entering native fullscreen');
            if (targetElement.requestFullscreen) {
                targetElement.requestFullscreen();
            } else if (targetElement.webkitRequestFullscreen) {
                targetElement.webkitRequestFullscreen();
            } else if (targetElement.msRequestFullscreen) {
                targetElement.msRequestFullscreen();
            } else {
                // Fallback if no fullscreen API available
                this.enableIOSFullscreenFallback(container, gamePlayer);
            }
        }
    }

    /**
     * iOS fullscreen fallback using CSS
     * Since iOS Safari doesn't support the Fullscreen API, we simulate it with CSS
     */
    enableIOSFullscreenFallback(container, gamePlayer) {
        const targetElement = gamePlayer || container;
        const isFullscreen = targetElement.classList.contains('ios-fullscreen');
        
        if (isFullscreen) {
            // Exit fullscreen
            this.exitIOSFullscreen(targetElement);
        } else {
            // Enter fullscreen
            this.enterIOSFullscreen(targetElement);
        }
    }

    /**
     * Enter iOS fullscreen mode
     */
    enterIOSFullscreen(element) {
        element.classList.add('ios-fullscreen');
        document.body.classList.add('ios-fullscreen-active');
        document.body.style.overflow = 'hidden';
        
        // Hide the navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.display = 'none';
        }
        
        // Create exit button for iOS
        this.createIOSExitButton(element);
        
        // Try to scroll to hide Safari address bar (works in PWA mode)
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);
        
        this.log('Entered iOS fullscreen mode');
    }

    /**
     * Exit iOS fullscreen mode
     */
    exitIOSFullscreen(element) {
        element.classList.remove('ios-fullscreen');
        document.body.classList.remove('ios-fullscreen-active');
        document.body.style.overflow = '';
        
        // Show the navbar again
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.display = '';
        }
        
        // Remove exit button
        this.removeIOSExitButton();
        
        this.log('Exited iOS fullscreen mode');
    }

    /**
     * Create exit button for iOS fullscreen
     */
    createIOSExitButton(container) {
        // Remove existing button if any
        this.removeIOSExitButton();
        
        const exitBtn = document.createElement('button');
        exitBtn.id = 'ios-fullscreen-exit-btn';
        exitBtn.className = 'ios-fullscreen-exit-btn';
        exitBtn.innerHTML = '✕';
        exitBtn.setAttribute('aria-label', 'Exit fullscreen');
        
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exitIOSFullscreen(container);
        });
        
        document.body.appendChild(exitBtn);
    }

    /**
     * Remove iOS exit button
     */
    removeIOSExitButton() {
        const existingBtn = document.getElementById('ios-fullscreen-exit-btn');
        if (existingBtn) {
            existingBtn.remove();
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
        // Get current user from AuthManager
        let userId = null;
        let username = null;
        if (window.AuthManager && window.AuthManager.isLoggedIn()) {
            const user = window.AuthManager.getUser();
            userId = user?.user_id || null;
            username = user?.username || user?.account_name || null;
        }
        
        this.sendMessage(PLATFORM_MESSAGE_TYPES.CONFIG, {
            gameId: this.gameId,
            platformVersion: PROTOCOL_VERSION,
            userId: userId,  // Pass user ID to game
            username: username,  // Pass username to game
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
        console.warn('🚪 EXIT BUTTON PRESSED - Stack trace:', new Error().stack);
        this.log('Exiting game - no XP will be awarded');
        this.sendMessage(PLATFORM_MESSAGE_TYPES.EXIT, {
            timestamp: Date.now()
        });

        // Clean up iOS fullscreen if active
        const container = this.iframe.parentElement;
        if (container && container.classList.contains('ios-fullscreen')) {
            container.classList.remove('ios-fullscreen');
            document.body.style.overflow = '';
        }

        console.warn('🚪 Calling cleanup(false, true) - skipSessionEnd=true');
        // Pass skipSessionEnd=true to prevent XP distribution on exit
        this.cleanup(false, true);
        console.warn('🚪 Exit completed');
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
     * @param {boolean} useBeacon - Whether to use sendBeacon API for session end
     * @param {boolean} skipSessionEnd - If true, don't end session (used for Exit button)
     */
    cleanup(useBeacon = false, skipSessionEnd = false) {
        console.warn('🧹 CLEANUP CALLED - useBeacon:', useBeacon, 'skipSessionEnd:', skipSessionEnd, 'sessionId:', this.sessionId);
        // End game session if active (unless skipSessionEnd is true for Exit)
        if (this.sessionId && !skipSessionEnd) {
            console.warn('🧹 Branch 1: Will call endGameSession');
            this.log('Cleanup: Ending active session');
            this.endGameSession(useBeacon);
        } else if (this.sessionId && skipSessionEnd) {
            console.warn('🧹 Branch 2: Skipping session end - clearing session locally');
            this.log('Cleanup: Skipping session end (Exit button pressed - no XP awarded)');
            // Just clear the session without saving
            this.sessionId = null;
            this.sessionStartTime = null;
        } else {
            console.warn('🧹 Branch 3: No session or already cleared');
        }

        // Clean up iOS fullscreen if active
        const container = this.iframe?.parentElement;
        if (container && container.classList.contains('ios-fullscreen')) {
            container.classList.remove('ios-fullscreen');
            document.body.style.overflow = '';
        }

        window.removeEventListener('message', this.boundMessageHandler);
        this.eventHandlers.clear();
        this.messageQueue = [];
        this.log('RuntimeShell cleaned up');
    }

    /**
     * Reset session for game restart
     * This should be called when the user explicitly restarts the game
     * Note: The previous session should already be ended by handleGameOver
     */
    async resetSession() {
        this.log('🔄 Resetting session for restart...');

        // The session should already be ended by handleGameOver
        // Just log if there's still an active session (shouldn't happen)
        if (this.sessionId) {
            this.log('⚠️ Warning: Session still active during restart. Ending it now:', this.sessionId);
            const sessionToEnd = this.sessionId;
            const finalScore = this.state.score;
            const startTime = this.sessionStartTime;

            // Clear session immediately to prevent double-ending
            this.sessionId = null;
            this.sessionStartTime = null;

            // End session and save XP
            await this.endGameSessionById(sessionToEnd, finalScore, startTime, false);
        } else {
            this.log('✅ No active session (already ended by Game Over)');
        }

        // Reset state
        this.state.score = 0;
        this.state.isGameOver = false;
        this.needsNewSession = false;

        // Start new session immediately
        this.log('🎮 Starting new session for restart...');
        await this.startGameSession();
    }

    /**
     * Start game session tracking
     */
    async startGameSession() {
        this.log('🎮 startGameSession() called');
        try {
            // Check if config is available
            if (typeof config === 'undefined' || !config.API_URL) {
                this.log('❌ Config or API_URL not available');
                return;
            }

            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            this.log('Current user from localStorage:', currentUser ? currentUser.user_id : 'null');

            if (!currentUser) {
                this.log('❌ No user logged in, skipping session tracking');
                return;
            }

            this.log('📡 Sending session start request to backend...', config.API_URL);
            const response = await fetch(`${config.API_URL}/users/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    game_id: this.gameId
                })
            });

            this.log('Response status:', response.status);
            const data = await response.json();
            this.log('Response data:', data);

            if (data.success) {
                this.sessionId = data.session.session_id;
                this.sessionStartTime = Date.now();
                this.log('✅ Game session started:', this.sessionId);
            } else {
                this.log('❌ Failed to start session:', data);
            }
        } catch (error) {
            this.log('❌ Exception in startGameSession:', error);
        }
    }

    /**
     * End game session and send stats
     */
    async endGameSession(useBeacon = false) {
        console.warn('🔴 endGameSession CALLED - Stack trace:', new Error().stack);
        if (!this.sessionId) {
            console.warn('🔴 endGameSession: No sessionId, returning');
            return;
        }

        const sessionToEnd = this.sessionId;
        const finalScore = this.state.score;
        const startTime = this.sessionStartTime; // Save before clearing

        console.warn('🔴 endGameSession: Will end session', sessionToEnd, 'score:', finalScore);

        // Clear session immediately to prevent double-ending
        this.sessionId = null;
        this.sessionStartTime = null;

        await this.endGameSessionById(sessionToEnd, finalScore, startTime, useBeacon);
    }

    /**
     * End a specific game session by ID
     */
    async endGameSessionById(sessionId, score, startTime, useBeacon = false, extraData = null) {
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
                duration_seconds: durationSeconds,
                extra_data: extraData || {}
            };

            this.log('Payload to send to backend:', JSON.stringify(payload));

            // Use sendBeacon for page unload (more reliable)
            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`${config.API_URL}/users/sessions/end`, blob);
                this.log('Game session ended via beacon');
                return;
            }

            // Regular fetch for normal game end
            const response = await fetch(`${config.API_URL}/users/sessions/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            this.log('Backend response status:', response.status);

            const data = await response.json();

            this.log('Backend response data:', data);

            if (data.success) {
                this.log('Game session ended:', data.session);

                // Update user's XP in AuthManager (note: capital A)
                if (window.AuthManager) {
                    window.AuthManager.updateCur8(data.session.xp_earned);

                    // Refresh dati utente dal server per sincronizzare XP
                    // (ritardo di 500ms per dare tempo al backend di processare)
                    // setTimeout(async () => {
                    //     await window.AuthManager.refreshUserData();
                    // }, 500);
                }

                this.showCur8Notification(data.session.xp_earned, data.session);
                
                // Check for level up
                if (data.session.level_up) {
                    this.showLevelUpNotification(data.session.level_up);
                }

                // Emit event to trigger quest refresh
                window.dispatchEvent(new CustomEvent('gameSessionEnded', {
                    detail: {
                        session: data.session,
                        xp_earned: data.session.xp_earned,
                        duration_seconds: data.session.duration_seconds
                    }
                }));

                // Note: Leaderboard (both weekly and all-time) is now automatically
                // updated by the backend trigger system when session ends
            }
        } catch (error) {
            this.log('Failed to end game session:', error);
        }
    }

    /**
     * Show XP earned notification
     * @param {number} xpAmount - Total XP earned
     * @param {object} session - Full session object with breakdown details
     */
    async showCur8Notification(xpAmount, session = null) {
        // Send the XP banner request to the game iframe only; do not render fallback here.
        const payload = {
            xp_earned: xpAmount,
            xp_breakdown: session?.xp_breakdown || [],
            extra_data: session?.metadata || session?.extra_data || null
        };
        this.sendMessage('showXPBanner', payload);
    }

    /**
     * Show level-up notification
     */
    showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone } = levelUpData;

        // Check if user is anonymous
        const currentUser = window.AuthManager?.currentUser;
        const isAnonymous = currentUser?.is_anonymous === true;

        // Add user_data to levelUpData for games to check
        const enrichedLevelUpData = {
            ...levelUpData,
            user_data: {
                is_anonymous: isAnonymous
            }
        };

        // Send level-up event to the game iframe and do not render fallback here.
        this.sendMessage('showLevelUpModal', enrichedLevelUpData);
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
