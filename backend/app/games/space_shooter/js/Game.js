/**
 * Game - Classe principale del gioco con effetti avanzati
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Managers
        this.assets = new AssetManager();
        this.input = null;
        this.sound = new SoundManager();

        // Effects
        this.particles = new ParticleSystem();
        this.postProcessing = null;

        // Game state
        this.state = 'loading';
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.level = 1;
        this.time = 0;

        // Entities
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.starField = null;

        // Wave system
        this.waveTimer = 0;
        this.waveInterval = 5;
        this.waveNumber = 0;
        this.bossSpawned = false;

        // Delta time
        this.lastTime = 0;
        this.deltaTime = 0;

        // Screen references
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        this.finalBestElement = document.getElementById('final-best');
        this.restartBtn = document.getElementById('restart-btn');

        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.comboDuration = 2;

        // Magnet power-up
        this.magnetActive = false;
        this.magnetTime = 0;

        // Level celebration
        this.celebrating = false;
        this.celebrationTimer = 0;
        this.celebrationDuration = 3.5;
        this.celebrationZoom = 1;
        this.celebrationText = '';

        // Game over animation
        this.gameOverAnimating = false;
        this.gameOverTimer = 0;
        this.gameOverDuration = 3;
        this.gameOverExplosions = [];

        // Score popups
        this.scorePopups = [];

        // Performance mode: 'high', 'medium', 'low'
        this.performanceMode = this.loadPerformanceMode();
        this.explosionScale = 1.0;

        // FPS Monitor
        this.fpsHistory = [];
        this.fpsUpdateTimer = 0;
        this.currentFPS = 60;
        this.avgFPS = 60;
        this.minFPS = 60;
        this.frameTimeHistory = [];
        this.showPerfMonitor = true;

        this.init();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        await this.assets.loadAll();

        this.input = new InputManager(this);
        
        // Aggiorna layout controlli touch dopo la creazione dell'input manager
        if (this.input.isMobile) {
            this.input.updateLayout(this.canvas.width, this.canvas.height);
        }
        
        this.postProcessing = new PostProcessing(this.canvas);
        this.starField = new StarField(this.canvas.width, this.canvas.height);

        this.setupEventListeners();

        // Applica performance mode salvato
        this.applyPerformanceMode();

        this.state = 'menu';
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resize() {
        const container = document.getElementById('game-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Rileva se è mobile
        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        const targetAspect = 9 / 16;
        let width, height;

        if (isMobile) {
            // Mobile: occupa tutto lo schermo
            width = containerWidth;
            height = containerHeight;
        } else {
            // Desktop: mantiene aspect ratio con limiti
            if (containerWidth / containerHeight < targetAspect) {
                width = containerWidth;
                height = containerWidth / targetAspect;
            } else {
                height = containerHeight;
                width = containerHeight * targetAspect;
            }

            width = Math.min(width, 450);
            height = Math.min(height, 800);
        }

        this.canvas.width = width;
        this.canvas.height = height;

        if (this.starField) {
            this.starField.resize(width, height);
        }
        if (this.postProcessing) {
            this.postProcessing.resize();
        }
        
        // Aggiorna layout dei controlli touch
        if (this.input && this.input.isMobile) {
            this.input.updateLayout(width, height);
        }
    }

    setupEventListeners() {
        this.startScreen.addEventListener('click', () => this.startGame());
        this.startScreen.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startGame();
        });

        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.restartBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.restartGame();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'playing') {
                this.pauseGame();
            }
        });

        // Pause button (canvas-based)
        this.pauseButtonRect = { x: 0, y: 140, width: 40, height: 40 }; // y: 140 = sotto heat bar (70 + 60 + 10)
        this.pauseButtonHover = false;

        this.settingsPopup = document.getElementById('settings-popup');
        this.resumeButton = document.getElementById('resume-button');
        this.musicToggle = document.getElementById('music-toggle');
        this.sfxToggle = document.getElementById('sfx-toggle');
        this.trackButtons = document.querySelectorAll('.track-btn');
        this.perfButtons = document.querySelectorAll('.perf-btn');

        // Click/touch sulla canvas per il bottone pausa
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleCanvasTouch(e);
        });

        // Mouse move per hover sul bottone pausa
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

        if (this.resumeButton) {
            this.resumeButton.addEventListener('click', () => this.resumeGame());
            this.resumeButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.resumeGame();
            });
        }

        // Bottone toggle musica - handler per click E touch
        const handleMusicToggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.musicToggle.classList.contains('on')) {
                this.musicToggle.classList.remove('on');
                this.musicToggle.classList.add('off');
                this.musicToggle.textContent = 'OFF';
                this.sound.muteMusic();
            } else {
                this.musicToggle.classList.remove('off');
                this.musicToggle.classList.add('on');
                this.musicToggle.textContent = 'ON';
                this.sound.unmuteMusic();
            }
        };

        if (this.musicToggle) {
            this.musicToggle.addEventListener('click', handleMusicToggle);
            this.musicToggle.addEventListener('touchend', handleMusicToggle, { passive: false });
        }

        // Bottone toggle effetti sonori - handler per click E touch
        const handleSfxToggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.sfxToggle.classList.contains('on')) {
                this.sfxToggle.classList.remove('on');
                this.sfxToggle.classList.add('off');
                this.sfxToggle.textContent = 'OFF';
                this.sound.muteSfx();
            } else {
                this.sfxToggle.classList.remove('off');
                this.sfxToggle.classList.add('on');
                this.sfxToggle.textContent = 'ON';
                this.sound.unmuteSfx();
            }
        };

        if (this.sfxToggle) {
            this.sfxToggle.addEventListener('click', handleSfxToggle);
            this.sfxToggle.addEventListener('touchend', handleSfxToggle, { passive: false });
        }

        // Track selector buttons - handler per click E touch
        const handleTrackChange = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const trackIndex = parseInt(e.target.dataset.track, 10);
            if (isNaN(trackIndex)) return;

            // Aggiorna UI
            this.trackButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Cambia traccia
            await this.sound.changeTrack(trackIndex);
        };

        this.trackButtons.forEach(btn => {
            btn.addEventListener('click', handleTrackChange);
            btn.addEventListener('touchend', handleTrackChange, { passive: false });
        });

        // Performance selector buttons - handler per click E touch
        const handlePerfChange = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const perfMode = e.target.dataset.perf;
            if (!perfMode) return;

            // Aggiorna UI
            this.perfButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Applica modalità performance
            this.setPerformanceMode(perfMode);
        };

        this.perfButtons.forEach(btn => {
            btn.addEventListener('click', handlePerfChange);
            btn.addEventListener('touchend', handlePerfChange, { passive: false });
        });

        // ESC key for pause
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === 'playing') {
                    this.pauseGame();
                } else if (this.state === 'paused') {
                    this.resumeGame();
                }
            }
        });
    }

    /**
     * Gestisce click sulla canvas
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        if (this.isPointInPauseButton(x, y) && this.state === 'playing') {
            this.pauseGame();
        }
    }

    /**
     * Gestisce touch sulla canvas
     */
    handleCanvasTouch(e) {
        if (e.changedTouches.length === 0) return;

        const touch = e.changedTouches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);

        if (this.isPointInPauseButton(x, y) && this.state === 'playing') {
            this.pauseGame();
        }
    }

    /**
     * Gestisce hover sul bottone pausa
     */
    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        this.pauseButtonHover = this.isPointInPauseButton(x, y);
        this.canvas.style.cursor = this.pauseButtonHover ? 'pointer' : 'default';
    }

    /**
     * Verifica se un punto è dentro il bottone pausa
     */
    isPointInPauseButton(x, y) {
        const btn = this.pauseButtonRect;
        const btnX = this.canvas.width - btn.width - 12; // Posizione X dinamica
        return x >= btnX && x <= btnX + btn.width &&
            y >= btn.y && y <= btn.y + btn.height;
    }

    togglePause() {
        if (this.state === 'playing') {
            this.pauseGame();
        } else if (this.state === 'paused') {
            this.resumeGame();
        }
    }

    pauseGame() {
        if (this.state !== 'playing') return;

        this.state = 'paused';
        this.settingsPopup.classList.remove('hidden');
        this.sound.pauseBackgroundMusic();

        // Aggiorna stato dei bottoni toggle
        if (this.musicToggle) {
            if (this.sound.musicMuted) {
                this.musicToggle.classList.remove('on');
                this.musicToggle.classList.add('off');
                this.musicToggle.textContent = 'OFF';
            } else {
                this.musicToggle.classList.remove('off');
                this.musicToggle.classList.add('on');
                this.musicToggle.textContent = 'ON';
            }
        }
        if (this.sfxToggle) {
            if (this.sound.sfxMuted) {
                this.sfxToggle.classList.remove('on');
                this.sfxToggle.classList.add('off');
                this.sfxToggle.textContent = 'OFF';
            } else {
                this.sfxToggle.classList.remove('off');
                this.sfxToggle.classList.add('on');
                this.sfxToggle.textContent = 'ON';
            }
        }

        // Aggiorna stato dei bottoni traccia
        if (this.trackButtons) {
            const currentTrack = this.sound.getCurrentTrackIndex();
            this.trackButtons.forEach(btn => {
                const trackIdx = parseInt(btn.dataset.track, 10);
                if (trackIdx === currentTrack) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Aggiorna stato dei bottoni performance
        if (this.perfButtons) {
            this.perfButtons.forEach(btn => {
                if (btn.dataset.perf === this.performanceMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    resumeGame() {
        if (this.state !== 'paused') return;

        this.state = 'playing';
        this.settingsPopup.classList.add('hidden');
        this.sound.resumeBackgroundMusic();
    }

    startGame() {
        if (this.state !== 'menu') return;

        this.sound.init();
        // Avvia la musica dopo un piccolo delay per assicurarsi che sia caricata
        setTimeout(() => {
            this.sound.playBackgroundMusic();
        }, 500);

        this.startScreen.classList.add('hidden');
        this.resetGame();
        this.state = 'playing';

        // Notifica la piattaforma che il gioco è iniziato
        if (typeof window.startGameSession === 'function') {
            window.startGameSession();
        }
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.time = 0;
        this.waveNumber = 0;
        this.waveTimer = 2; // Inizio più veloce
        this.bossSpawned = false;
        this.combo = 0;
        this.comboTimer = 0;
        this.magnetActive = false;
        this.magnetTime = 0;

        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.scorePopups = [];
        this.particles.clear();

        this.player = new Player(
            this.canvas.width / 2 - 24,
            this.canvas.height / 2 - 24
        );
    }

    restartGame() {
        this.gameOverScreen.classList.add('hidden');
        this.resetGame();
        this.state = 'playing';

        // Riavvia la musica
        this.sound.stopBackgroundMusic();
        this.sound.playBackgroundMusic();

        // Notifica la piattaforma di una nuova sessione
        if (typeof window.startGameSession === 'function') {
            window.startGameSession();
        }
    }

    gameOver() {
        this.state = 'gameover';
        this.sound.playGameOver();

        // Abbassa la musica durante game over
        this.sound.pauseBackgroundMusic();

        // Avvia animazione game over
        this.gameOverAnimating = true;
        this.gameOverTimer = 0;
        this.gameOverExplosions = [];

        // Genera esplosioni multiple sulla posizione del player
        if (this.player) {
            const px = this.player.position.x + this.player.width / 2;
            const py = this.player.position.y + this.player.height / 2;

            // Esplosione iniziale grande
            this.spawnExplosion(px, py, 'large');
            this.postProcessing.shake(25, 0.5);
            this.postProcessing.flash({ r: 255, g: 100, b: 50 }, 0.6);

            // Programma esplosioni a catena
            for (let i = 0; i < 8; i++) {
                this.gameOverExplosions.push({
                    x: px + (Math.random() - 0.5) * 100,
                    y: py + (Math.random() - 0.5) * 100,
                    delay: 0.2 + i * 0.15,
                    spawned: false
                });
            }
        }

        const isNewHigh = this.score > this.highScore;
        if (isNewHigh) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.finalScoreElement.textContent = this.score.toLocaleString();
        if (this.finalLevelElement) {
            this.finalLevelElement.textContent = this.level.toString();
        }
        if (this.finalBestElement) {
            this.finalBestElement.textContent = this.highScore.toLocaleString();
            this.finalBestElement.classList.toggle('new', isNewHigh);
        }

        // Invia score alla piattaforma
        if (typeof window.sendScoreToPlatform === 'function') {
            window.sendScoreToPlatform(this.score, {
                level: this.level,
                wave: this.waveNumber
            });
        }
    }

    gameLoop(currentTime) {
        const frameStart = performance.now();
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(this.deltaTime);
        this.render();

        // FPS monitoring
        this.updateFPSMonitor(frameStart);

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateFPSMonitor(frameStart) {
        const frameTime = performance.now() - frameStart;
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > 60) this.frameTimeHistory.shift();

        // Calcola FPS attuale
        if (this.deltaTime > 0) {
            this.currentFPS = Math.round(1 / this.deltaTime);
            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > 60) this.fpsHistory.shift();
        }

        // Aggiorna statistiche ogni 500ms
        this.fpsUpdateTimer += this.deltaTime;
        if (this.fpsUpdateTimer >= 0.5) {
            this.fpsUpdateTimer = 0;
            if (this.fpsHistory.length > 0) {
                this.avgFPS = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
                this.minFPS = Math.min(...this.fpsHistory);
            }
        }
    }

    update(deltaTime) {
        this.time += deltaTime;

        this.starField.update(deltaTime);
        this.particles.update(deltaTime);
        this.postProcessing.update(deltaTime);

        // Update score popups
        this.scorePopups = this.scorePopups.filter(popup => {
            popup.life -= deltaTime;
            popup.y -= 50 * deltaTime;
            return popup.life > 0;
        });

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        if (this.state !== 'playing') {
            // Aggiorna animazione game over
            if (this.state === 'gameover' && this.gameOverAnimating) {
                this.updateGameOverAnimation(deltaTime);
            }
            return;
        }

        // Gestione celebrazione
        if (this.celebrating) {
            this.updateCelebration(deltaTime);
            // Durante la celebrazione aggiorna solo il player e le particelle
            if (this.player && this.player.active) {
                this.player.update(deltaTime, this);
            }
            return;
        }

        // Update player
        if (this.player && this.player.active) {
            this.player.update(deltaTime, this);

            // Gestione abilità
            if (this.input.isHealActivated()) {
                this.player.useHeal(this);
            }
            if (this.input.isBombActivated()) {
                this.player.useBomb(this);
            }

            // Aggiorna UI cooldown abilità
            this.updateAbilityUI();

            // Thruster particles
            if (Math.random() < 0.5) {
                this.particles.emitThruster(
                    this.player.position.x + this.player.width / 2,
                    this.player.position.y + this.player.height,
                    1 + this.player.velocity.magnitude() / 300
                );
            }
        }

        // Update enemies
        this.enemies.forEach(enemy => enemy.update(deltaTime, this));
        this.enemies = this.enemies.filter(e => e.active);

        // Update bullets
        this.bullets.forEach(bullet => {
            bullet.update(deltaTime, this);
            // Bullet trail particles
            if (Math.random() < 0.3) {
                this.particles.emitBulletTrail(
                    bullet.position.x + bullet.width / 2,
                    bullet.position.y + bullet.height / 2,
                    bullet.owner === 'player'
                );
            }
        });
        this.bullets = this.bullets.filter(b => b.active);

        // Update explosions
        this.explosions.forEach(exp => exp.update(deltaTime, this));
        this.explosions = this.explosions.filter(e => e.active);

        // Update power-ups
        this.powerUps.forEach(p => p.update(deltaTime, this));
        this.powerUps = this.powerUps.filter(p => p.active);

        this.checkCollisions();
        this.updateWaves(deltaTime);

        if (this.player && !this.player.active) {
            this.gameOver();
        }
    }

    checkCollisions() {
        if (!this.player || !this.player.active) return;

        // Player bullets vs enemies
        this.bullets.filter(b => b.owner === 'player').forEach(bullet => {
            this.enemies.forEach(enemy => {
                if (bullet.active && enemy.active && bullet.collidesWith(enemy)) {
                    bullet.destroy();

                    // Hit spark effect
                    this.particles.emitHitSpark(
                        bullet.position.x + bullet.width / 2,
                        bullet.position.y,
                        { r: 0, g: 200, b: 255 }
                    );

                    if (enemy.takeDamage(bullet.damage, this)) {
                        // Enemy destroyed - increase combo
                        this.combo++;
                        this.comboTimer = this.comboDuration;
                    }
                    this.sound.playExplosion();
                }
            });
        });

        // Enemy bullets vs player
        this.bullets.filter(b => b.owner === 'enemy').forEach(bullet => {
            if (bullet.active && bullet.collidesWith(this.player)) {
                bullet.destroy();
                this.particles.emitHitSpark(
                    bullet.position.x + bullet.width / 2,
                    bullet.position.y + bullet.height / 2,
                    { r: 255, g: 100, b: 100 }
                );
                this.player.takeDamage(1, this);
                this.postProcessing.shake(8, 0.2);
                this.postProcessing.flash({ r: 255, g: 0, b: 0 }, 0.1);
            }
        });

        // Enemies vs player (COLLISIONE - molto pericolosa!)
        this.enemies.forEach(enemy => {
            if (enemy.active && enemy.collidesWith(this.player)) {
                // Danno basato sul tipo di nemico e livello
                let collisionDamage = 1;
                switch (enemy.type) {
                    case 'enemy1': collisionDamage = 1; break;
                    case 'enemy2': collisionDamage = 2; break;
                    case 'enemy3': collisionDamage = 2; break;
                    case 'boss': collisionDamage = 3; break;
                }
                // Bonus danno ai livelli alti
                if (this.level >= 5) collisionDamage += 1;
                if (this.level >= 10) collisionDamage += 1;

                this.player.takeDamage(collisionDamage, this);
                this.postProcessing.shake(15, 0.4);
                this.postProcessing.flash({ r: 255, g: 50, b: 50 }, 0.2);

                // Nemici piccoli muoiono, altri prendono danno
                if (enemy.type === 'enemy1') {
                    enemy.takeDamage(enemy.health, this);
                } else if (enemy.type !== 'boss') {
                    // Nemici più grandi prendono 2 danni ma sopravvivono se hanno vita
                    enemy.takeDamage(2, this);
                }
                // Boss non prende danno da collisione
            }
        });

        // Power-ups vs player
        this.powerUps.forEach(powerUp => {
            if (powerUp.active && powerUp.collidesWithCircle(this.player)) {
                const colors = {
                    health: { r: 50, g: 255, b: 50 },
                    weapon: { r: 255, g: 170, b: 0 },
                    shield: { r: 68, g: 136, b: 255 }
                };
                this.particles.emitPowerUpCollect(
                    powerUp.position.x + powerUp.width / 2,
                    powerUp.position.y + powerUp.height / 2,
                    colors[powerUp.type] || colors.weapon
                );
                powerUp.apply(this.player, this);
            }
        });
    }

    updateWaves(deltaTime) {
        this.waveTimer -= deltaTime;

        // Più nemici man mano che si avanza (da 10 a 25)
        const maxEnemies = Math.min(25, 10 + this.level * 3);

        if (this.waveTimer <= 0 && this.enemies.length < maxEnemies) {
            this.spawnWave();
            // Intervallo diminuisce con il livello (da 4s a 1.2s)
            this.waveTimer = Math.max(1.2, 4 - this.level * 0.4);
        }

        // Magnet timer
        if (this.magnetActive) {
            this.magnetTime -= deltaTime;
            if (this.magnetTime <= 0) {
                this.magnetActive = false;
            }
        }

        if (this.waveNumber > 0 && this.waveNumber % 8 === 0 && !this.bossSpawned) {
            this.spawnBoss();
            this.bossSpawned = true;
            this.postProcessing.flash({ r: 255, g: 200, b: 0 }, 0.3);
        }

        if (this.bossSpawned && !this.enemies.some(e => e.type === 'boss')) {
            this.bossSpawned = false;
            this.startLevelCelebration();
        }
    }

    startLevelCelebration() {
        this.celebrating = true;
        this.celebrationTimer = 0;
        this.celebrationZoom = 1;
        this.celebrationText = `LEVEL ${this.level} COMPLETE!`;

        // Pulisci proiettili nemici
        this.bullets = this.bullets.filter(b => b.owner === 'player');

        // Flash dorato
        this.postProcessing.flash({ r: 255, g: 215, b: 0 }, 0.4);
        this.sound.playPowerUp();
    }

    updateCelebration(deltaTime) {
        this.celebrationTimer += deltaTime;

        // Zoom progressivo sulla navicella
        const progress = this.celebrationTimer / this.celebrationDuration;

        if (progress < 0.3) {
            // Zoom in
            this.celebrationZoom = 1 + (progress / 0.3) * 0.5;
        } else if (progress < 0.7) {
            // Mantieni zoom
            this.celebrationZoom = 1.5;
        } else {
            // Zoom out
            this.celebrationZoom = 1.5 - ((progress - 0.7) / 0.3) * 0.5;
        }

        // Fine celebrazione
        if (this.celebrationTimer >= this.celebrationDuration) {
            this.celebrating = false;
            this.celebrationZoom = 1;
            this.level++;
            this.waveNumber = 0;
            this.addScore(1000 * this.level);

            // Bonus salute a fine livello
            if (this.player && this.player.active) {
                this.player.heal(1);
            }
        }
    }

    updateGameOverAnimation(deltaTime) {
        this.gameOverTimer += deltaTime;
        const progress = this.gameOverTimer / this.gameOverDuration;

        // Spawna esplosioni a catena
        this.gameOverExplosions.forEach(exp => {
            if (!exp.spawned && this.gameOverTimer >= exp.delay) {
                exp.spawned = true;
                this.spawnExplosion(exp.x, exp.y, Math.random() > 0.5 ? 'medium' : 'small');
                this.postProcessing.shake(8, 0.15);
            }
        });

        // Slow motion effect (rallenta le particelle)
        if (progress < 0.5) {
            // Le prime esplosioni sono più lente
        }

        // Fine animazione - mostra schermata
        if (this.gameOverTimer >= this.gameOverDuration) {
            this.gameOverAnimating = false;
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    spawnWave() {
        this.waveNumber++;

        const patterns = ['straight', 'sine', 'zigzag', 'dive'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        // Tipi nemici basati sul livello
        let enemyType = 'enemy1';
        const roll = Math.random();
        if (this.level >= 2) {
            if (roll < 0.25 + this.level * 0.06) enemyType = 'enemy2';
        }
        if (this.level >= 3) {
            if (roll < 0.12 + this.level * 0.04) enemyType = 'enemy3';
        }

        // Più nemici per wave man mano che si avanza (da 2 a 8)
        const count = Math.min(8, 2 + Math.floor(this.level / 2) + Math.floor(this.waveNumber / 4));

        // Boost velocità col livello (inizia dal livello 2, max +80% al livello 8+)
        const speedMultiplier = this.level <= 1 ? 1 : 1 + Math.min(0.8, (this.level - 2) * 0.13);

        // Probabilità formazione aumenta col livello
        if (Math.random() < 0.25 + this.level * 0.08) {
            const formations = ['v', 'line', 'diamond'];
            const formation = formations[Math.floor(Math.random() * formations.length)];
            const enemies = EnemyFactory.createFormation(enemyType, formation, this);
            enemies.forEach(e => e.speed *= speedMultiplier);
            this.enemies.push(...enemies);
        } else {
            const enemies = EnemyFactory.createWave(enemyType, count, this, pattern);
            enemies.forEach(e => e.speed *= speedMultiplier);
            this.enemies.push(...enemies);
        }
    }

    spawnBoss() {
        const boss = EnemyFactory.createBoss(this);
        this.enemies.push(boss);
    }

    spawnBullet(x, y, vx, vy, owner) {
        const bullet = new Bullet(x, y, vx, vy, owner);
        this.bullets.push(bullet);
        return bullet;
    }

    spawnExplosion(x, y, size = 'medium') {
        const explosion = new Explosion(x, y, size);
        this.explosions.push(explosion);

        // Advanced particle explosion
        this.particles.emitExplosion(x, y, size);

        // Screen effects
        const shakeIntensity = size === 'large' ? 15 : size === 'medium' ? 8 : 4;
        this.postProcessing.shake(shakeIntensity, 0.2);

        this.sound.playExplosion();
        return explosion;
    }

    spawnPowerUp(x, y, type) {
        const powerUp = new PowerUp(x, y, type);
        this.powerUps.push(powerUp);
        return powerUp;
    }

    addScore(points) {
        const multiplier = 1 + this.combo * 0.1;
        const finalPoints = Math.floor(points * multiplier);
        this.score += finalPoints;

        // Score popup
        if (this.player) {
            this.scorePopups.push({
                x: this.player.position.x + this.player.width / 2,
                y: this.player.position.y - 20,
                value: finalPoints,
                life: 1,
                combo: this.combo
            });
        }
    }

    render() {
        const ctx = this.ctx;

        // Clear with gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, '#050a15');
        bgGrad.addColorStop(0.5, '#0a1525');
        bgGrad.addColorStop(1, '#051020');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw starfield
        this.starField.render(ctx, this.time);

        if (this.state === 'menu' || this.state === 'loading') {
            this.postProcessing.applyEffects(ctx, this.time);
            return;
        }

        // Draw particles (background layer)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.particles.render(ctx);
        ctx.restore();

        // Draw game objects
        this.powerUps.forEach(p => p.render(ctx, this.assets));
        this.bullets.forEach(b => b.render(ctx, this.assets));
        this.enemies.forEach(e => e.render(ctx, this.assets));

        // Rendering con zoom durante la celebrazione
        if (this.celebrating && this.player && this.player.active) {
            ctx.save();
            const playerCenterX = this.player.position.x + this.player.width / 2;
            const playerCenterY = this.player.position.y + this.player.height / 2;

            // Applica zoom centrato sul player
            ctx.translate(playerCenterX, playerCenterY);
            ctx.scale(this.celebrationZoom, this.celebrationZoom);
            ctx.translate(-playerCenterX, -playerCenterY);

            this.player.render(ctx, this.assets);
            ctx.restore();

            // Renderizza testo celebrazione
            this.renderCelebration(ctx);
        } else if (this.player && this.player.active) {
            this.player.render(ctx, this.assets);
        }

        this.explosions.forEach(e => e.render(ctx, this.assets));

        // Render game over animation
        if (this.state === 'gameover' && this.gameOverAnimating) {
            this.renderGameOverAnimation(ctx);
        }

        // Draw score popups
        this.renderScorePopups(ctx);

        // Apply post-processing
        this.postProcessing.applyEffects(ctx, this.time);

        // Draw HUD (on top of everything)
        this.renderHUD();
        
        // Draw touch controls (mobile only, on top of everything)
        if (this.input && this.input.isMobile && this.state === 'playing') {
            this.input.renderTouchControls(ctx, this.player);
        }
    }

    renderCelebration(ctx) {
        const progress = this.celebrationTimer / this.celebrationDuration;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 3;

        ctx.save();

        // Sfondo semi-trasparente
        const bgAlpha = Math.min(0.6, progress * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha * 0.5})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Raggi luminosi dal centro
        if (progress > 0.1) {
            ctx.globalCompositeOperation = 'lighter';
            const rayCount = 12;
            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2 + this.time * 0.5;
                const rayLength = 300 + Math.sin(this.time * 3 + i) * 50;

                const rayGrad = ctx.createLinearGradient(
                    centerX, centerY,
                    centerX + Math.cos(angle) * rayLength,
                    centerY + Math.sin(angle) * rayLength
                );
                rayGrad.addColorStop(0, `rgba(255, 215, 0, ${0.4 * Math.min(1, progress * 3)})`);
                rayGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

                ctx.strokeStyle = rayGrad;
                ctx.lineWidth = 20 + Math.sin(this.time * 5 + i * 2) * 10;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(angle) * rayLength,
                    centerY + Math.sin(angle) * rayLength
                );
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Testo principale con animazione
        const textScale = progress < 0.2 ? progress / 0.2 * 1.5 :
            progress < 0.3 ? 1.5 - (progress - 0.2) / 0.1 * 0.5 : 1;
        const textAlpha = Math.min(1, progress * 4);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Ombra/glow del testo
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 30;

        // LEVEL X COMPLETE!
        ctx.font = `bold ${Math.floor(28 * textScale)}px Orbitron, Arial`;
        ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`;
        ctx.fillText(this.celebrationText, centerX, centerY - 20);

        // Sottotitolo
        if (progress > 0.3) {
            const subAlpha = Math.min(1, (progress - 0.3) * 5);
            ctx.font = `bold ${Math.floor(16)}px Orbitron, Arial`;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            ctx.fillStyle = `rgba(0, 255, 255, ${subAlpha})`;
            ctx.fillText(`+${1000 * (this.level + 1)} BONUS`, centerX, centerY + 25);
        }

        // Stelle/particelle decorative
        if (progress > 0.2) {
            const starAlpha = Math.min(1, (progress - 0.2) * 3);
            ctx.shadowBlur = 0;
            for (let i = 0; i < 20; i++) {
                const starAngle = (i / 20) * Math.PI * 2 + this.time * 2;
                const starDist = 80 + Math.sin(this.time * 4 + i) * 30;
                const starX = centerX + Math.cos(starAngle) * starDist;
                const starY = centerY + Math.sin(starAngle) * starDist;
                const starSize = 3 + Math.sin(this.time * 6 + i * 3) * 2;

                ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Testo "GET READY" verso la fine
        if (progress > 0.7) {
            const readyAlpha = Math.sin((progress - 0.7) / 0.3 * Math.PI * 4) * 0.5 + 0.5;
            ctx.font = 'bold 20px Orbitron, Arial';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(255, 100, 0, ${readyAlpha})`;
            ctx.fillText('GET READY!', centerX, centerY + 70);
        }

        ctx.restore();
    }

    renderGameOverAnimation(ctx) {
        const progress = this.gameOverTimer / this.gameOverDuration;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        ctx.save();

        // Sfondo rosso che si intensifica
        const bgAlpha = Math.min(0.7, progress * 1.5);
        const redOverlay = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.canvas.height);
        redOverlay.addColorStop(0, `rgba(50, 0, 0, ${bgAlpha * 0.3})`);
        redOverlay.addColorStop(0.5, `rgba(80, 0, 0, ${bgAlpha * 0.5})`);
        redOverlay.addColorStop(1, `rgba(20, 0, 0, ${bgAlpha * 0.8})`);
        ctx.fillStyle = redOverlay;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Linee di glitch/interferenza
        if (progress > 0.2) {
            ctx.globalCompositeOperation = 'lighter';
            const glitchIntensity = Math.sin(this.time * 30) * 0.5 + 0.5;

            for (let i = 0; i < 10; i++) {
                const y = Math.random() * this.canvas.height;
                const height = 2 + Math.random() * 4;
                ctx.fillStyle = `rgba(255, 0, 0, ${glitchIntensity * 0.3 * (1 - progress)})`;
                ctx.fillRect(0, y, this.canvas.width, height);
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Testo GAME OVER con effetto drammatico
        if (progress > 0.4) {
            const textProgress = (progress - 0.4) / 0.6;
            const textScale = textProgress < 0.3 ?
                1.5 + Math.sin(textProgress / 0.3 * Math.PI) * 0.5 :
                1.5;
            const textAlpha = Math.min(1, textProgress * 2);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Ombra multipla per effetto profondità
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30 + Math.sin(this.time * 5) * 10;

            // Testo principale
            ctx.font = `bold ${Math.floor(40 * textScale)}px Orbitron, Arial`;

            // Effetto glitch sul testo
            const glitchOffset = Math.sin(this.time * 25) * 3 * (1 - textProgress);

            // Layer rosso
            ctx.fillStyle = `rgba(255, 0, 0, ${textAlpha * 0.5})`;
            ctx.fillText('GAME OVER', centerX + glitchOffset, centerY - 30);

            // Layer principale
            ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
            ctx.fillText('GAME OVER', centerX, centerY - 30);

            // Sottotitolo con punteggio
            if (progress > 0.6) {
                const subAlpha = Math.min(1, (progress - 0.6) * 4);
                ctx.font = 'bold 16px Orbitron, Arial';
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 15;
                ctx.fillStyle = `rgba(255, 170, 0, ${subAlpha})`;
                ctx.fillText(`FINAL SCORE: ${this.score.toLocaleString()}`, centerX, centerY + 20);

                // High score
                if (this.score >= this.highScore && this.highScore > 0) {
                    ctx.font = 'bold 14px Orbitron, Arial';
                    ctx.shadowColor = '#ffff00';
                    ctx.fillStyle = `rgba(255, 255, 0, ${subAlpha * Math.abs(Math.sin(this.time * 4))})`;
                    ctx.fillText('★ NEW HIGH SCORE! ★', centerX, centerY + 50);
                }
            }
        }

        // Particelle di debris che cadono
        if (progress > 0.1) {
            const debrisAlpha = Math.min(1, (progress - 0.1) * 3) * (1 - progress * 0.5);
            ctx.shadowBlur = 0;

            for (let i = 0; i < 30; i++) {
                const seed = i * 1234.5678;
                const debrisX = centerX + Math.sin(seed) * 150 + Math.sin(this.time * 2 + i) * 20;
                const debrisY = centerY - 100 + (this.gameOverTimer * 100 * (0.5 + Math.sin(seed * 2) * 0.5)) % (this.canvas.height + 100);
                const debrisSize = 2 + Math.sin(seed * 3) * 2;
                const rotation = this.time * (2 + Math.sin(seed) * 3);

                ctx.save();
                ctx.translate(debrisX, debrisY);
                ctx.rotate(rotation);

                // Colore debris (arancione/rosso)
                const hue = Math.sin(seed) > 0 ? '255, 100, 0' : '255, 50, 50';
                ctx.fillStyle = `rgba(${hue}, ${debrisAlpha * 0.8})`;
                ctx.fillRect(-debrisSize, -debrisSize / 2, debrisSize * 2, debrisSize);

                ctx.restore();
            }
        }

        ctx.restore();
    }

    renderScorePopups(ctx) {
        ctx.save();
        this.scorePopups.forEach(popup => {
            const alpha = popup.life;
            const scale = 1 + (1 - popup.life) * 0.5;

            ctx.globalAlpha = alpha;
            ctx.font = `bold ${Math.floor(14 * scale)}px Orbitron, Arial`;
            ctx.textAlign = 'center';

            // Glow effect
            ctx.shadowColor = popup.combo > 0 ? '#ffaa00' : '#00ffff';
            ctx.shadowBlur = 10;

            ctx.fillStyle = popup.combo > 0 ? '#ffdd44' : '#ffffff';
            ctx.fillText(`+${popup.value}`, popup.x, popup.y);

            if (popup.combo > 1) {
                ctx.font = `bold ${Math.floor(10 * scale)}px Orbitron, Arial`;
                ctx.fillStyle = '#ff8800';
                ctx.fillText(`x${popup.combo} COMBO!`, popup.x, popup.y - 15);
            }
        });
        ctx.restore();
    }

    renderHUD() {
        const ctx = this.ctx;
        const padding = 12;

        ctx.save();

        // HUD background
        const hudGrad = ctx.createLinearGradient(0, 0, 0, 60);
        hudGrad.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
        hudGrad.addColorStop(1, 'rgba(0, 10, 20, 0)');
        ctx.fillStyle = hudGrad;
        ctx.fillRect(0, 0, this.canvas.width, 60);

        // Pause Button (disegnato sulla canvas)
        this.renderPauseButton(ctx);

        // Score
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#88ccff';
        ctx.fillText('SCORE', padding, padding);

        ctx.font = 'bold 18px Orbitron, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 10;
        ctx.fillText(this.score.toLocaleString(), padding, padding + 18);
        ctx.shadowBlur = 0;

        // High Score
        ctx.font = '10px Rajdhani, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#668899';
        ctx.fillText('BEST', this.canvas.width / 2, padding);
        ctx.font = '14px Orbitron, Arial';
        ctx.fillStyle = '#aabbcc';
        ctx.fillText(this.highScore.toLocaleString(), this.canvas.width / 2, padding + 14);

        // Level
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#88ccff';
        ctx.fillText('LEVEL', this.canvas.width - padding, padding);

        ctx.font = 'bold 18px Orbitron, Arial';
        ctx.fillStyle = '#dddbd6';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 8;
        ctx.fillText(this.level.toString(), this.canvas.width - padding, padding + 18);
        ctx.shadowBlur = 0;

        // Health bar
        if (this.player) {
            const healthBarWidth = 120;
            const healthBarHeight = 8;
            const healthX = padding;
            const healthY = padding + 45;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(healthX - 1, healthY - 1, healthBarWidth + 2, healthBarHeight + 2);

            // Health gradient
            const healthPercent = this.player.health / this.player.maxHealth;
            const healthGrad = ctx.createLinearGradient(healthX, healthY, healthX + healthBarWidth, healthY);

            if (healthPercent > 0.5) {
                healthGrad.addColorStop(0, '#00ff88');
                healthGrad.addColorStop(1, '#00cc66');
            } else if (healthPercent > 0.25) {
                healthGrad.addColorStop(0, '#ffcc00');
                healthGrad.addColorStop(1, '#ff9900');
            } else {
                healthGrad.addColorStop(0, '#ff4444');
                healthGrad.addColorStop(1, '#cc0000');
            }

            ctx.fillStyle = healthGrad;
            ctx.fillRect(healthX, healthY, healthBarWidth * healthPercent, healthBarHeight);

            // Shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(healthX, healthY, healthBarWidth * healthPercent, healthBarHeight / 2);

            // Health segments
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 1; i < this.player.maxHealth; i++) {
                const segX = healthX + (healthBarWidth / this.player.maxHealth) * i;
                ctx.beginPath();
                ctx.moveTo(segX, healthY);
                ctx.lineTo(segX, healthY + healthBarHeight);
                ctx.stroke();
            }

            // Weapon level indicator
            const wpnY = healthY + healthBarHeight + 8;
            ctx.font = '10px Rajdhani, Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#668899';
            ctx.fillText('WEAPON', padding, wpnY);

            // Weapon level stars
            for (let i = 0; i < this.player.maxWeaponLevel; i++) {
                const starX = padding + 50 + i * 14;
                ctx.fillStyle = i < this.player.weaponLevel ? '#ffaa00' : '#333344';
                ctx.shadowColor = i < this.player.weaponLevel ? '#ff8800' : 'transparent';
                ctx.shadowBlur = i < this.player.weaponLevel ? 5 : 0;
                ctx.font = '12px Arial';
                ctx.fillText('★', starX, wpnY);
            }
            ctx.shadowBlur = 0;

            // Heat bar VERTICALE (barra surriscaldamento)
            const heatBarWidth = 12;
            const heatBarHeight = 60;
            const heatX = this.canvas.width - padding - heatBarWidth;
            const heatY = 70;
            const heatPercent = this.player.heat / this.player.maxHeat;

            // Background con bordo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(heatX - 2, heatY - 2, heatBarWidth + 4, heatBarHeight + 4);
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(heatX - 2, heatY - 2, heatBarWidth + 4, heatBarHeight + 4);

            // Heat color gradient (blu -> giallo -> rosso)
            let heatGrad = ctx.createLinearGradient(heatX, heatY + heatBarHeight, heatX, heatY);
            if (this.player.overheated) {
                // Lampeggia rosso quando surriscaldato
                const blink = Math.sin(this.time * 15) > 0;
                heatGrad.addColorStop(0, blink ? '#ff0000' : '#ff4444');
                heatGrad.addColorStop(1, blink ? '#ff4444' : '#ff0000');
            } else {
                heatGrad.addColorStop(0, '#00aaff');
                heatGrad.addColorStop(0.4, '#ffaa00');
                heatGrad.addColorStop(0.7, '#ff4400');
                heatGrad.addColorStop(1, '#ff0000');
            }

            // Disegna barra dal basso verso l'alto
            const filledHeight = heatBarHeight * heatPercent;
            ctx.fillStyle = heatGrad;
            ctx.fillRect(heatX, heatY + heatBarHeight - filledHeight, heatBarWidth, filledHeight);

            // Effetto shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(heatX, heatY + heatBarHeight - filledHeight, heatBarWidth / 3, filledHeight);

            // Tacche di riferimento
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 5; i++) {
                const tickY = heatY + (heatBarHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(heatX, tickY);
                ctx.lineTo(heatX + heatBarWidth, tickY);
                ctx.stroke();
            }

            // Label
            ctx.font = '9px Rajdhani, Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.player.overheated ? '#ff4444' : '#aabbcc';
            ctx.fillText(this.player.overheated ? 'HOT!' : 'HEAT', heatX + heatBarWidth / 2, heatY - 6);

            // evidenzia se surriscaldato
            if (this.player.overheated) {
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 10;
                ctx.strokeStyle = '#f89090';
                ctx.lineWidth = 2;
                ctx.strokeRect(heatX - 2, heatY - 2, heatBarWidth + 4, heatBarHeight + 4);
                ctx.shadowBlur = 0;
            }

            // Combo indicator
            if (this.combo > 0) {
                const comboX =  80;
                const comboY = healthY + 50;

                ctx.font = 'bold 12px Orbitron, Arial';
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffaa00';
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 10;
                ctx.fillText(`${this.combo}x COMBO`, comboX, comboY);

                // Combo timer bar
                const comboBarWidth = 60;
                const comboBarHeight = 3;
                const comboProgress = this.comboTimer / this.comboDuration;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(comboX - comboBarWidth, comboY + 5, comboBarWidth, comboBarHeight);
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(comboX - comboBarWidth, comboY + 15, comboBarWidth * comboProgress, comboBarHeight);

                ctx.shadowBlur = 0;
            }

            // Indicatori abilità per desktop (in basso a sinistra)
            if (!this.input.isMobile) {
                this.renderAbilityHUD(ctx);
            }
        }

        // Performance Monitor (in basso a sinistra, sopra le abilità)
        this.renderPerfMonitor(ctx);

        ctx.restore();
    }

    /**
     * Aggiorna l'UI dei bottoni abilità (ora canvas-based, nessuna operazione necessaria)
     */
    updateAbilityUI() {
        // I controlli touch sono ora renderizzati direttamente su canvas
        // Non è più necessario aggiornare elementi HTML
    }

    /**
     * Renderizza HUD abilità per desktop
     */
    renderAbilityHUD(ctx) {
        const padding = 12;
        const buttonSize = 50;
        const gap = 10;
        const baseY = this.canvas.height - padding - buttonSize;

        // Heal ability (Q)
        this.renderAbilityIcon(ctx, padding, baseY, buttonSize,
            '💚', 'Q', '#00ff88',
            this.player.healCooldown, this.player.healMaxCooldown);

        // Bomb ability (E)
        this.renderAbilityIcon(ctx, padding + buttonSize + gap, baseY, buttonSize,
            '💥', 'E', '#ff8844',
            this.player.bombCooldown, this.player.bombMaxCooldown);
    }

    /**
     * Renderizza singola icona abilità
     */
    renderAbilityIcon(ctx, x, y, size, icon, key, color, cooldown, maxCooldown) {
        const cooldownPercent = cooldown / maxCooldown;
        const isReady = cooldown <= 0;

        // Background
        ctx.fillStyle = isReady ? 'rgba(40, 40, 60, 0.8)' : 'rgba(20, 20, 30, 0.8)';
        ctx.strokeStyle = isReady ? color : 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 2;

        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 8);
        ctx.fill();
        ctx.stroke();

        // Cooldown overlay (si riempie dal basso)
        if (!isReady) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x + 2, y + 2 + (size - 4) * (1 - cooldownPercent),
                size - 4, (size - 4) * cooldownPercent);

            // Tempo rimanente
            ctx.font = 'bold 14px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(Math.ceil(cooldown).toString(), x + size / 2, y + size / 2);
        } else {
            // Icona
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, x + size / 2, y + size / 2 - 4);
        }

        // Key hint
        ctx.font = '10px Orbitron, Arial';
        ctx.fillStyle = isReady ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(key, x + size / 2, y + size - 8);

        // Glow when ready
        if (isReady) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    /**
     * Renderizza il monitor delle performance
     */
    renderPerfMonitor(ctx) {
        if (!this.showPerfMonitor) return;

        // Posizione: in basso a destra, sopra la heat bar
        const width = 95;
        const height = 55;
        const x = this.canvas.width - width -150;
        const y = this.canvas.height - height - 10;

        ctx.save();

        // Background semi-trasparente
        ctx.fillStyle = 'rgba(0, 10, 20, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // FPS con colore dinamico
        let fpsColor = '#00ff88';
        if (this.currentFPS < 30) fpsColor = '#ff4444';
        else if (this.currentFPS < 50) fpsColor = '#ffaa00';

        ctx.font = 'bold 18px Orbitron, Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = fpsColor;
        ctx.fillText(`${this.currentFPS}`, x + 6, y + 20);
        ctx.font = '10px Rajdhani, Arial';
        ctx.fillStyle = '#668899';
        ctx.fillText('FPS', x + 50, y + 20);

        // Stats compatte
        ctx.font = '9px Rajdhani, Arial';
        ctx.fillStyle = '#889999';
        ctx.fillText(`AVG ${this.avgFPS} | MIN ${this.minFPS}`, x + 6, y + 33);

        // Particelle e Mode su stessa riga
        const particleCount = this.particles ? this.particles.particles.length : 0;
        const modeIcons = { high: '🚀', medium: '⚖️', low: '🐢' };
        ctx.fillStyle = '#778888';
        ctx.fillText(`P:${particleCount}`, x + 6, y + 46);

        // Mode indicator con colore
        const modeColors = { high: '#00aaff', medium: '#ffaa00', low: '#88ff88' };
        ctx.fillStyle = modeColors[this.performanceMode] || '#fff';
        ctx.fillText(`${modeIcons[this.performanceMode]}${this.performanceMode.toUpperCase()}`, x + 40, y + 46);

        ctx.restore();
    }

    /**
     * Renderizza il bottone pausa sulla canvas
     */
    renderPauseButton(ctx) {
        const btn = this.pauseButtonRect;
        const x = this.canvas.width - btn.width - 12;
        const y = btn.y;
        const w = btn.width;
        const h = btn.height;

        ctx.save();

        const isHover = this.pauseButtonHover;

        // Glow effect on hover
        if (isHover) {
            ctx.shadowColor = 'rgba(0, 200, 255, 0.6)';
            ctx.shadowBlur = 15;
        }

        // Background gradient
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        if (isHover) {
            grad.addColorStop(0, 'rgba(0, 80, 150, 0.9)');
            grad.addColorStop(1, 'rgba(0, 50, 100, 0.9)');
        } else {
            grad.addColorStop(0, 'rgba(0, 50, 100, 0.7)');
            grad.addColorStop(1, 'rgba(0, 30, 60, 0.7)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = isHover
            ? 'rgba(0, 220, 255, 0.8)'
            : 'rgba(0, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // ==========================
        // Gear icon
        // ==========================
        const cx = x + w / 2;
        const cy = y + h / 2;

        const outerRadius = Math.min(w, h) * 0.28;
        const innerRadius = outerRadius * 0.6;
        const toothDepth = outerRadius * 0.25;
        const teeth = 8;

        ctx.save();
        ctx.translate(cx, cy);

        // Subtle rotation on hover
        if (isHover) {
            ctx.rotate(performance.now() * 0.0015);
        }

        ctx.fillStyle = isHover ? '#00ddff' : '#88ccff';
        ctx.beginPath();

        for (let i = 0; i < teeth; i++) {
            const a = (i / teeth) * Math.PI * 2;
            const b = ((i + 1) / teeth) * Math.PI * 2;

            ctx.lineTo(
                Math.cos(a) * (outerRadius + toothDepth),
                Math.sin(a) * (outerRadius + toothDepth)
            );
            ctx.lineTo(
                Math.cos(a + (b - a) * 0.35) * outerRadius,
                Math.sin(a + (b - a) * 0.35) * outerRadius
            );
            ctx.lineTo(
                Math.cos(a + (b - a) * 0.65) * outerRadius,
                Math.sin(a + (b - a) * 0.65) * outerRadius
            );
        }

        ctx.closePath();
        ctx.fill();

        // Inner hole
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';

        // Center dot
        ctx.fillStyle = isHover ? '#0ff' : '#aadfff';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }


    loadHighScore() {
        const saved = localStorage.getItem('spaceShooterHighScore');
        return saved ? parseInt(saved) : 0;
    }

    saveHighScore() {
        localStorage.setItem('spaceShooterHighScore', this.highScore.toString());
    }

    loadPerformanceMode() {
        const saved = localStorage.getItem('spaceShooterPerformance');
        return saved || 'high';
    }

    savePerformanceMode() {
        localStorage.setItem('spaceShooterPerformance', this.performanceMode);
    }

    /**
     * Imposta la modalità performance
     * @param {string} mode - 'high', 'medium', 'low'
     */
    setPerformanceMode(mode) {
        this.performanceMode = mode;
        this.savePerformanceMode();

        switch (mode) {
            case 'high':
                // Tutti gli effetti attivi - Massima qualità
                if (this.postProcessing) {
                    this.postProcessing.bloomEnabled = true;
                    this.postProcessing.vignetteEnabled = true;
                    this.postProcessing.scanLinesEnabled = true;
                    this.postProcessing.scanLinesOpacity = 0.08;
                    this.postProcessing.vignetteIntensity = 0.5;
                    this.postProcessing.crtEnabled = true;
                    this.postProcessing.createVignetteGradient();
                }
                if (this.particles) {
                    this.particles.maxParticles = 800;
                    this.particles.particleMultiplier = 1.5;
                    this.particles.glowEnabled = true;
                    this.particles.trailEnabled = true;
                }
                if (this.starField) {
                    this.starField.setQuality('high');
                }
                // Esplosioni più grandi
                this.explosionScale = 1.5;
                break;

            case 'medium':
                // Effetti bilanciati
                if (this.postProcessing) {
                    this.postProcessing.bloomEnabled = true;
                    this.postProcessing.vignetteEnabled = true;
                    this.postProcessing.scanLinesEnabled = false;
                    this.postProcessing.vignetteIntensity = 0.3;
                    this.postProcessing.crtEnabled = false;
                    this.postProcessing.createVignetteGradient();
                }
                if (this.particles) {
                    this.particles.maxParticles = 300;
                    this.particles.particleMultiplier = 0.6;
                    this.particles.glowEnabled = true;
                    this.particles.trailEnabled = false;
                }
                if (this.starField) {
                    this.starField.setQuality('medium');
                }
                this.explosionScale = 1.0;
                break;

            case 'low':
                // Minimo effetti per massima performance
                if (this.postProcessing) {
                    this.postProcessing.bloomEnabled = false;
                    this.postProcessing.vignetteEnabled = false;
                    this.postProcessing.scanLinesEnabled = false;
                    this.postProcessing.crtEnabled = false;
                }
                if (this.particles) {
                    this.particles.maxParticles = 80;
                    this.particles.particleMultiplier = 0.15;
                    this.particles.glowEnabled = false;
                    this.particles.trailEnabled = false;
                }
                if (this.starField) {
                    this.starField.setQuality('low');
                }
                this.explosionScale = 0.7;
                break;
        }

        console.log(`⚡ Performance mode set to: ${mode}`);
    }

    /**
     * Applica il performance mode salvato (chiamato dopo init)
     */
    applyPerformanceMode() {
        this.setPerformanceMode(this.performanceMode);

        // Aggiorna UI bottoni
        if (this.perfButtons) {
            this.perfButtons.forEach(btn => {
                if (btn.dataset.perf === this.performanceMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }
}
