/**
 * Main entry point for Rainbow Rush
 * Initializes the game and manages UI interactions
 */
import { GameController } from './GameController.js';

class RainbowRushApp {
    constructor() {
        this.gameController = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Get canvas element
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            // Create game controller
            this.gameController = new GameController(canvas);

            // Setup UI event listeners
            this.setupUIListeners();

            // Setup game event listeners
            this.setupGameListeners();

            // Setup window listeners
            this.setupWindowListeners();

            // Hide loading screen
            this.hideLoadingScreen();

            this.initialized = true;
            console.log('Rainbow Rush initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError(error.message);
        }
    }

    setupUIListeners() {
        // Start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }

        // Restart button
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.startGame());
        }

        // Menu button
        const menuButton = document.getElementById('menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', () => this.showMenu());
        }

        // Pause button is now rendered via HUDRenderer and handled in GameController
        // No need for HTML event listener
        
        // Resume button
        const resumeButton = document.getElementById('resume-button');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => this.resumeGame());
        }
        
        // Pause menu button
        const pauseMenuButton = document.getElementById('pause-menu-button');
        if (pauseMenuButton) {
            pauseMenuButton.addEventListener('click', () => this.showMenu());
        }
        
        // Volume sliders
        const sfxSlider = document.getElementById('sfx-volume');
        const musicSlider = document.getElementById('music-volume');
        
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => this.updateSFXVolume(e.target.value));
        }
        
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => this.updateMusicVolume(e.target.value));
        }
    }

    setupGameListeners() {
        // Listen for game events
        window.addEventListener('gameUpdate', (e) => this.updateHUD(e.detail));
        window.addEventListener('gameOver', (e) => this.showGameOver(e.detail));
        window.addEventListener('gameStart', () => this.showGameHUD());
        window.addEventListener('showMenu', (e) => this.showMenuScreen(e.detail));
    }

    setupWindowListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.gameController) {
                this.gameController.handleResize();
            }
        });

        // Handle visibility change (pause when tab hidden, resume when visible)
        document.addEventListener('visibilitychange', () => {
            if (!this.gameController) return;
            
            if (document.hidden) {
                // Tab nascosta - metti in pausa solo se sta giocando
                if (this.gameController.gameState.isPlaying()) {
                    this.gameController.pauseGame();
                    // Segna che è stata messa in pausa automaticamente
                    this.gameController.autoPaused = true;
                }
            } else {
                // Tab visibile - riprendi solo se era stata pausata automaticamente
                if (this.gameController.gameState.isPaused() && this.gameController.autoPaused) {
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

    showMenuScreen(data) {
        this.hideAllScreens();
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            menuScreen.classList.add('active');
        }

        // Update high score
        const highScoreElement = document.getElementById('menu-high-score');
        if (highScoreElement && data) {
            highScoreElement.textContent = data.highScore || 0;
        }
    }

    showGameHUD() {
        this.hideAllScreens();
        const gameHUD = document.getElementById('game-hud');
        if (gameHUD) {
            gameHUD.classList.add('active');
        }
        
        // Assicura che il canvas abbia il focus per ricevere eventi tastiera
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.focus();
        }
    }

    showGameOver(stats) {
        this.hideAllScreens();
        const gameOverScreen = document.getElementById('gameover-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('active');
        }

        // Update stats
        this.updateElement('final-score', stats.score);
        this.updateElement('final-level', stats.level);
        this.updateElement('final-collectibles', stats.collectibles);
        this.updateElement('final-high-score', stats.highScore);
    }

    updateHUD(stats) {
        // Score and level are now rendered via HUDRenderer, no need to update HTML elements
        // Only update collectibles if needed
        this.updateElement('collectibles-display', stats.collectibles);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
    }

    startGame() {
        if (this.gameController) {
            this.gameController.startGame();
        }
    }

    showMenu() {
        if (this.gameController) {
            this.gameController.showMenu();
        }
    }

    togglePause() {
        if (!this.gameController) return;

        const pauseButton = document.getElementById('pause-button');
        if (this.gameController.gameState.isPaused()) {
            this.gameController.resumeGame();
            if (pauseButton) {
                pauseButton.textContent = '⏸️';
            }
        } else if (this.gameController.gameState.isPlaying()) {
            this.gameController.pauseGame();
            if (pauseButton) {
                pauseButton.textContent = '▶️';
            }
        }
    }
    
    showPauseMenu() {
        if (this.gameController && this.gameController.gameState.isPlaying()) {
            this.gameController.pauseGame();
            const pauseScreen = document.getElementById('pause-screen');
            if (pauseScreen) {
                pauseScreen.classList.add('active');
            }
        }
    }
    
    resumeGame() {
        if (this.gameController) {
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
