/**
 * Platform SDK - Integration Library for Game Developers
 * Version: 1.0.0
 * 
 * A universal, framework-agnostic SDK for integrating games with the HTML5 Game Platform.
 * Works with Phaser, Unity WebGL, Godot, Three.js, Vanilla JS, and any other web-based game framework.
 * 
 * Usage:
 *   import PlatformSDK from './platformsdk.js';
 *   
 *   PlatformSDK.init();
 *   PlatformSDK.sendScore(100);
 *   PlatformSDK.on('pause', () => { /* pause game logic *\/ });
 */

(function (global, factory) {
    // UMD pattern - supports CommonJS, AMD, and browser globals
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.PlatformSDK = factory());
})(this, (function () {
    'use strict';

    const PROTOCOL_VERSION = '1.0.0';
    
    /**
     * Platform SDK Class
     */
    class PlatformSDK {
        constructor() {
            this.isInitialized = false;
            this.isPlatformReady = false;
            this.eventCallbacks = new Map();
            this.messageQueue = [];
            this.config = null;
            this.state = {
                score: 0,
                level: 1,
                isPaused: false
            };
            
            // Bind message handler
            this.boundMessageHandler = this.handlePlatformMessage.bind(this);
        }
        
        /**
         * Initialize the SDK
         * @param {Object} options - Configuration options
         * @returns {Promise<void>}
         */
        async init(options = {}) {
            if (this.isInitialized) {
                console.warn('[PlatformSDK] Already initialized');
                return;
            }
            
            this.log('Initializing Platform SDK...');
            
            // Check if running in iframe
            if (window.self === window.top) {
                console.warn('[PlatformSDK] Not running in iframe - platform features may not be available');
            }
            
            // Support legacy callback style (onPause, onResume, onExit, onStart)
            if (options.onPause) {
                this.on('pause', options.onPause);
            }
            if (options.onResume) {
                this.on('resume', options.onResume);
            }
            if (options.onExit) {
                this.on('exit', options.onExit);
            }
            if (options.onStart) {
                this.on('start', options.onStart);
            }
            
            // Listen for messages from platform
            window.addEventListener('message', this.boundMessageHandler);
            
            this.isInitialized = true;
            
            // Send ready signal to platform
            this.sendReady();
            
            this.log('Platform SDK initialized successfully');
            
            // Wait for platform config (with timeout)
            return this.waitForPlatform(options.timeout || 5000);
        }
        
        /**
         * Wait for platform to be ready
         * @param {number} timeout - Timeout in milliseconds
         * @returns {Promise<void>}
         */
        waitForPlatform(timeout) {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    if (!this.isPlatformReady) {
                        console.warn('[PlatformSDK] Platform ready timeout');
                        resolve(); // Don't reject, just continue
                    }
                }, timeout);
                
                // Listen for config message
                const checkReady = () => {
                    if (this.isPlatformReady) {
                        clearTimeout(timeoutId);
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                
                checkReady();
            });
        }
        
        /**
         * Handle incoming messages from platform
         * @param {MessageEvent} event - The message event
         */
        handlePlatformMessage(event) {
            const message = event.data;
            
            // Validate message format
            if (!this.isValidMessage(message)) {
                return;
            }
            
            this.log('Received platform message:', message);
            
            // Handle message based on type
            switch (message.type) {
                case 'config':
                    this.handleConfig(message.payload);
                    break;
                
                case 'start':
                    this.handleStart(message.payload);
                    break;
                
                case 'pause':
                    this.handlePause(message.payload);
                    break;
                
                case 'resume':
                    this.handleResume(message.payload);
                    break;
                
                case 'exit':
                    this.handleExit(message.payload);
                    break;
                
                case 'showXPBanner':
                    // Forward to custom handler if game has implemented it
                    this.triggerEvent('showXPBanner', message.payload);
                    // If any in-game handler exists, notify parent that game handled the banner
                    try {
                        const hasHandler = this.eventCallbacks.has('showXPBanner') && this.eventCallbacks.get('showXPBanner').length > 0;
                        if (hasHandler && window.parent && window.parent !== window.self) {
                            window.parent.postMessage({
                                type: 'handled_showXPBanner',
                                payload: { _messageId: message.payload?._messageId || null },
                                timestamp: Date.now(),
                                protocolVersion: PROTOCOL_VERSION
                            }, '*');
                        }
                    } catch (err) {
                        this.log('Error sending handled ack to parent:', err);
                    }
                    break;
                case 'showLevelUpModal':
                    // Forward to custom handler if game has implemented it
                    this.triggerEvent('showLevelUpModal', message.payload);
                    // Notify parent if handled in-game
                    try {
                        const hasHandler2 = this.eventCallbacks.has('showLevelUpModal') && this.eventCallbacks.get('showLevelUpModal').length > 0;
                        if (hasHandler2 && window.parent && window.parent !== window.self) {
                            window.parent.postMessage({
                                type: 'handled_showLevelUpModal',
                                payload: { _messageId: message.payload?._messageId || null },
                                timestamp: Date.now(),
                                protocolVersion: PROTOCOL_VERSION
                            }, '*');
                        }
                    } catch (err) {
                        this.log('Error sending handled ack to parent:', err);
                    }
                    break;
                
                default:
                    this.log('Unknown message type:', message.type);
            }
            
            // Trigger registered callbacks
            this.triggerEvent(message.type, message.payload);
        }
        
        /**
         * Validate message format
         * @param {*} message - The message to validate
         * @returns {boolean}
         */
        isValidMessage(message) {
            return message && 
                   typeof message === 'object' && 
                   typeof message.type === 'string' &&
                   message.protocolVersion === PROTOCOL_VERSION;
        }
        
        /**
         * Handle platform config
         * @param {Object} config - Platform configuration
         */
        handleConfig(config) {
            this.config = config;
            this.isPlatformReady = true;
            this.log('Platform ready with config:', config);
            
            // Store config globally for RainbowRushSDK access
            window.platformConfig = config;
            
            // Process queued messages
            this.processMessageQueue();
        }
        
        /**
         * Handle start event
         * @param {Object} payload - Event payload
         */
        handleStart(payload) {
            this.log('Game start signal received');
        }
        
        /**
         * Handle pause event
         * @param {Object} payload - Event payload
         */
        handlePause(payload) {
            this.state.isPaused = true;
            this.log('Game pause signal received');
        }
        
        /**
         * Handle resume event
         * @param {Object} payload - Event payload
         */
        handleResume(payload) {
            this.state.isPaused = false;
            this.log('Game resume signal received');
        }
        
        /**
         * Handle exit event
         * @param {Object} payload - Event payload
         */
        handleExit(payload) {
            this.log('Game exit signal received');
            this.cleanup();
        }
        
        /**
         * Send ready signal to platform
         */
        sendReady() {
            this.sendToPlatform('ready', {
                sdkVersion: PROTOCOL_VERSION,
                timestamp: Date.now()
            });
        }
        
        /**
         * Send score update to platform
         * @param {number} score - The current score
         * @param {Object} metadata - Optional additional metadata
         */
        sendScore(score, metadata = {}) {
            if (typeof score !== 'number') {
                console.error('[PlatformSDK] Score must be a number');
                return;
            }
            
            this.state.score = score;
            
            this.sendToPlatform('scoreUpdate', {
                score,
                ...metadata,
                timestamp: Date.now()
            });
        }
        
        /**
         * Send game over event to platform
         * @param {number} finalScore - The final score
         * @param {Object} metadata - Optional additional metadata (stats, achievements, etc.)
         *                            Can include extra_data for cumulative XP system:
         *                            - levels_completed: number
         *                            - distance: number
         *                            - coins_collected: number
         *                            - powerups_collected: number
         *                            - enemies_defeated: number
         */
        gameOver(finalScore, metadata = {}) {
            if (typeof finalScore !== 'number') {
                console.error('[PlatformSDK] Final score must be a number');
                return;
            }
            
            this.state.score = finalScore;
            
            // Extract extra_data if provided
            const extra_data = metadata.extra_data || metadata;
            
            this.sendToPlatform('gameOver', {
                score: finalScore,
                extra_data,
                timestamp: Date.now()
            });
        }
        
        /**
         * Send level completed event to platform
         * @param {number} level - The completed level number
         * @param {Object} metadata - Optional additional metadata (time, stars, etc.)
         */
        levelCompleted(level, metadata = {}) {
            if (typeof level !== 'number') {
                console.error('[PlatformSDK] Level must be a number');
                return;
            }
            
            this.state.level = level;
            
            this.sendToPlatform('levelCompleted', {
                level,
                ...metadata,
                timestamp: Date.now()
            });
        }
        
        /**
         * Request fullscreen mode (via platform)
         * This sends a message to the platform to handle fullscreen
         */
        requestFullScreen() {
            this.sendToPlatform('requestFullScreen', {
                timestamp: Date.now()
            });
        }
        
        /**
         * Toggle fullscreen mode (works on iOS too!)
         * This is a convenience method that works directly in the game
         * Use this instead of native requestFullscreen() for iOS compatibility
         */
        toggleFullscreen() {
            // Check if we're in an iframe (platform context)
            if (window.self !== window.top) {
                // In iframe - request via platform for best iOS support
                this.requestFullScreen();
                return;
            }
            
            // Standalone mode - handle directly
            const elem = document.documentElement;
            
            // iOS/iPadOS detection
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
            const fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
            
            if ((isIOS || isIPadOS) && !fullscreenSupported) {
                // iOS doesn't support Fullscreen API - use CSS workaround
                this.toggleIOSFullscreen();
            } else {
                // Standard fullscreen API
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    // Enter fullscreen
                    if (elem.requestFullscreen) {
                        elem.requestFullscreen();
                    } else if (elem.webkitRequestFullscreen) {
                        elem.webkitRequestFullscreen();
                    } else if (elem.msRequestFullscreen) {
                        elem.msRequestFullscreen();
                    } else {
                        // Fallback to iOS method
                        this.toggleIOSFullscreen();
                    }
                } else {
                    // Exit fullscreen
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            }
        }
        
        /**
         * iOS fullscreen toggle using CSS (since iOS doesn't support Fullscreen API)
         */
        toggleIOSFullscreen() {
            const isFullscreen = document.body.classList.contains('ios-game-fullscreen');
            
            if (isFullscreen) {
                // Exit fullscreen
                document.body.classList.remove('ios-game-fullscreen');
                document.body.style.overflow = '';
                
                // Remove exit button
                const exitBtn = document.getElementById('ios-fs-exit');
                if (exitBtn) exitBtn.remove();
                
                this.log('Exited iOS fullscreen');
            } else {
                // Enter fullscreen
                document.body.classList.add('ios-game-fullscreen');
                document.body.style.overflow = 'hidden';
                
                // Add styles if not present
                this.injectIOSFullscreenStyles();
                
                // Create exit button
                this.createIOSExitButton();
                
                // Try to hide Safari address bar
                setTimeout(() => window.scrollTo(0, 1), 100);
                
                this.log('Entered iOS fullscreen');
            }
        }
        
        /**
         * Inject iOS fullscreen CSS styles
         */
        injectIOSFullscreenStyles() {
            if (document.getElementById('ios-fullscreen-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'ios-fullscreen-styles';
            style.textContent = `
                .ios-game-fullscreen {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                    overflow: hidden !important;
                    z-index: 999999 !important;
                }
                .ios-game-fullscreen > * {
                    width: 100% !important;
                    height: 100% !important;
                }
                .ios-game-fullscreen canvas {
                    width: 100vw !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                }
                #ios-fs-exit {
                    position: fixed !important;
                    top: max(10px, env(safe-area-inset-top)) !important;
                    right: max(10px, env(safe-area-inset-right)) !important;
                    z-index: 9999999 !important;
                    background: rgba(0,0,0,0.7) !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 50% !important;
                    width: 44px !important;
                    height: 44px !important;
                    font-size: 24px !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    -webkit-tap-highlight-color: transparent;
                }
            `;
            document.head.appendChild(style);
        }
        
        /**
         * Create iOS fullscreen exit button
         */
        createIOSExitButton() {
            if (document.getElementById('ios-fs-exit')) return;
            
            const btn = document.createElement('button');
            btn.id = 'ios-fs-exit';
            btn.innerHTML = '✕';
            btn.setAttribute('aria-label', 'Exit fullscreen');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleIOSFullscreen();
            });
            document.body.appendChild(btn);
        }
        
        /**
         * Check if currently in fullscreen mode
         */
        isFullscreen() {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                return true;
            }
            // Check iOS CSS fullscreen
            return document.body.classList.contains('ios-game-fullscreen');
        }
        
        /**
         * Send log message to platform
         * @param {string} message - Log message
         * @param {*} data - Optional data to log
         */
        log(message, data = null) {
            if (window.self === window.top) {
                // Not in iframe, use console directly
                console.log('[PlatformSDK]', message, data || '');
            } else {
                // Send to platform
                this.sendToPlatform('log', {
                    message,
                    data,
                    timestamp: Date.now()
                });
            }
        }
        
        /**
         * Register an event callback
         * @param {string} eventType - The event type (start, pause, resume, exit, config)
         * @param {Function} callback - The callback function
         */
        on(eventType, callback) {
            if (typeof callback !== 'function') {
                console.error('[PlatformSDK] Callback must be a function');
                return;
            }
            
            if (!this.eventCallbacks.has(eventType)) {
                this.eventCallbacks.set(eventType, []);
            }
            
            this.eventCallbacks.get(eventType).push(callback);
        }
        
        /**
         * Unregister an event callback
         * @param {string} eventType - The event type
         * @param {Function} callback - The callback function to remove
         */
        off(eventType, callback) {
            if (!this.eventCallbacks.has(eventType)) return;
            
            const callbacks = this.eventCallbacks.get(eventType);
            const index = callbacks.indexOf(callback);
            
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
        
        /**
         * Trigger event callbacks
         * @param {string} eventType - The event type
         * @param {*} data - The event data
         */
        triggerEvent(eventType, data) {
            if (!this.eventCallbacks.has(eventType)) return;
            
            const callbacks = this.eventCallbacks.get(eventType);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[PlatformSDK] Error in event callback:', error);
                }
            });
        }
        
        /**
         * Send message to platform
         * @param {string} type - Message type
         * @param {Object} payload - Message payload
         */
        sendToPlatform(type, payload = {}) {
            const message = {
                type,
                payload,
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION
            };
            
            // Queue message if platform is not ready (except for 'ready' message)
            if (!this.isPlatformReady && type !== 'ready') {
                this.messageQueue.push(message);
                return;
            }
            
            // Send to parent window
            if (window.parent && window.parent !== window.self) {
                window.parent.postMessage(message, '*');
            }
            console.log('[PlatformSDK] Sent message to platform:', message);
        }
        
        /**
         * Process queued messages
         */
        processMessageQueue() {
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                window.parent.postMessage(message, '*');
            }
        }
        
        /**
         * Get current SDK state
         * @returns {Object} Current state
         */
        getState() {
            return { ...this.state };
        }
        
        /**
         * Check if game is paused
         * @returns {boolean}
         */
        isPaused() {
            return this.state.isPaused;
        }
        
        /**
         * Reset session for game restart
         * Notifies the platform that the game is restarting
         * Returns a promise that resolves when the reset is complete
         */
        async resetSession() {
            this.log('Resetting session for restart');
            
            // Send reset message to platform
            this.sendToPlatform('resetSession', {
                timestamp: Date.now()
            });
            
            // Wait for the platform to process (give it time to end session and start new one)
            return new Promise(resolve => {
                setTimeout(resolve, 1000);
            });
        }
        
        /**
         * Cleanup SDK resources
         */
        cleanup() {
            window.removeEventListener('message', this.boundMessageHandler);
            this.eventCallbacks.clear();
            this.messageQueue = [];
            this.isInitialized = false;
            this.isPlatformReady = false;
            this.log('SDK cleaned up');
        }
    }
    
    // Create singleton instance
    const sdk = new PlatformSDK();
    
    // Export as ES module default and as properties
    return {
        init: (options) => sdk.init(options),
        sendScore: (score, metadata) => sdk.sendScore(score, metadata),
        gameOver: (finalScore, metadata) => sdk.gameOver(finalScore, metadata),
        levelCompleted: (level, metadata) => sdk.levelCompleted(level, metadata),
        requestFullScreen: () => sdk.requestFullScreen(),
        toggleFullscreen: () => sdk.toggleFullscreen(),
        isFullscreen: () => sdk.isFullscreen(),
        resetSession: () => sdk.resetSession(),
        on: (eventType, callback) => sdk.on(eventType, callback),
        off: (eventType, callback) => sdk.off(eventType, callback),
        getState: () => sdk.getState(),
        isPaused: () => sdk.isPaused(),
        log: (message, data) => sdk.log(message, data),
        
        // Version info
        version: PROTOCOL_VERSION,
        
        // Access to SDK instance (advanced usage)
        _instance: sdk
    };
}));
