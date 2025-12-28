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
        const extraData = payload?.extra_data || {};

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
     * Handle fullscreen request
     */
    handleFullscreenRequest() {
        const container = this.iframe.parentElement;

        // iOS Safari detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            // iOS Safari doesn't support standard fullscreen API
            // Try webkit fullscreen on iframe itself
            if (this.iframe.webkitEnterFullscreen) {
                try {
                    this.iframe.webkitEnterFullscreen();
                } catch (e) {
                    this.log('iOS fullscreen not supported:', e);
                    // Fallback: expand to viewport with fixed positioning
                    this.enableIOSFullscreenFallback(container);
                }
            } else {
                this.enableIOSFullscreenFallback(container);
            }
        } else {
            // Standard browsers
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        }
    }

    /**
     * iOS fullscreen fallback using CSS
     */
    enableIOSFullscreenFallback(container) {
        if (container.classList.contains('ios-fullscreen')) {
            // Exit fullscreen
            container.classList.remove('ios-fullscreen');
            document.body.style.overflow = '';
        } else {
            // Enter fullscreen
            container.classList.add('ios-fullscreen');
            document.body.style.overflow = 'hidden';
            
            // Scroll to top to hide address bar
            window.scrollTo(0, 1);
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
    showCur8Notification(xpAmount, session = null) {
        console.warn('🎁 SHOWING XP NOTIFICATION:', xpAmount, '- Stack trace:', new Error().stack);
        
        // Try to show notification inside the game iframe first (if game supports it)
        const payload = {
            xp_earned: xpAmount,
            xp_breakdown: session?.xp_breakdown || [],
            extra_data: session?.metadata || session?.extra_data || null
        };
        this.sendMessage('showXPBanner', payload);
        
        // Also show in main page as fallback
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        
        // Build breakdown details if available
        let breakdownHTML = '';
        const sessionData = session?.metadata || session?.extra_data;
        if (session && sessionData) {
            const extraData = typeof sessionData === 'string' 
                ? JSON.parse(sessionData) 
                : sessionData;
            
            if (extraData.xp_breakdown && extraData.xp_breakdown.length > 0) {
                breakdownHTML = '<div class="xp-breakdown">';
                extraData.xp_breakdown.forEach(rule => {
                    const isInactive = rule.xp_earned === 0;
                    breakdownHTML += `
                        <div class="xp-rule ${isInactive ? 'inactive' : ''}">
                            <span class="rule-name">${rule.rule_name}</span>
                            <span class="rule-xp">${isInactive ? '—' : '+' + rule.xp_earned.toFixed(2)}</span>
                        </div>
                    `;
                });
                const multiplier = extraData.user_multiplier || session.user_multiplier;
                if (extraData.base_xp && multiplier && multiplier > 1) {
                    breakdownHTML += `
                        <div class="xp-rule multiplier">
                            <span class="rule-name">CUR8 Multiplier (×${multiplier.toFixed(2)})</span>
                            <span class="rule-xp">×${multiplier.toFixed(2)}</span>
                        </div>
                    `;
                }
                breakdownHTML += '</div>';
            }
        }
        
        notification.innerHTML = `
            <div class="xp-badge">
                <span class="xp-icon">⭐</span>
                <span class="xp-amount">+${xpAmount.toFixed(2)} XP</span>
            </div>
            ${breakdownHTML}
        `;
        // Add styles
        if (!document.getElementById('xp-notification-style')) {
            const style = document.createElement('style');
            style.id = 'xp-notification-style';
            style.textContent = `
            .xp-notification {
                position: fixed !important;
                top: 70px !important;
                right: 20px !important;
                z-index: 2147483647 !important;
                animation: slideInRight 0.5s ease;
                pointer-events: none;
            }
            .xp-notification.hiding {
                animation: slideOutRight 0.5s ease forwards;
            }
            .xp-badge {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .xp-icon {
                font-size: 1.5em;
            }
            .xp-amount {
                font-size: 1.2em;
                font-weight: bold;
                color: #1a1a1a;
            }
            .xp-breakdown {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                padding: 12px;
                margin-top: 8px;
                font-size: 0.85em;
            }
            .xp-rule {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                color: #333;
            }
            .xp-rule.inactive {
                opacity: 0.5;
                color: #999;
            }
            .xp-rule.inactive .rule-xp {
                color: #999;
            }
            .xp-rule.multiplier {
                border-top: 1px solid #ddd;
                margin-top: 4px;
                padding-top: 8px;
                font-weight: bold;
                color: #ff6b35;
            }
            .rule-name {
                flex: 1;
            }
            .rule-xp {
                font-weight: bold;
                color: #ffa500;
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
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after animation
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 10000);
    }

    /**
     * Show level-up notification
     */
    showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone } = levelUpData;

        // Try to show notification inside the game iframe first (if game supports it)
        this.sendMessage('showLevelUpModal', levelUpData);

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';
        modal.innerHTML = `
            <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
                <div class="level-up-animation">
                    <div class="level-up-rays"></div>
                    <div class="level-up-badge-container">
                        <span class="level-up-badge">${badge}</span>
                    </div>
                </div>
                <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
                <div class="level-up-levels">
                    <span class="old-level">${old_level}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">${new_level}</span>
                </div>
                <div class="level-up-new-title">${title}</div>
                ${is_milestone ? '<div class="level-up-milestone-badge">✨ TRAGUARDO ✨</div>' : ''}
                ${coins_awarded > 0 ? `
                    <div class="level-up-reward">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-amount">+${coins_awarded} Coins</span>
                    </div>
                ` : ''}
                <button class="level-up-close">Continua</button>
            </div>
        `;

        // Load level-up styles if not already loaded
        if (!document.querySelector('#level-up-styles')) {
            const link = document.createElement('link');
            link.id = 'level-up-styles';
            link.rel = 'stylesheet';
            link.href = '/css/level-widget.css';
            document.head.appendChild(link);
        }

        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => modal.classList.add('show'), 10);

        // Close handler
        const closeBtn = modal.querySelector('.level-up-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        // Auto-close after 6 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        }, 6000);
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
