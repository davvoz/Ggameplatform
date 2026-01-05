/**
 * Briscola - Italian Card Game
 * Main Application Entry Point
 * 
 * Supports:
 * - Single player vs AI (Easy/Medium/Hard)
 * - Local 2 players (pass-and-play)
 * - Online multiplayer (WebSocket)
 */

import { GameEngine } from './core/GameEngine.js';
import { UIManager } from './ui/UIManager.js';
import { MenuController } from './controllers/MenuController.js';
import { GameController } from './controllers/GameController.js';
import { MultiplayerController } from './controllers/MultiplayerController.js';
import { SpriteSheet } from './graphics/SpriteSheet.js';
import { PlatformBridge } from './platform/PlatformBridge.js';
import { SoundManager } from './audio/SoundManager.js';

class BriscolaApp {
    constructor() {
        this.spriteSheet = null;
        this.uiManager = null;
        this.gameEngine = null;
        this.menuController = null;
        this.gameController = null;
        this.multiplayerController = null;
        this.platformBridge = null;
        this.soundManager = null;
        
        this.currentMode = null; // 'ai', 'local', 'online'
        this.difficulty = 'medium';
    }
    
    async init() {
        console.log('[Briscola] Initializing...');
        
        try {
            // Load sprite sheet
            this.spriteSheet = new SpriteSheet();
            await this.spriteSheet.load('assets/cards.jpg');
            console.log('[Briscola] Sprite sheet loaded');
            
            // Initialize sound manager
            this.soundManager = new SoundManager();
            
            // Initialize UI manager
            this.uiManager = new UIManager(this.spriteSheet);
            
            // Initialize platform bridge
            this.platformBridge = new PlatformBridge();
            await this.platformBridge.init();
            
            // Initialize game engine
            this.gameEngine = new GameEngine();
            
            // Initialize controllers
            this.menuController = new MenuController(this);
            this.gameController = new GameController(this);
            this.multiplayerController = new MultiplayerController(this);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show menu
            this.showScreen('menu');
            
            console.log('[Briscola] Initialization complete');
            
        } catch (error) {
            console.error('[Briscola] Initialization failed:', error);
            this.showError('Errore di inizializzazione. Ricarica la pagina.');
        }
    }
    
    setupEventListeners() {
        // Menu buttons
        document.querySelectorAll('.menu-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.selectGameMode(mode);
            });
        });
        
        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.difficulty = e.currentTarget.dataset.difficulty;
                
                // Start game after selecting difficulty
                if (this.currentMode === 'ai') {
                    this.startGame();
                }
            });
        });
        
        // Rules modal
        document.getElementById('show-rules').addEventListener('click', () => {
            this.showModal('rules-modal');
        });
        
        document.getElementById('close-rules').addEventListener('click', () => {
            this.hideModal('rules-modal');
        });
        
        // Pause modal
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pauseGame();
        });
        
        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                if (this.soundManager) {
                    const isMuted = this.soundManager.toggleMute();
                    soundBtn.querySelector('span').textContent = isMuted ? '🔇' : '🔊';
                    soundBtn.classList.toggle('muted', isMuted);
                }
            });
        }
        
        document.getElementById('resume-game').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('quit-game').addEventListener('click', () => {
            this.quitGame();
        });
        
        document.getElementById('exit-btn').addEventListener('click', () => {
            this.quitGame();
        });
        
        // Game over buttons
        document.getElementById('play-again').addEventListener('click', () => {
            this.playAgain();
        });
        
        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.backToMenu();
        });
        
        // Lobby buttons
        document.getElementById('create-room').addEventListener('click', () => {
            this.multiplayerController.createRoom();
        });
        
        document.getElementById('join-room').addEventListener('click', () => {
            this.multiplayerController.showJoinForm();
        });
        
        document.getElementById('join-room-submit').addEventListener('click', () => {
            const code = document.getElementById('room-input').value.toUpperCase();
            this.multiplayerController.joinRoom(code);
        });
        
        document.getElementById('lobby-back').addEventListener('click', () => {
            this.multiplayerController.disconnect();
            this.showScreen('menu');
        });
        
        // Handle window visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentMode && !this.gameEngine.isGameOver) {
                this.pauseGame();
            }
        });
        
        // Handle back button / escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    this.hideAllModals();
                } else if (this.currentMode) {
                    this.pauseGame();
                }
            }
        });
        
        // Prevent context menu on cards
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.card')) {
                e.preventDefault();
            }
        });
    }
    
    selectGameMode(mode) {
        this.currentMode = mode;
        
        switch (mode) {
            case 'ai':
                // Show difficulty selector, wait for user to click a difficulty
                document.getElementById('difficulty-selector').style.display = 'block';
                break;
                
            case 'online':
                this.showScreen('lobby');
                break;
        }
    }
    
    startGame() {
        console.log(`[Briscola] Starting game - Mode: ${this.currentMode}, Difficulty: ${this.difficulty}`);
        
        // Reset game engine
        this.gameEngine.reset();
        
        // Configure game based on mode
        const config = {
            mode: this.currentMode,
            difficulty: this.difficulty,
            player1Name: this.platformBridge.getUsername() || 'Tu',
            player2Name: this.getOpponentName()
        };
        
        // Initialize game
        this.gameEngine.init(config);
        
        // Setup UI
        this.gameController.setup(this.gameEngine.getState());
        
        // Show game screen
        this.showScreen('game');
        
        // Start the game
        this.gameController.startGame();
        
        // Report to platform
        this.platformBridge.reportGameStart();
    }
    
    getOpponentName() {
        switch (this.currentMode) {
            case 'ai':
                const names = ['CPU Facile', 'CPU Medio', 'CPU Difficile'];
                return names[['easy', 'medium', 'hard'].indexOf(this.difficulty)];
            case 'local':
                return 'Giocatore 2';
            case 'online':
                return this.multiplayerController.opponentName || 'Avversario';
            default:
                return 'Avversario';
        }
    }
    
    pauseGame() {
        if (!this.currentMode || this.gameEngine.isGameOver) return;
        
        this.gameEngine.pause();
        this.platformBridge.reportPause();
        this.showModal('pause-modal');
    }
    
    resumeGame() {
        this.gameEngine.resume();
        this.platformBridge.reportResume();
        this.hideModal('pause-modal');
    }
    
    quitGame() {
        this.hideAllModals();
        
        if (this.currentMode === 'online') {
            this.multiplayerController.disconnect();
        }
        
        // Report final score
        const state = this.gameEngine.getState();
        this.platformBridge.reportGameOver(state.player1Score, {
            opponent_score: state.player2Score,
            mode: this.currentMode,
            result: 'abandoned'
        });
        
        this.currentMode = null;
        this.showScreen('menu');
    }
    
    endGame(winner) {
        const state = this.gameEngine.getState();
        
        // Update player names and scores
        document.getElementById('go-player1').textContent = state.player1Name;
        document.getElementById('go-player2').textContent = state.player2Name;
        document.getElementById('go-score1').textContent = state.player1Score;
        document.getElementById('go-score2').textContent = state.player2Score;
        
        // Update result badge and styling
        const badge = document.getElementById('result-badge');
        const scoreCard1 = document.getElementById('score-card-1');
        const scoreCard2 = document.getElementById('score-card-2');
        
        // Reset classes
        badge.classList.remove('lose', 'draw');
        scoreCard1.classList.remove('winner');
        scoreCard2.classList.remove('winner');
        
        let announcement = '';
        let badgeText = '';
        
        if (winner === 1) {
            badgeText = 'VITTORIA';
            scoreCard1.classList.add('winner');
        } else if (winner === 2) {
            badgeText = 'SCONFITTA';
            badge.classList.add('lose');
            scoreCard2.classList.add('winner');
        } else {
            badgeText = 'PAREGGIO';
            badge.classList.add('draw');
        }
        
        badge.querySelector('.badge-text').textContent = badgeText;
        document.getElementById('winner-announcement').textContent = announcement;
        
        // Report to platform
        const isWin = winner === 1;
        const isDraw = winner === 0;
        this.platformBridge.reportGameOver(state.player1Score, {
            opponent_score: state.player2Score,
            mode: this.currentMode,
            difficulty: this.difficulty,
            result: isWin ? 'win' : (isDraw ? 'draw' : 'loss'),
            hands_won: state.player1HandsWon,
            total_hands: state.totalHands
        });
        
        // Show confetti for wins
        if (isWin) {
            this.showConfetti();
        }
        
        this.showScreen('gameover');
    }
    
    playAgain() {
        document.getElementById('winner-announcement').classList.remove('celebrate');
        this.startGame();
    }
    
    backToMenu() {
        document.getElementById('winner-announcement').classList.remove('celebrate');
        this.currentMode = null;
        document.getElementById('difficulty-selector').style.display = 'none';
        this.showScreen('menu');
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenId}-screen`).classList.add('active');
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #c0392b;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    showConfetti() {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
        const container = document.getElementById('game-container');
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                container.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 50);
        }
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    const app = new BriscolaApp();
    app.init();
    
    // Expose for debugging
    window.briscolaApp = app;
});
