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
            
            // Aggiorna il debug panel con le info utente
            this.screenManager.updateDebugPanel(this.gameController?.rainbowRushSDK);

            this.initialized = true;


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
            await this.screenManager.showMenu(this.gameController.scoreSystem, this.gameController.rainbowRushSDK);
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
            await this.screenManager.showMenu(this.gameController?.scoreSystem, this.gameController?.rainbowRushSDK);
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
                await this.screenManager.showMenu(this.gameController.scoreSystem, this.gameController?.rainbowRushSDK);
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
     * Show game statistics banner inside the game
     * @param {object} stats - Game statistics to display
     */
    showStatsBanner(stats) {

        
        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'game-stats-banner';
        
        const statsHTML = `
            <button class="stats-close-btn" aria-label="Close">✕</button>
            <div class="stats-header">
                <span class="stats-icon">🎮</span>
                <span class="stats-title">Game Statistics</span>
            </div>
            <div class="stats-xp-info">
                <div class="stats-xp-title">💡 How your stats earn XP:</div>
            </div>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">🎯 Score</span>
                        <span class="stat-value">${stats.score?.toLocaleString() || 0}</span>
                    </div>
                    <div class="stat-xp-contribution">Score × 0.008 multiplier = XP</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">🌈 Levels</span>
                        <span class="stat-value">${stats.levels_completed || 0}</span>
                    </div>
                    <div class="stat-xp-contribution">Cumulative bonus per level completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">📏 Distance</span>
                        <span class="stat-value">${stats.distance ? Math.floor(stats.distance) + 'm' : '0m'}</span>
                    </div>
                    <div class="stat-xp-contribution">+5 XP every 500m milestone</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">⏱️ Time</span>
                        <span class="stat-value">${stats.duration_seconds ? Math.floor(stats.duration_seconds / 60) + ':' + (stats.duration_seconds % 60).toString().padStart(2, '0') : '0:00'}</span>
                    </div>
                    <div class="stat-xp-contribution">Minutes × 1.5 XP bonus</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">🪙 Coins</span>
                        <span class="stat-value">${stats.coins_collected || 0}</span>
                    </div>
                    <div class="stat-xp-contribution">Boosts score → multiplied into XP</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">💥 Enemies</span>
                        <span class="stat-value">${stats.enemies_defeated || 0}</span>
                    </div>
                    <div class="stat-xp-contribution">Affects score calculation</div>
                </div>
                <div class="stat-item">
                    <div class="stat-main">
                        <span class="stat-label">⚡ Powerups</span>
                        <span class="stat-value">${stats.powerups_collected || 0}</span>
                    </div>
                    <div class="stat-xp-contribution">Helps boost performance</div>
                </div>
                ${stats.highest_combo > 0 ? `
                <div class="stat-item highlight">
                    <div class="stat-main">
                        <span class="stat-label">🔥 Best Combo</span>
                        <span class="stat-value">${stats.highest_combo}×</span>
                    </div>
                    <div class="stat-xp-contribution">Combo multiplier on score</div>
                </div>
                ` : ''}
            </div>
        `;
        
        banner.innerHTML = statsHTML;
        
        // Add close button handler
        const closeBtn = banner.querySelector('.stats-close-btn');
        closeBtn.addEventListener('click', () => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        });
        
        document.body.appendChild(banner);
    }

    /**
     * Show XP earned banner inside the game
     * @param {number} xpAmount - Amount of XP earned
     * @param {object|string} extraData - Extra data with XP breakdown
     */
    showXPBanner(xpAmount, extraData = null) {

        
        // Create banner element (without breakdown)
        const banner = document.createElement('div');
        banner.className = 'game-xp-banner';
        banner.innerHTML = `
            <div class="game-xp-badge">
                <span class="game-xp-icon">⭐</span>
                <span class="game-xp-amount">+${xpAmount.toFixed(2)} XP</span>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Remove after 3.5 seconds
        setTimeout(() => {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 500);
        }, 3500);
    }

    setupWindowListeners() {
        // Register with PlatformSDK for XP banner events
        if (window.PlatformSDK) {
            window.PlatformSDK.on('showXPBanner', (payload) => {

                if (payload && payload.xp_earned !== undefined) {
                    this.showXPBanner(payload.xp_earned, payload);
                }
            });
        }
        
        // Listen for messages from platform (e.g., XP banner requests) - fallback
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'showXPBanner' && event.data.payload) {

                this.showXPBanner(event.data.payload.xp_earned, event.data.payload);
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

            }
        });
        
        // Also handle pagehide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (this.gameController?.rainbowRushSDK?.sessionId) {
                navigator.sendBeacon(
                    `${this.gameController.rainbowRushSDK.apiBaseUrl}/api/rainbow-rush/session/${this.gameController.rainbowRushSDK.sessionId}/end`,
                    JSON.stringify({})
                );

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
        window.rainbowRushApp = app;  // Make app globally accessible
        app.init();
    });
} else {
    const app = new RainbowRushApp();
    window.rainbowRushApp = app;  // Make app globally accessible
    app.init();
}

export default RainbowRushApp;
