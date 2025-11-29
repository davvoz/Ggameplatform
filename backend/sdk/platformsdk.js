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
         */
        gameOver(finalScore, metadata = {}) {
            if (typeof finalScore !== 'number') {
                console.error('[PlatformSDK] Final score must be a number');
                return;
            }
            
            this.state.score = finalScore;
            
            this.sendToPlatform('gameOver', {
                score: finalScore,
                ...metadata,
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
         * Request fullscreen mode
         */
        requestFullScreen() {
            this.sendToPlatform('requestFullScreen', {
                timestamp: Date.now()
            });
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
