// Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Initialize game state
        this.score = 0;
        this.coinsCollected = 0;
        this.highestRow = GAME_CONFIG.PLAYER_START_Z;
        this.isGameOver = false;
        this.isPaused = false;
        
        // Setup camera
        this.setupCamera();
        
        // Create managers
        this.terrainManager = new TerrainManager(this);
        this.obstacleManager = new ObstacleManager(this);
        
        // Create player
        this.player = new Player(this, GAME_CONFIG.PLAYER_START_X, GAME_CONFIG.PLAYER_START_Z);
        
        // Setup input
        this.setupInput();
        
        // Setup audio (placeholder - will add real sounds)
        this.setupAudio();
        
        // Update UI
        this.updateScoreDisplay();
        
        // Start game loop
        this.time.addEvent({
            delay: 100,
            callback: this.gameLoop,
            callbackScope: this,
            loop: true
        });
    }

    setupCamera() {
        // Vista top-down pulita - NO rotazione!
        this.cameras.main.setBounds(-1000, -10000, 10000, 20000);
        this.cameras.main.setZoom(1.2);
        
        // Centra sulla posizione iniziale del player
        const playerX = GAME_CONFIG.PLAYER_START_X * GAME_CONFIG.TILE_SIZE;
        const playerY = GAME_CONFIG.PLAYER_START_Z * GAME_CONFIG.TILE_SIZE;
        this.cameras.main.centerOn(playerX, playerY);
    }

    setupInput() {
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        
        // Touch/swipe controls for mobile
        if (Utils.isMobile()) {
            this.setupTouchControls();
        }
        
        // Key press handlers
        this.input.keyboard.on('keydown', (event) => {
            if (this.isGameOver || this.isPaused) return;
            
            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.UP || event.keyCode === Phaser.Input.Keyboard.KeyCodes.W) {
                this.player.move('up');
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN || event.keyCode === Phaser.Input.Keyboard.KeyCodes.S) {
                this.player.move('down');
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.LEFT || event.keyCode === Phaser.Input.Keyboard.KeyCodes.A) {
                this.player.move('left');
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.RIGHT || event.keyCode === Phaser.Input.Keyboard.KeyCodes.D) {
                this.player.move('right');
            }
        });
    }

    setupTouchControls() {
        let startX = 0;
        let startY = 0;
        
        this.input.on('pointerdown', (pointer) => {
            startX = pointer.x;
            startY = pointer.y;
        });
        
        this.input.on('pointerup', (pointer) => {
            if (this.isGameOver || this.isPaused) return;
            
            const deltaX = pointer.x - startX;
            const deltaY = pointer.y - startY;
            const threshold = 30;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > threshold) {
                    this.player.move('right');
                } else if (deltaX < -threshold) {
                    this.player.move('left');
                }
            } else {
                if (deltaY > threshold) {
                    this.player.move('down');
                } else if (deltaY < -threshold) {
                    this.player.move('up');
                }
            }
        });
    }

    setupAudio() {
        // Audio disabled for now - implement later with actual sound files
        // this.sound.add('hop', { volume: 0.3 });
        // this.sound.add('coin', { volume: 0.5 });
        // this.sound.add('death', { volume: 0.7 });
    }

    gameLoop() {
        if (this.isGameOver || this.isPaused) return;
        
        // Update terrain generation (sempre genera in avanti)
        this.terrainManager.update(this.player.gridZ);
        
        // Spawn obstacles for new rows
        for (let z = this.player.gridZ - 5; z >= this.player.gridZ - 15; z--) {
            const terrain = this.terrainManager.getTerrain(z);
            if (terrain && !terrain.obstaclesSpawned) {
                this.obstacleManager.spawnObstacles(z, terrain);
                terrain.obstaclesSpawned = true;
            }
        }
        
        // Update camera to follow player
        this.updateCamera();
        
        // CHECK COLLISIONI CONTINUE - CRITICO!
        if (this.player.isAlive) {
            this.player.checkCollisions();
        }
    }

    update(time, delta) {
        if (this.isGameOver || this.isPaused) return;
        
        // Update obstacles
        this.obstacleManager.update(delta / 1000);
    }

    updateCamera() {
        // Segui player smoothly in stile Crossy Road
        const playerX = this.player.gridX * GAME_CONFIG.TILE_SIZE;
        const playerY = this.player.gridZ * GAME_CONFIG.TILE_SIZE;
        
        // Smooth follow con offset per mostrare più strada davanti
        const targetX = playerX;
        const targetY = playerY - 150; // Offset per vedere avanti
        
        this.cameras.main.scrollX = Phaser.Math.Linear(
            this.cameras.main.scrollX,
            targetX - (this.cameras.main.width / 2) / this.cameras.main.zoom,
            0.08
        );
        
        this.cameras.main.scrollY = Phaser.Math.Linear(
            this.cameras.main.scrollY,
            targetY - (this.cameras.main.height / 2) / this.cameras.main.zoom,
            0.08
        );
    }

    onPlayerMove(newZ, direction) {
        // Score for moving forward
        if (direction === 'up' && newZ < this.highestRow) {
            this.highestRow = newZ;
            this.addScore(GAME_CONFIG.SCORE_PER_ROW);
        }
        
        // Generate obstacles for upcoming rows
        for (let i = 1; i <= GAME_CONFIG.GENERATION_DISTANCE; i++) {
            const checkZ = newZ - i;
            const terrain = this.terrainManager.getTerrain(checkZ);
            if (terrain && !terrain.obstaclesSpawned) {
                this.obstacleManager.spawnObstacles(checkZ, terrain);
                terrain.obstaclesSpawned = true;
            }
        }
    }

    addScore(points) {
        this.score += points;
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        const scoreEl = document.getElementById('score-display');
        if (scoreEl) {
            scoreEl.textContent = this.score;
        }
    }

    gameOver() {
        this.isGameOver = true;
        
        // Hide instructions
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.style.display = 'none';
        
        // Show game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScore = document.getElementById('final-score');
        const coinsCollected = document.getElementById('coins-collected');
        
        if (gameOverScreen) gameOverScreen.style.display = 'block';
        if (finalScore) finalScore.textContent = `Score: ${this.score}`;
        if (coinsCollected) coinsCollected.textContent = `Coins: ${this.coinsCollected}`;
        
        // Send score to platform
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.isInitialized) {
            try {
                PlatformSDK.sendScore(this.score);
                console.log('✅ Score sent to platform:', this.score);
            } catch (error) {
                console.warn('Failed to send score:', error);
            }
        } else {
            console.warn('PlatformSDK not available or not initialized');
        }
    }

    restart() {
        // Reset game state
        this.score = 0;
        this.coinsCollected = 0;
        this.highestRow = GAME_CONFIG.PLAYER_START_Z;
        this.isGameOver = false;
        
        // Reset managers
        this.terrainManager.reset();
        this.obstacleManager.reset();
        this.player.reset();
        
        // Reset camera
        this.cameras.main.scrollY = 0;
        
        // Update UI
        this.updateScoreDisplay();
        
        // Hide game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        
        // Show instructions
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.style.display = 'block';
    }

    pause() {
        this.isPaused = true;
        this.scene.pause();
    }

    resume() {
        this.isPaused = false;
        this.scene.resume();
    }

    shutdown() {
        // Cleanup
        if (this.terrainManager) this.terrainManager.destroy();
        if (this.obstacleManager) this.obstacleManager.destroy();
        if (this.player) this.player.destroy();
    }
}
