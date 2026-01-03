/**
 * TypeScript Type Definitions for Platform SDK
 * Version: 1.0.0
 */

/**
 * SDK initialization options
 */
export interface SDKInitOptions {
    /**
     * Timeout for platform ready signal in milliseconds
     * @default 5000
     */
    timeout?: number;
}

/**
 * Current SDK state
 */
export interface SDKState {
    /**
     * Current game score
     */
    score: number;
    
    /**
     * Current game level
     */
    level: number;
    
    /**
     * Whether the game is currently paused
     */
    isPaused: boolean;
}

/**
 * Score metadata
 */
export interface ScoreMetadata {
    /**
     * Optional additional data to send with score
     */
    [key: string]: any;
}

/**
 * Game over metadata
 */
export interface GameOverMetadata {
    /**
     * Time played in seconds
     */
    timePlayed?: number;
    
    /**
     * Achievements unlocked
     */
    achievements?: string[];
    
    /**
     * Optional additional data
     */
    [key: string]: any;
}

/**
 * Level completed metadata
 */
export interface LevelCompletedMetadata {
    /**
     * Time to complete level in seconds
     */
    timeToComplete?: number;
    
    /**
     * Stars earned (typically 1-3)
     */
    stars?: number;
    
    /**
     * Whether all collectibles were obtained
     */
    perfectClear?: boolean;
    
    /**
     * Optional additional data
     */
    [key: string]: any;
}

/**
 * Platform event types
 */
export type PlatformEventType = 'start' | 'pause' | 'resume' | 'exit' | 'config';

/**
 * Event callback function
 */
export type EventCallback<T = any> = (payload: T) => void;

/**
 * Platform configuration received from the platform
 */
export interface PlatformConfig {
    /**
     * Game ID assigned by platform
     */
    gameId: string;
    
    /**
     * Platform version
     */
    platformVersion: string;
    
    /**
     * Available platform features
     */
    features?: {
        scoreTracking?: boolean;
        levelTracking?: boolean;
        fullscreen?: boolean;
        [key: string]: any;
    };
    
    /**
     * Optional additional configuration
     */
    [key: string]: any;
}

/**
 * Platform SDK Interface
 */
export interface PlatformSDKInterface {
    /**
     * Initialize the SDK
     * Must be called before using any other SDK methods
     * 
     * @param options - Initialization options
     * @returns Promise that resolves when SDK is ready
     * 
     * @example
     * ```typescript
     * await PlatformSDK.init({ timeout: 10000 });
     * ```
     */
    init(options?: SDKInitOptions): Promise<void>;
    
    /**
     * Send score update to platform
     * 
     * @param score - The current score
     * @param metadata - Optional additional metadata
     * 
     * @example
     * ```typescript
     * PlatformSDK.sendScore(1000);
     * PlatformSDK.sendScore(1000, { combo: 5, multiplier: 2 });
     * ```
     */
    sendScore(score: number, metadata?: ScoreMetadata): void;
    
    /**
     * Send game over event to platform
     * 
     * @param finalScore - The final score
     * @param metadata - Optional additional metadata (time played, achievements, etc.)
     * 
     * @example
     * ```typescript
     * PlatformSDK.gameOver(5000);
     * PlatformSDK.gameOver(5000, {
     *     timePlayed: 180,
     *     achievements: ['first_win', 'speed_demon']
     * });
     * ```
     */
    gameOver(finalScore: number, metadata?: GameOverMetadata): void;
    
    /**
     * Send level completed event to platform
     * 
     * @param level - The completed level number
     * @param metadata - Optional additional metadata (time, stars, etc.)
     * 
     * @example
     * ```typescript
     * PlatformSDK.levelCompleted(5);
     * PlatformSDK.levelCompleted(5, {
     *     timeToComplete: 45,
     *     stars: 3,
     *     perfectClear: true
     * });
     * ```
     */
    levelCompleted(level: number, metadata?: LevelCompletedMetadata): void;
    
    /**
     * Request fullscreen mode from the platform
     * This sends a message to the platform to handle fullscreen
     * 
     * @example
     * ```typescript
     * PlatformSDK.requestFullScreen();
     * ```
     */
    requestFullScreen(): void;
    
    /**
     * Toggle fullscreen mode (works on iOS too!)
     * This is a convenience method that works directly in the game.
     * Use this instead of native requestFullscreen() for iOS compatibility.
     * On iOS Safari, this uses a CSS-based fullscreen workaround since
     * the Fullscreen API is not supported.
     * 
     * @example
     * ```typescript
     * // In your fullscreen button handler:
     * fullscreenButton.addEventListener('click', () => {
     *     PlatformSDK.toggleFullscreen();
     * });
     * ```
     */
    toggleFullscreen(): void;
    
    /**
     * Check if currently in fullscreen mode
     * Returns true for both native fullscreen and iOS CSS fullscreen
     * 
     * @returns true if in fullscreen mode
     * 
     * @example
     * ```typescript
     * if (PlatformSDK.isFullscreen()) {
     *     console.log('Currently in fullscreen');
     * }
     * ```
     */
    isFullscreen(): boolean;
    
    /**
     * Register an event callback
     * Listen for platform events (start, pause, resume, exit, config)
     * 
     * @param eventType - The event type to listen for
     * @param callback - The callback function to execute
     * 
     * @example
     * ```typescript
     * PlatformSDK.on('pause', () => {
     *     game.pause();
     * });
     * 
     * PlatformSDK.on('resume', () => {
     *     game.resume();
     * });
     * 
     * PlatformSDK.on('config', (config) => {
     *     console.log('Platform config:', config);
     * });
     * ```
     */
    on(eventType: PlatformEventType, callback: EventCallback): void;
    
    /**
     * Unregister an event callback
     * 
     * @param eventType - The event type
     * @param callback - The callback function to remove
     * 
     * @example
     * ```typescript
     * const pauseHandler = () => game.pause();
     * PlatformSDK.on('pause', pauseHandler);
     * // Later...
     * PlatformSDK.off('pause', pauseHandler);
     * ```
     */
    off(eventType: PlatformEventType, callback: EventCallback): void;
    
    /**
     * Get current SDK state
     * 
     * @returns Current state object
     * 
     * @example
     * ```typescript
     * const state = PlatformSDK.getState();
     * console.log('Current score:', state.score);
     * console.log('Current level:', state.level);
     * ```
     */
    getState(): SDKState;
    
    /**
     * Check if game is currently paused
     * 
     * @returns true if paused, false otherwise
     * 
     * @example
     * ```typescript
     * if (PlatformSDK.isPaused()) {
     *     // Don't update game logic
     * }
     * ```
     */
    isPaused(): boolean;
    
    /**
     * Send log message to platform
     * Useful for debugging
     * 
     * @param message - Log message
     * @param data - Optional data to log
     * 
     * @example
     * ```typescript
     * PlatformSDK.log('Player spawned', { x: 100, y: 200 });
     * ```
     */
    log(message: string, data?: any): void;
    
    /**
     * SDK version
     */
    readonly version: string;
}

/**
 * Platform SDK Singleton
 */
declare const PlatformSDK: PlatformSDKInterface;

export default PlatformSDK;
