/**
 * GameStateMachine - State Pattern implementation
 * Manages game state transitions with explicit state objects
 * Each state handles its own logic and input
 */

import { IGameState } from '../core/interfaces.js';
import { GameStates } from '../core/GameState.js';

/**
 * Base game state
 */
class BaseGameState extends IGameState {
    constructor(name) {
        super();
        this.name = name;
    }

    getName() {
        return this.name;
    }

    enter(context) {
        console.log(`🎮 Entering state: ${this.name}`);
    }

    exit(context) {
        console.log(`🎮 Exiting state: ${this.name}`);
    }

    update(deltaTime, context) {
        // Default: no update logic
    }

    handleInput(action, data, context) {
        return false;
    }
}

/**
 * Menu state - Initial state before game starts
 */
class MenuState extends BaseGameState {
    constructor() {
        super(GameStates.MENU);
    }

    enter(context) {
        super.enter(context);
        context.audioManager?.playBackgroundMusic();
        context.gameController.showMenu();
    }

    handleInput(action, data, context) {
        if (action === 'start') {
            context.stateMachine.transitionTo(GameStates.LEVEL_SELECT);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.stopBackgroundMusic();
    }
}

/**
 * Level Select state - Player choosing level
 */
class LevelSelectState extends BaseGameState {
    constructor() {
        super(GameStates.LEVEL_SELECT);
    }

    enter(context) {
        super.enter(context);

        // Stop engine - we're in HTML screen mode
        context.engine.stop();

        // Show HTML level select screen
        const event = new CustomEvent('showLevelSelect');
        window.dispatchEvent(event);
    }

    handleInput(action, data, context) {
        if (action === 'selectLevel') {
            const dims = context.engine.getCanvasDimensions();
            // Load level WITH health reset (new game from level select)
            context.levelController.loadLevel(data.levelId, dims, true);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'back') {
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }
}

/**
 * Playing state - Active gameplay
 */
class PlayingState extends BaseGameState {
    constructor() {
        super(GameStates.PLAYING);
    }

    enter(context) {
        super.enter(context);
        context.engine.start();
        context.audioManager?.playBackgroundMusic();
        context.audioManager?.resume();

        // Emit game start event
        const event = new CustomEvent('gameStart');
        window.dispatchEvent(event);
    }

    update(deltaTime, context) {
        // Main game loop handled by GameController
        // State machine just coordinates transitions
    }

    handleInput(action, data, context) {
        if (action === 'pause') {
            context.audioManager?.playSound('pause');
            context.stateMachine.transitionTo(GameStates.PAUSED, context);
            return true;
        } else if (action === 'playerDied') {
            // Death sound già suonato in _startDeathSequence
            context.stateMachine.transitionTo(GameStates.GAME_OVER, context);
            return true;
        } else if (action === 'levelComplete') {
            context.audioManager?.playSound('victory');
            context.stateMachine.transitionTo(GameStates.LEVEL_SUMMARY, context);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.stopBackgroundMusic();
    }
}

/**
 * Paused state - Game paused
 */
class PausedState extends BaseGameState {
    constructor() {
        super(GameStates.PAUSED);
    }

    enter(context) {
        super.enter(context);
        context.engine.stop();
        context.audioManager?.pause();

        // Show pause screen
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.add('active');
        }
    }

    handleInput(action, data, context) {
        if (action === 'resume') {
            context.audioManager?.playSound('resume');
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'quit') {
            context.audioManager?.playSound('click');
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }

    exit(context) {
        super.exit(context);
        context.audioManager?.resume();

        // Hide pause screen
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.remove('active');
        }
    }
}

/**
 * Goal Reached state - Brief animation after touching goal before summary
 */
class GoalReachedState extends BaseGameState {
    constructor() {
        super(GameStates.GOAL_REACHED);
        this.animationDuration = 2.5; // 2.5 seconds celebration animation
        this.elapsed = 0;
    }

    enter(context) {
        super.enter(context);
        this.elapsed = 0;
        this.lastTime = performance.now();
        
        // Freeze player position for animation
        const player = context.player;
        if (player) {
            this.frozenPlayerX = player.x;
            this.frozenPlayerY = player.y;
            // Keep player's current expression from gameplay
            console.log('🎯 Player frozen at:', this.frozenPlayerX, this.frozenPlayerY);
        }
        
        // Stop game physics
        context.engine.stop();
        
        // Start animation loop
        this.animationFrameId = null;
        this.startAnimationLoop(context);
        
        // Play victory sound
        context.audioManager?.playSound('victory');
        
        // Set flag to disable damage/bonus/death processing in GameController
        if (context.gameController) {
            context.gameController.goalReached = true;
        }
        
        // Create celebration particles explosion at player position
        const entityManager = context.entityManager;
        
        // Store victory text that will be rendered following player during zoom
        this.victoryText = {
            text: '🏁 LEVEL COMPLETE! 🏁',
            alpha: 1.0,
            scale: 0.5
        };
        
        if (player && entityManager) {
            // Create clean particle explosion
            for (let i = 0; i < 50; i++) {
                const angle = (Math.PI * 2 * i) / 50;
                const speed = 150 + Math.random() * 80;
                
                // Simple gold particles
                const color = [1.0, 0.9, 0.2, 1.0];
                
                entityManager.addEntity('powerupParticles', {
                    x: player.x + player.width / 2,
                    y: player.y + player.height / 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.5,
                    maxLife: 1.5,
                    size: 4,
                    color: color,
                    gravity: 200,
                    type: 'victory'
                });
            }
        }
        
        console.log('🎯 Goal reached - starting celebration animation');
    }

    startAnimationLoop(context) {
        const animate = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Update animation state
            this.update(deltaTime, context);
            
            // Update particles
            if (context.entityManager) {
                context.entityManager.updateAll(deltaTime, 0, context.player);
            }
            
            // Render frame
            if (context.renderingSystem && context.engine) {
                context.renderingSystem.render(context.engine.gl, context.engine.entities);
                
                // Render victory text centered below player
                this.renderVictoryText(context);
            }
            
            // Continue loop if animation not complete
            if (this.elapsed < this.animationDuration) {
                this.animationFrameId = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    update(deltaTime, context) {
        this.elapsed += deltaTime;
        
        // Calculate fade progress (0 to 1)
        const fadeProgress = Math.min(1, this.elapsed / this.animationDuration);
        
        // Calculate zoom scale - simple and clean
        let zoomScale = 1.0;
        if (this.elapsed < 0.6) {
            // Zoom in from 1.0 to 2.0x over 0.6s
            const t = this.elapsed / 0.6;
            const ease = t * t * (3 - 2 * t);
            zoomScale = 1.0 + ease * 1.0;
        } else if (this.elapsed < 2.0) {
            // Hold at 2.0x
            zoomScale = 2.0;
        } else {
            // Zoom out from 2.0x to 1.0 in last 0.5s
            const t = (this.elapsed - 2.0) / 0.5;
            const ease = 1 - (1 - t) * (1 - t);
            zoomScale = 2.0 - ease * 1.0;
        }
        
        const rotation = 0;
        
        // Wink animation: quick wink at peak zoom
        let winkProgress = 0;
        if (this.elapsed > 1.2 && this.elapsed < 1.4) {
            winkProgress = Math.sin(((this.elapsed - 1.2) / 0.2) * Math.PI);
        } else if (this.elapsed > 1.7 && this.elapsed < 1.9) {
            winkProgress = Math.sin(((this.elapsed - 1.7) / 0.2) * Math.PI);
        }
        
        // Apply zoom directly to player
        const player = context.player;
        if (player && this.frozenPlayerX !== undefined) {
            const canvasCenterX = context.renderingSystem?.canvasWidth / 2 || 400;
            const canvasCenterY = context.renderingSystem?.canvasHeight / 2 || 300;
            
            // Freeze player at original position
            player.x = this.frozenPlayerX;
            player.y = this.frozenPlayerY;
            
            // Don't force expression - let player use its normal game expression
            // player keeps whatever expression it had during gameplay
            
            // Calculate target position (center of canvas)
            const targetX = canvasCenterX - player.width / 2;
            const targetY = canvasCenterY - player.height / 2;
            
            // Interpolate position based on zoom with smooth easing
            const lerpFactor = Math.min(1, (zoomScale - 1) / 1.0);
            const smoothLerp = lerpFactor * lerpFactor * (3 - 2 * lerpFactor);
            player.animatedX = this.frozenPlayerX + (targetX - this.frozenPlayerX) * smoothLerp;
            player.animatedY = this.frozenPlayerY + (targetY - this.frozenPlayerY) * smoothLerp;
            player.animatedScale = zoomScale;
            player.winkProgress = winkProgress;
        }
        
        // Store animation data for rendering in GameController
        if (context.gameController) {
            context.gameController.goalFadeProgress = fadeProgress;
            context.gameController.victoryZoom = {
                scale: zoomScale,
                winkProgress: winkProgress
            };
        }
        
        // Continue spawning particles - simple and clean
        if (fadeProgress < 0.85 && Math.random() < 0.2) {
            const entityManager = context.entityManager;
            
            if (player && entityManager) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 120;
                
                entityManager.addEntity('powerupParticles', {
                    x: player.x + player.width / 2,
                    y: player.y + player.height / 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    maxLife: 1.0,
                    size: 4,
                    color: [1.0, 0.9, 0.2, 1.0],
                    gravity: 50,
                    type: 'victory-sparkle'
                });
            }
        }
        
        // After animation completes, transition to level summary
        if (this.elapsed >= this.animationDuration) {
            context.stateMachine.transitionTo(GameStates.LEVEL_SUMMARY, context);
        }
    }

    renderVictoryText(context) {
        if (!this.victoryText || !context.renderingSystem?.textCtx) return;
        
        const ctx = context.renderingSystem.textCtx;
        const player = context.player;
        
        if (!player) return;
        
        // Use animated position (follows zoom and centering)
        const playerCenterX = (player.animatedX || player.x) + player.width / 2;
        const playerBottomY = (player.animatedY || player.y) + player.height;
        
        // Calculate text position - centered below player
        // Offset scales with zoom to maintain relative position
        const zoomScale = player.animatedScale || 1.0;
        const offsetY = 80 * zoomScale; // Distance below player scales with zoom
        
        const textX = playerCenterX;
        const textY = playerBottomY + offsetY;
        
        // Calculate text scale and alpha based on animation progress
        let textScale = 0.5;
        let alpha = 1.0;
        
        if (this.elapsed < 0.3) {
            // Pop in animation
            const t = this.elapsed / 0.3;
            const ease = t * t * (3 - 2 * t);
            textScale = 0.5 + ease * 0.5;
            alpha = ease;
        } else if (this.elapsed > this.animationDuration - 0.5) {
            // Fade out at the end
            const t = (this.animationDuration - this.elapsed) / 0.5;
            alpha = t;
        }
        
        // Apply zoom to text size
        const baseSize = 48;
        const fontSize = baseSize * textScale * Math.min(1.5, zoomScale * 0.7);
        
        // Render with glow effect
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect disabled for performance
        
        // Stroke (outline)
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.victoryText.text, textX, textY);
        
        // Fill (main color)
        ctx.fillStyle = 'rgba(255, 215, 0, 1.0)';
        ctx.fillText(this.victoryText.text, textX, textY);
        
        ctx.restore();
    }

    hslToRgb(h, s, l) {
        h = h / 360;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const r = this.hueToRgb(p, q, h + 1/3);
        const g = this.hueToRgb(p, q, h);
        const b = this.hueToRgb(p, q, h - 1/3);
        return [r, g, b];
    }
    
    hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    exit(context) {
        super.exit(context);
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Reset player victory state
        if (context.player) {
            // No need to reset expression - player manages its own
        }
        
        if (context.gameController) {
            context.gameController.goalFadeProgress = 0;
            context.gameController.victoryZoom = null;
        }
    }
}

/**
 * Level Summary state - Showing level results
 */
class LevelSummaryState extends BaseGameState {
    constructor() {
        super(GameStates.LEVEL_SUMMARY);
    }

    async enter(context) {
        super.enter(context);
        context.engine.stop();

        // Reset all active effects
        context.powerupSystem.reset();
        context.levelController.resetPlayerEffects();

        // Complete level and calculate stars BEFORE getting summary
        context.levelManager.completeLevel();

        // Get summary data
        const summary = context.levelManager.getLevelSummary();
        summary.score = context.scoreSystem.getScore();

        // Check if this is the final level (game complete)
        const isGameComplete = !summary.nextLevelId;
        
        if (isGameComplete) {
            console.log('🏆 GAME COMPLETE! All 200 levels finished! Ending session...');
            
            // Build comprehensive final stats
            const finalStats = {
                level: context.levelManager.currentLevelId,
                coins: context.scoreSystem.coins || 0,
                score: summary.score,
                time: Date.now(),
                extra_data: {
                    levels_completed: context.levelManager.currentLevelId,
                    total_levels: 200,
                    game_complete: true,
                    coins_collected: context.scoreSystem.collectibles || 0,
                    enemies_defeated: context.scoreSystem?.enemiesDefeated || 0,
                    powerups_collected: context.scoreSystem?.powerupsCollected || 0,
                    highest_combo: context.scoreSystem?.maxCombo || 0
                }
            };
            
            // Show stats banner in game
            if (context.gameController?.showStatsBanner) {
                context.gameController.showStatsBanner({
                    score: summary.score,
                    ...finalStats.extra_data
                });
            }
            
            // Show stats banner with game details (alternative method)
            if (window.rainbowRushApp && typeof window.rainbowRushApp.showStatsBanner === 'function') {
                window.rainbowRushApp.showStatsBanner({
                    score: summary.score,
                    ...finalStats.extra_data
                });
            }
            
            // End game session with final score
            if (context.gameController?.rainbowRushSDK?.sessionId) {
                try {
                    console.log('💾 Saving final session with score:', summary.score);
                    await context.gameController.rainbowRushSDK.endSession(summary.score, finalStats);
                    console.log('✅ Game session ended on game completion');
                } catch (error) {
                    console.error('❌ Failed to end game session:', error);
                }
            }
            
            // Notify platform of game completion
            try {
                if (typeof PlatformSDK !== 'undefined') {
                    console.log('📡 Notifying Platform SDK of game completion');
                    await context.sdkManager.gameOver(summary.score, finalStats);
                }
            } catch (e) {
                console.error('⚠️ Failed to notify platform of game completion:', e);
            }
        } else {
            // Session continues for next level
            console.log('✅ Level completed - session continues for next level');
        }

        // Show HTML level summary screen
        const event = new CustomEvent('showLevelSummary', { detail: summary });
        window.dispatchEvent(event);

        // Play sound based on stars
        if (summary.stars === 3) {
            context.audioManager?.playSound('score');
        } else {
            context.audioManager?.playSound('score');
        }
    }

    handleInput(action, data, context) {
        if (action === 'nextLevel') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.loadNextLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'retryLevel') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.retryLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'backToMenu') {
            context.stateMachine.transitionTo(GameStates.LEVEL_SELECT);
            return true;
        }
        return false;
    }
}

/**
 * Game Over state - Player died
 */
class GameOverState extends BaseGameState {
    constructor() {
        super(GameStates.GAME_OVER);
    }

    async enter(context) {
        super.enter(context);

        // Stop audio
        context.audioManager.stopBackgroundMusic();

        // Submit score
        const stats = context.scoreSystem.getGameStats();
        stats.level = context.levelManager.currentLevelId || 1;
        
        console.log('🎯 [GameOverState] Final stats:', stats);
        console.log('🏆 [GameOverState] Final score:', stats.score);
        
        // IMPORTANT: Send all score data BEFORE resetting anything
        // Store score before any async operations
        const finalScore = stats.score;
        
        // Calculate session duration in seconds
        const durationSeconds = context.gameController?.rainbowRushSDK?.getSessionDuration() || 0;
        
        // Build comprehensive stats for cumulative XP system
        const finalStats = {
            level: stats.level,
            coins: stats.coins,
            score: finalScore,
            time: Date.now(),
            duration_seconds: Math.floor(durationSeconds),  // Add duration at top level
            // Cumulative XP data for backend
            extra_data: {
                levels_completed: context.levelManager.currentLevelId || 1,
                distance: stats.distance || 0,  // Use stats.distance instead of player position
                coins_collected: stats.collectibles || 0,  // Use collectibles from stats
                enemies_defeated: context.scoreSystem?.enemiesDefeated || 0,
                powerups_collected: context.scoreSystem?.powerupsCollected || 0,
                highest_combo: context.scoreSystem?.maxCombo || 0,
                duration_seconds: Math.floor(durationSeconds)  // Include playtime in extra_data too
            }
        };
        
        console.log('📊 [GameOverState] Extra data for XP calculation:', finalStats.extra_data);
        
        // Show stats banner in game
        if (context.gameController?.showStatsBanner) {
            context.gameController.showStatsBanner({
                score: finalScore,
                ...finalStats.extra_data
            });
        }
        
        // End game session WITH SCORE
        if (context.gameController?.rainbowRushSDK?.sessionId) {
            try {
                // Pass final score and stats to endSession
                console.log('💾 [GameOverState] Saving to Rainbow Rush session with score:', finalScore);
                await context.gameController.rainbowRushSDK.endSession(finalScore, finalStats);
                console.log('✅ Game session ended on game over with score:', finalScore);
            } catch (error) {
                console.error('❌ Failed to end game session:', error);
            }
        }
        
        // Submit score to Platform SDK
        try {
            console.log('📤 [GameOverState] Submitting score to Platform SDK:', finalScore);
            await context.sdkManager.submitScore(finalScore);
            console.log('✅ [GameOverState] Score submitted to Platform SDK:', finalScore);
        } catch (error) {
            console.error('❌ [GameOverState] Error submitting score:', error);
        }
        
        // Send gameOver to Platform SDK  
        try {
            if (typeof PlatformSDK !== 'undefined') {
                console.log('📡 [GameOverState] Sending gameOver to Platform SDK with score:', finalScore);
                await context.sdkManager.gameOver(finalScore, finalStats);
                console.log(`✅ Game over sent to SDK: score=${finalScore}`);
            }
        } catch (e) {
            console.error('⚠️ Failed to send game over to SDK:', e);
        }

        // Show stats banner with game details
        if (window.rainbowRushApp && typeof window.rainbowRushApp.showStatsBanner === 'function') {
            window.rainbowRushApp.showStatsBanner({
                score: finalScore,
                ...finalStats.extra_data
            });
        }

        // NOW it's safe to reset score after all SDK calls are done
        context.scoreSystem.fullReset();

        // Emit game over event with the ORIGINAL stats (before reset)
        const event = new CustomEvent('gameOver', { detail: stats });
        window.dispatchEvent(event);
    }

    handleInput(action, data, context) {
        if (action === 'retry') {
            const dims = context.engine.getCanvasDimensions();
            context.levelController.retryLevel(dims);
            context.stateMachine.transitionTo(GameStates.PLAYING, context);
            return true;
        } else if (action === 'menu') {
            context.stateMachine.transitionTo(GameStates.MENU, context);
            return true;
        }
        return false;
    }
}

/**
 * GameStateMachine - Manages state transitions
 */
export class GameStateMachine {
    constructor() {
        /** @type {Map<string, IGameState>} */
        this.states = new Map();

        /** @type {IGameState} */
        this.currentState = null;

        /** @type {string} */
        this.currentStateName = null;

        this._registerStates();
    }

    /**
     * Register all available states
     * @private
     */
    _registerStates() {
        this.registerState(new MenuState());
        this.registerState(new LevelSelectState());
        this.registerState(new PlayingState());
        this.registerState(new PausedState());
        this.registerState(new GoalReachedState());
        this.registerState(new LevelSummaryState());
        this.registerState(new GameOverState());
    }

    /**
     * Register a state
     * @param {IGameState} state
     */
    registerState(state) {
        this.states.set(state.getName(), state);
    }

    /**
     * Transition to new state
     * @param {string} stateName - Target state name
     * @param {Object} context - Game context
     */
    transitionTo(stateName, context) {
        const newState = this.states.get(stateName);

        if (!newState) {
            console.error(`State '${stateName}' not found`);
            return;
        }

        // Exit current state
        if (this.currentState) {
            this.currentState.exit(context);
        }

        // Enter new state
        this.currentState = newState;
        this.currentStateName = stateName;
        this.currentState.enter(context);
    }

    /**
     * Update current state
     * @param {number} deltaTime
     * @param {Object} context
     */
    update(deltaTime, context) {
        if (this.currentState) {
            this.currentState.update(deltaTime, context);
        }
    }

    /**
     * Handle input in current state
     * @param {string} action - Input action
     * @param {*} data - Input data
     * @param {Object} context - Game context
     * @returns {boolean} - True if input was handled
     */
    handleInput(action, data, context) {
        if (this.currentState) {
            return this.currentState.handleInput(action, data, {
                ...context,
                stateMachine: this
            });
        }
        return false;
    }

    /**
     * Get current state name
     * @returns {string}
     */
    getCurrentStateName() {
        return this.currentStateName;
    }

    /**
     * Check if in specific state
     * @param {string} stateName
     * @returns {boolean}
     */
    isInState(stateName) {
        return this.currentStateName === stateName;
    }

    /**
     * Check if currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentStateName === GameStates.PLAYING;
    }

    /**
     * Check if currently paused
     * @returns {boolean}
     */
    isPaused() {
        return this.currentStateName === GameStates.PAUSED;
    }

    /**
     * Get all registered state names
     * @returns {string[]}
     */
    getStateNames() {
        return Array.from(this.states.keys());
    }
}

// Add LEVEL_SELECT and LEVEL_SUMMARY to GameStates if not present
if (!GameStates.LEVEL_SELECT) {
    GameStates.LEVEL_SELECT = 'LEVEL_SELECT';
}
if (!GameStates.LEVEL_SUMMARY) {
    GameStates.LEVEL_SUMMARY = 'LEVEL_SUMMARY';
}
