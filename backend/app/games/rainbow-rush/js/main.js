/**
 * Main entry point for Rainbow Rush
 * Initializes the game and manages UI interactions
 */
import { createGameController } from './GameControllerBuilder.js';
import { ScreenManager } from './ui/ScreenManager.js';

class RainbowRushApp {
    constructor() {
        this.gameController = null;
        this.screenManager = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize Screen Manager first
            this.screenManager = new ScreenManager();
            console.log('✅ ScreenManager initialized');
            
            // Get canvas element
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            // Create game controller with builder pattern (DI)
            this.gameController = createGameController(canvas).build();
            
            // Initialize async components
            await this.gameController.initialize();

            // Setup Screen Manager event listeners
            this.setupScreenManagerListeners();

            // Setup game event listeners
            this.setupGameListeners();

            // Setup window listeners
            this.setupWindowListeners();

            // Hide loading screen and show menu
            this.hideLoadingScreen();

            this.initialized = true;
            console.log('✅ Rainbow Rush initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError(error.message);
        }
    }

    setupScreenManagerListeners() {
        // Start game from menu
        this.screenManager.on('startGame', () => {
            this.gameController.audioManager?.playSound('click');
            this.requestFullscreen();
            this.gameController.startGame();
        });
        
        // Level select from level select screen (reset health)
        this.screenManager.on('levelSelect', ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load specific level WITH health reset (from level list)
            const dims = this.gameController.engine.getCanvasDimensions();
            this.gameController.levelOrchestrator.loadLevel(levelId, dims, true);
            this.gameController.stateMachine.transitionTo('playing', this.gameController._getGameContext());
        });
        
        // Next level from summary (keep health)
        this.screenManager.on('nextLevel', ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load next level WITHOUT health reset (keep hearts)
            const dims = this.gameController.engine.getCanvasDimensions();
            this.gameController.levelOrchestrator.loadLevel(levelId, dims, false);
            this.gameController.stateMachine.transitionTo('playing', this.gameController._getGameContext());
        });
        
        // Retry level from summary (reset health)
        this.screenManager.on('retryLevel', ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load retry level WITH health reset
            const dims = this.gameController.engine.getCanvasDimensions();
            this.gameController.levelOrchestrator.loadLevel(levelId, dims, true);
            this.gameController.stateMachine.transitionTo('playing', this.gameController._getGameContext());
        });
        
        // Resume from pause
        this.screenManager.on('resume', () => {
            this.gameController.audioManager?.playSound('resume');
            // Se necessita di ripristinare fullscreen, lo fa prima di resumare
            if (this.gameController.needsFullscreenRestore) {
                this.requestFullscreen();
                this.gameController.needsFullscreenRestore = false;
            }
            this.gameController.resumeGame();
            this.screenManager.hideAllScreens();
        });
        
        // Pause menu - return to main menu
        this.screenManager.on('pauseMenu', () => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.showMenu();
        });
        
        // Restart game
        this.screenManager.on('restart', () => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.showLevelSelect(this.getLevelProgress());
        });
        
        // Volume changes
        this.screenManager.on('sfxVolumeChange', ({ volume }) => {
            if (this.gameController?.audioManager) {
                this.gameController.audioManager.setVolume(volume);
            }
        });
        
        this.screenManager.on('musicVolumeChange', ({ volume }) => {
            if (this.gameController?.audioManager) {
                this.gameController.audioManager.setMusicVolume(volume);
            }
        });
    }
    
    getLevelProgress() {
        // Usa il metodo getSavedProgress() che usa la cache
        if (this.gameController && this.gameController.levelManager) {
            return this.gameController.levelManager.getSavedProgress();
        }
        return {};
    }

    setupGameListeners() {
        // Listen for game events
        window.addEventListener('gameUpdate', (e) => {
            if (this.screenManager) {
                this.screenManager.updateHighScore(e.detail.highScore);
            }
        });
        
        window.addEventListener('gameOver', (e) => {
            if (this.screenManager) {
                this.screenManager.showGameOver(e.detail);
            }
        });
        
        window.addEventListener('gameStart', () => {
            if (this.screenManager) {
                this.screenManager.hideAllScreens();
            }
        });
        
        window.addEventListener('showMenu', (e) => {
            if (this.screenManager) {
                this.screenManager.showMenu();
                if (e.detail?.highScore) {
                    this.screenManager.updateHighScore(e.detail.highScore);
                }
            }
        });
        
        window.addEventListener('showLevelSelect', () => {
            if (this.screenManager && this.gameController) {
                const progress = this.gameController.levelManager.getSavedProgress();
                this.screenManager.showLevelSelect(progress);
            }
        });
        
        window.addEventListener('showLevelSummary', (e) => {
            if (this.screenManager) {
                this.screenManager.showLevelSummary(e.detail);
            }
        });
    }

    setupWindowListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
           
        });

        // Handle fullscreen changes (entrata/uscita fullscreen)
        const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, () => {
                if (this.gameController) {
                    const isFullscreen = !!(document.fullscreenElement || 
                                           document.webkitFullscreenElement || 
                                           document.mozFullScreenElement || 
                                           document.msFullscreenElement);
                    
                    // Se utente esce dal fullscreen E il gioco sta giocando (non già in pausa)
                    if (!isFullscreen && this.gameController.stateMachine.isPlaying()) {
                        // Utente è uscito dal fullscreen mentre giocava - pausa automatica
                        console.log('🔒 Fullscreen exited - auto pause');
                        this.gameController.pauseGame();
                        this.gameController.needsFullscreenRestore = true;
                        this.gameController.autoPausedFullscreen = true;
                    }
                    
                    // Forza resize quando cambia lo stato fullscreen
                    setTimeout(() => {
                        this.gameController.handleResize();
                    }, 100);
                }
            });
        });

        // Handle visibility change (pause when tab hidden, resume when visible)
        document.addEventListener('visibilitychange', () => {
            if (!this.gameController) return;
            
            if (document.hidden) {
                // Tab nascosta - metti in pausa solo se sta giocando
                if (this.gameController.stateMachine.isPlaying()) {
                    this.gameController.pauseGame();
                    // Segna che è stata messa in pausa automaticamente
                    this.gameController.autoPaused = true;
                }
            } else {
                // Tab visibile - riprendi solo se era stata pausata automaticamente
                if (this.gameController.stateMachine.isPaused() && this.gameController.autoPaused) {
                    this.gameController.resumeGame();
                    this.gameController.autoPaused = false;
                }
            }
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.remove('active');
            }, 500);
        }
    }

    startGame() {
        if (this.gameController) {
            // Entra in fullscreen prima di iniziare
            this.requestFullscreen();
            this.gameController.startGame();
        }
    }

    togglePause() {
        if (!this.gameController) return;

        const pauseButton = document.getElementById('pause-button');
        if (this.gameController.stateMachine.isPaused()) {
            this.gameController.resumeGame();
            if (pauseButton) {
                pauseButton.textContent = '⏸️';
            }
        } else if (this.gameController.stateMachine.isPlaying()) {
            this.gameController.pauseGame();
            if (pauseButton) {
                pauseButton.textContent = '▶️';
            }
        }
    }
    
    showPauseMenu() {
        if (this.gameController && this.gameController.stateMachine.isPlaying()) {
            this.gameController.pauseGame();
            const pauseScreen = document.getElementById('pause-screen');
            if (pauseScreen) {
                pauseScreen.classList.add('active');
            }
        }
    }
    
    resumeGame() {
        if (this.gameController) {
            // Se necessita di ripristinare fullscreen, lo fa prima di resumare
            if (this.gameController.needsFullscreenRestore) {
                this.requestFullscreen();
                this.gameController.needsFullscreenRestore = false;
                this.gameController.autoPausedFullscreen = false;
            }
            
            this.gameController.resumeGame();
            const pauseScreen = document.getElementById('pause-screen');
            if (pauseScreen) {
                pauseScreen.classList.remove('active');
            }
        }
    }
    
    updateSFXVolume(value) {
        const volume = value / 100;
        if (this.gameController && this.gameController.audioManager) {
            this.gameController.audioManager.setVolume(volume);
        }
        const valueDisplay = document.querySelector('#sfx-volume + .volume-value');
        if (valueDisplay) {
            valueDisplay.textContent = `${value}%`;
        }
    }
    
    updateMusicVolume(value) {
        const volume = value / 100;
        if (this.gameController && this.gameController.audioManager) {
            this.gameController.audioManager.setMusicVolume(volume);
        }
        const valueDisplay = document.querySelector('#music-volume + .volume-value');
        if (valueDisplay) {
            valueDisplay.textContent = `${value}%`;
        }
    }

    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-content">
                    <h2 style="color: #ff6b6b;">Error</h2>
                    <p>${message}</p>
                    <button class="game-button" onclick="location.reload()">Reload</button>
                </div>
            `;
        }
    }

    requestFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.warn('Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }
    }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new RainbowRushApp();
        app.init();
    });
} else {
    const app = new RainbowRushApp();
    app.init();
}

export default RainbowRushApp;
