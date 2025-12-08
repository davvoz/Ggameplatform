/**
 * ScreenManager - Gestisce tutte le schermate HTML del gioco
 * Stile uniforme, professionale ed elegante
 */

export class ScreenManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            levelSelect: document.getElementById('level-select-screen'),
            levelSummary: document.getElementById('level-summary-screen'),
            pause: document.getElementById('pause-screen'),
            gameOver: document.getElementById('gameover-screen'),
            loading: document.getElementById('loading-screen'),
            hud: document.getElementById('game-hud')
        };
        
        this.currentScreen = null;
        this.levelProgress = {};
        this.currentPage = 0;
        this.levelsPerPage = 20; // 4 rows x 5 columns
        this.totalPages = 10; // 200 levels / 20
        
        this._initializeHandlers();
    }
    
    /**
     * Inizializza tutti gli event handlers
     */
    _initializeHandlers() {
        // Menu screen
        const startBtn = document.getElementById('start-button');
        if (startBtn) {
            startBtn.addEventListener('click', () => this._onStartGame());
        }
        
        // Level Select screen
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        const levelSelectBackBtn = document.getElementById('level-select-back-btn');
        
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this._onPrevPage());
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this._onNextPage());
        if (levelSelectBackBtn) levelSelectBackBtn.addEventListener('click', () => this._dispatchEvent('backToMenu'));
        
        // Level Summary screen
        const nextLevelBtn = document.getElementById('next-level-btn');
        const retryLevelBtn = document.getElementById('retry-level-btn');
        const summaryMenuBtn = document.getElementById('summary-menu-btn');
        
        if (nextLevelBtn) nextLevelBtn.addEventListener('click', () => this._onNextLevel());
        if (retryLevelBtn) retryLevelBtn.addEventListener('click', () => this._onRetryLevel());
        if (summaryMenuBtn) summaryMenuBtn.addEventListener('click', () => this._dispatchEvent('backToMenu'));
        
        // Pause screen
        const resumeBtn = document.getElementById('resume-button');
        const pauseMenuBtn = document.getElementById('pause-menu-button');
        
        if (resumeBtn) resumeBtn.addEventListener('click', () => this._onResume());
        if (pauseMenuBtn) pauseMenuBtn.addEventListener('click', () => this._onPauseMenu());
        
        // Game Over screen
        const restartBtn = document.getElementById('restart-button');
        const menuBtn = document.getElementById('menu-button');
        
        if (restartBtn) restartBtn.addEventListener('click', () => this._onRestart());
        if (menuBtn) menuBtn.addEventListener('click', () => this._dispatchEvent('backToMenu'));
        
        // Volume controls
        const sfxSlider = document.getElementById('sfx-volume');
        const musicSlider = document.getElementById('music-volume');
        
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => this._onSfxVolumeChange(e.target.value));
        }
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => this._onMusicVolumeChange(e.target.value));
        }
    }
    
    /**
     * Mostra una schermata specifica
     */
    _showScreen(screenName) {
        // Nascondi tutte le schermate
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        
        // Mostra la schermata richiesta
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }
    
    /**
     * Mostra menu principale
     */
    async showMenu(scoreSystem = null) {
        this._showScreen('menu');
        
        // Se viene passato il ScoreSystem, carica l'high score dal backend
        if (scoreSystem) {
            try {
                const highScore = await scoreSystem.loadHighScore();
                this.updateHighScore(highScore);
            } catch (error) {
                console.warn('Failed to load high score for menu:', error);
            }
        }
        
        this._dispatchEvent('showMenu');
    }
    
    /**
     * Mostra schermata di selezione livelli
     */
    showLevelSelect(progress = {}) {
        this.levelProgress = progress;
        
        // Trova l'ultimo livello sbloccato
        let lastUnlocked = 1;
        for (let i = 1; i <= 200; i++) {
            if (this._isLevelUnlocked(i)) {
                lastUnlocked = i;
            } else {
                break;
            }
        }
        
        // Vai alla pagina che contiene l'ultimo livello sbloccato
        // Questo mostra i livelli più alti disponibili
        this.currentPage = Math.floor((lastUnlocked - 1) / this.levelsPerPage);
        
        this._showScreen('levelSelect');
        this._renderLevelSelect();
    }
    
    /**
     * Renderizza la griglia di livelli
     */
    _renderLevelSelect() {
        const grid = document.getElementById('levels-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const startLevel = this.currentPage * this.levelsPerPage + 1;
        const endLevel = Math.min(startLevel + this.levelsPerPage, 200);
        
        for (let level = startLevel; level < endLevel; level++) {
            const cell = document.createElement('div');
            cell.className = 'level-cell';
            
            const unlocked = this._isLevelUnlocked(level);
            const stars = this.levelProgress[level]?.stars || 0;
            
            if (!unlocked) {
                cell.classList.add('locked');
            }
            
            // Numero livello
            const number = document.createElement('div');
            number.className = 'level-number';
            number.textContent = level;
            cell.appendChild(number);
            
            // Stelle o lucchetto
            if (unlocked) {
                if (stars > 0) {
                    const starsDiv = document.createElement('div');
                    starsDiv.className = 'level-stars';
                    starsDiv.textContent = '⭐'.repeat(stars);
                    cell.appendChild(starsDiv);
                }
            } else {
                const lock = document.createElement('div');
                lock.className = 'level-lock';
                lock.textContent = '🔒';
                cell.appendChild(lock);
            }
            
            // Click handler
            if (unlocked) {
                cell.addEventListener('click', () => this._onLevelSelect(level));
            }
            
            grid.appendChild(cell);
        }
        
        // Aggiorna info pagina
        const pageInfo = document.getElementById('level-page-info');
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage + 1} / ${this.totalPages}`;
        }
        
        // Aggiorna pulsanti navigazione
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 0;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages - 1;
    }
    
    /**
     * Verifica se un livello è sbloccato
     */
    _isLevelUnlocked(level) {
        if (level === 1) return true;
        const prevLevel = level - 1;
        return this.levelProgress[prevLevel]?.completed || false;
    }
    
    /**
     * Mostra schermata riepilogo livello
     */
    showLevelSummary(summary) {
        this._showScreen('levelSummary');
        
        // Aggiorna titolo
        const title = document.getElementById('summary-level-name');
        if (title) {
            title.textContent = summary.levelName || `Level ${summary.levelId}`;
        }
        
        // Aggiorna stelle con animazione
        this._animateStars(summary.stars);
        
        // Aggiorna rank badge
        this._updateRankBadge(summary.stars);
        
        // Aggiorna statistiche
        const timeEl = document.getElementById('summary-time');
        const coinsEl = document.getElementById('summary-coins');
        const enemiesEl = document.getElementById('summary-enemies');
        const damageEl = document.getElementById('summary-damage');
        
        if (timeEl) timeEl.textContent = `${summary.time.toFixed(1)}s`;
        if (coinsEl) coinsEl.textContent = `${summary.coinsCollected}/${summary.totalCoins}`;
        if (enemiesEl) enemiesEl.textContent = `${summary.enemiesKilled}/${summary.totalEnemies}`;
        if (damageEl) damageEl.textContent = `${summary.damagesTaken}`;
        
        // Mostra/nascondi pulsante Next Level
        const nextBtn = document.getElementById('next-level-btn');
        if (nextBtn) {
            nextBtn.style.display = summary.nextLevelId ? 'block' : 'none';
        }
        
        this.currentLevelSummary = summary;
    }
    
    /**
     * Anima le stelle nel riepilogo
     */
    _animateStars(count) {
        for (let i = 1; i <= 3; i++) {
            const star = document.getElementById(`star-${i}`);
            if (!star) continue;
            
            if (i <= count) {
                star.textContent = '⭐';
                star.classList.add('earned');
                // Ritardo progressivo per l'animazione
                star.style.animationDelay = `${(i - 1) * 0.3}s`;
            } else {
                star.textContent = '☆';
                star.classList.remove('earned');
            }
        }
    }
    
    /**
     * Aggiorna il badge del rank
     */
    _updateRankBadge(stars) {
        const badge = document.getElementById('rank-badge');
        if (!badge) return;
        
        const rankConfig = {
            3: { icon: '🏆', text: 'PERFECT!', color: '#FFD700' },
            2: { icon: '🥇', text: 'EXCELLENT!', color: '#FFA500' },
            1: { icon: '🥈', text: 'GREAT!', color: '#C0C0C0' },
            0: { icon: '🥉', text: 'GOOD!', color: '#CD7F32' }
        };
        
        const config = rankConfig[stars] || rankConfig[0];
        
        badge.querySelector('.rank-icon').textContent = config.icon;
        badge.querySelector('.rank-text').textContent = config.text;
        badge.style.borderColor = config.color;
        badge.querySelector('.rank-text').style.color = config.color;
    }
    
    /**
     * Mostra schermata pause
     */
    showPause() {
        this._showScreen('pause');
        this._dispatchEvent('pause');
    }
    
    /**
     * Mostra schermata game over
     */
    showGameOver(stats) {
        this._showScreen('gameOver');
        
        const finalScore = document.getElementById('final-score');
        const finalLevel = document.getElementById('final-level');
        const finalCollectibles = document.getElementById('final-collectibles');
        const finalHighScore = document.getElementById('final-high-score');
        
        if (finalScore) finalScore.textContent = stats.score || 0;
        if (finalLevel) finalLevel.textContent = stats.level || 1;
        if (finalCollectibles) finalCollectibles.textContent = stats.collectibles || 0;
        if (finalHighScore) finalHighScore.textContent = stats.highScore || 0;
        
        this._dispatchEvent('gameOver', stats);
    }
    
    /**
     * Nascondi tutte le schermate (per mostrare HUD)
     */
    hideAllScreens() {
        Object.values(this.screens).forEach(screen => {
            if (screen && screen.id !== 'game-hud') {
                screen.classList.remove('active');
            }
        });
        this.currentScreen = 'hud';
    }
    
    /**
     * Aggiorna high score nel menu
     */
    updateHighScore(score) {
        const highScoreEl = document.getElementById('menu-high-score');
        if (highScoreEl) {
            highScoreEl.textContent = score;
        }
    }
    
    /**
     * Aggiorna progress bar del loading
     */
    updateLoadingProgress(percent) {
        const progress = document.getElementById('loading-progress');
        if (progress) {
            progress.style.width = `${percent}%`;
        }
    }
    
    // ==================== EVENT HANDLERS ====================
    
    _onStartGame() {
        this._dispatchEvent('startGame');
    }
    
    _onLevelSelect(levelId) {
        this._dispatchEvent('levelSelect', { levelId });
    }
    
    _onPrevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this._renderLevelSelect();
        }
    }
    
    _onNextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this._renderLevelSelect();
        }
    }
    
    _onNextLevel() {
        if (this.currentLevelSummary?.nextLevelId) {
            this._dispatchEvent('nextLevel', { levelId: this.currentLevelSummary.nextLevelId });
        }
    }
    
    _onRetryLevel() {
        if (this.currentLevelSummary?.levelId) {
            this._dispatchEvent('retryLevel', { levelId: this.currentLevelSummary.levelId });
        }
    }
    
    _onResume() {
        this._dispatchEvent('resume');
    }
    
    _onPauseMenu() {
        this._dispatchEvent('pauseMenu');
    }
    
    _onRestart() {
        this._dispatchEvent('restart');
    }
    
    _onSfxVolumeChange(value) {
        const valueEl = document.getElementById('sfx-volume-value');
        if (valueEl) valueEl.textContent = `${value}%`;
        this._dispatchEvent('sfxVolumeChange', { volume: value / 100 });
    }
    
    _onMusicVolumeChange(value) {
        const valueEl = document.getElementById('music-volume-value');
        if (valueEl) valueEl.textContent = `${value}%`;
        this._dispatchEvent('musicVolumeChange', { volume: value / 100 });
    }
    
    /**
     * Dispatch custom event
     */
    _dispatchEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(`screen:${eventName}`, { detail }));
    }
    
    /**
     * Aggiungi event listener
     */
    on(eventName, callback) {
        window.addEventListener(`screen:${eventName}`, (e) => callback(e.detail));
    }
}
