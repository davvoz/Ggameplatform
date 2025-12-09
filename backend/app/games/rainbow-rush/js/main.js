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
            // ⚡ FAST: Signal game ready immediately to prevent timeout
            this.signalGameReady();
            
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
            
            // Initialize async components (includes SDK initialization)
            await this.gameController.initialize();

            // Setup Screen Manager event listeners
            this.setupScreenManagerListeners();

            // Setup game event listeners
            this.setupGameListeners();

            // Setup window listeners
            this.setupWindowListeners();
            
            // Setup fullscreen button
            this.setupFullscreenButton();

            // Hide loading screen and show menu
            this.hideLoadingScreen();
            
            // Carica high score dall'SDK e aggiorna il menu
            if (this.gameController?.scoreSystem) {
                await this.gameController.scoreSystem.initHighScore();
                this.screenManager.updateHighScore(this.gameController.scoreSystem.getHighScore());
            }

            this.initialized = true;
            console.log('✅ Rainbow Rush initialized successfully!');
            console.log('🔒 Backend integration:', this.gameController.rainbowRushSDK ? 'ENABLED (Secure)' : 'DISABLED (LocalStorage)');
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError(error.message);
        }
    }

    /**
     * Signal game ready to platform immediately to prevent timeout
     */
    signalGameReady() {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'gameReady',
                gameId: 'rainbow-rush',
                timestamp: Date.now()
            }, '*');
            console.log('⚡ Fast game ready signal sent');
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
        this.screenManager.on('levelSelect', async ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load specific level WITH health reset (from level list)
            const dims = this.gameController.engine.getCanvasDimensions();
            await this.gameController.levelOrchestrator.loadLevel(levelId, dims, true);
            this.gameController.stateMachine.transitionTo('playing', this.gameController._getGameContext());
        });
        
        // Next level from summary (keep health)
        this.screenManager.on('nextLevel', async ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load next level WITHOUT health reset (keep hearts)
            const dims = this.gameController.engine.getCanvasDimensions();
            await this.gameController.levelOrchestrator.loadLevel(levelId, dims, false);
            this.gameController.stateMachine.transitionTo('playing', this.gameController._getGameContext());
        });
        
        // Retry level from summary (reset health)
        this.screenManager.on('retryLevel', async ({ levelId }) => {
            this.gameController.audioManager?.playSound('click');
            this.screenManager.hideAllScreens();
            this.requestFullscreen();
            // Load retry level WITH health reset
            const dims = this.gameController.engine.getCanvasDimensions();
            await this.gameController.levelOrchestrator.loadLevel(levelId, dims, true);
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
        this.screenManager.on('pauseMenu', async () => {
            this.gameController.audioManager?.playSound('click');
            await this.screenManager.showMenu(this.gameController.scoreSystem);
        });
        
        // Restart game
        this.screenManager.on('restart', async () => {
            this.gameController.audioManager?.playSound('click');
            
            // Reset platform session before showing level select
            if (typeof window.PlatformSDK !== 'undefined') {
                // Wait for the reset to complete (includes ending old session and starting new one)
                await window.PlatformSDK.resetSession();
            }
            
            // Force reload progress from backend to show updated levels
            const progress = await this.gameController.levelManager.loadProgress(true);
            this.screenManager.showLevelSelect(progress);
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
        
        // Back to menu event (from various screens)
        this.screenManager.on('backToMenu', async () => {
            if (this.gameController?.audioManager) {
                this.gameController.audioManager.playSound('click');
            }
            await this.screenManager.showMenu(this.gameController?.scoreSystem);
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
        
        window.addEventListener('showMenu', async (e) => {
            if (this.screenManager && this.gameController) {
                await this.screenManager.showMenu(this.gameController.scoreSystem);
                // Non serve più updateHighScore manualmente, showMenu lo fa già
            }
        });
        
        window.addEventListener('showLevelSelect', async () => {
            if (this.screenManager && this.gameController) {
                // Force reload progress from backend to show updated levels
                const progress = await this.gameController.levelManager.loadProgress(true);
                this.screenManager.showLevelSelect(progress);
            }
        });
        
        window.addEventListener('showLevelSummary', (e) => {
            if (this.screenManager) {
                this.screenManager.showLevelSummary(e.detail);
            }
        });
    }
    
    setupFullscreenButton() {
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-button');
        if (exitFullscreenBtn) {
            exitFullscreenBtn.addEventListener('click', () => {
                this.exitFullscreen();
            });
        }
        
        // Mostra/nascondi il bottone in base allo stato fullscreen
        this.updateFullscreenButtonVisibility();
    }
    
    updateFullscreenButtonVisibility() {
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-button');
        if (exitFullscreenBtn) {
            const isFullscreen = document.body.classList.contains('game-fullscreen');
            exitFullscreenBtn.style.display = isFullscreen ? 'inline-block' : 'none';
        }
    }

    /**
     * Show XP earned banner inside the game
     * @param {number} xpAmount - Amount of XP earned
     */
    showXPBanner(xpAmount) {
        console.log('🎁 Showing XP banner inside game:', xpAmount);
        
        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';
        banner.innerHTML = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${xpAmount.toFixed(2)} XP</span>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('game-xp-banner-style')) {
            const style = document.createElement('style');
            style.id = 'game-xp-banner-style';
            style.textContent = `
                .game-xp-banner {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 10000;
                    animation: xpSlideIn 0.5s ease;
                    pointer-events: none;
                }
                .game-xp-banner.hiding {
                    animation: xpSlideOut 0.5s ease forwards;
                }
                .game-xp-badge {
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    padding: 16px 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .game-xp-icon {
                    font-size: 1.5em;
                }
                .game-xp-amount {
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #1a1a1a;
                }
                @keyframes xpSlideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes xpSlideOut {
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
        
        document.body.appendChild(banner);
        
        // Remove after 3.5 seconds
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }

    setupWindowListeners() {
        // Listen for messages from platform (e.g., XP banner requests)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'showXPBanner' && event.data.payload) {
                this.showXPBanner(event.data.payload.xp_earned);
            }
        });
        
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
                        // Rimuovi classe CSS fullscreen
                        document.body.classList.remove('game-fullscreen');
                    }
                    
                    // Aggiorna visibilità bottone
                    this.updateFullscreenButtonVisibility();
                    
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
        
        // Handle page unload - cleanup session if user closes/leaves page
        window.addEventListener('beforeunload', () => {
            if (this.gameController?.rainbowRushSDK?.sessionId) {
                // Use synchronous beacon API for reliable cleanup on page unload
                navigator.sendBeacon(
                    `${this.gameController.rainbowRushSDK.apiBaseUrl}/api/rainbow-rush/session/${this.gameController.rainbowRushSDK.sessionId}/end`,
                    JSON.stringify({})
                );
                console.log('🚪 Session cleanup on page unload');
            }
        });
        
        // Also handle pagehide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (this.gameController?.rainbowRushSDK?.sessionId) {
                navigator.sendBeacon(
                    `${this.gameController.rainbowRushSDK.apiBaseUrl}/api/rainbow-rush/session/${this.gameController.rainbowRushSDK.sessionId}/end`,
                    JSON.stringify({})
                );
                console.log('🚪 Session cleanup on page hide');
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
        // Applica classe CSS per forzare fullscreen
        document.body.classList.add('game-fullscreen');
        
        // Aggiorna visibilità bottone
        this.updateFullscreenButtonVisibility();
        
        // Scroll to top per nascondere la barra degli indirizzi su mobile
        window.scrollTo(0, 0);
        
        // Prova anche l'API fullscreen nativa (funziona su desktop/Android)
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }
    
    exitFullscreen() {
        // Rimuovi classe CSS fullscreen
        document.body.classList.remove('game-fullscreen');
        
        // Aggiorna visibilità bottone
        this.updateFullscreenButtonVisibility();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Esci dal fullscreen nativo se attivo
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
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
