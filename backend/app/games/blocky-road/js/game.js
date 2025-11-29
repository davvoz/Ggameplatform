// game.js - Main Three.js game controller

class BlockyRoadGame {
    constructor() {
        console.log('🎮 Blocky Road v2.1 - maxZ score fix loaded');
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.player = null;
        this.terrain = null;
        this.obstacles = null;
        this.particles = null;
        this.touchControls = null;
        this.audio = null;
        
        this.score = 0;
        this.baseScore = 0;  // Track max gridZ separately from total score
        this.coins = 0;
        this.highScore = 0;
        
        this.isGameOver = false;
        this.isPaused = false;
        this.isStarted = false;
        
        // Input - optimized for fast gameplay
        this.keys = {};
        this.inputCooldown = 0;
        this.queuedInput = null;  // Queue one input while in cooldown
        
        // Rising water/danger zone mechanic (like Crossy Road)
        this.dangerZone = -15; // Start far behind player
        this.dangerZoneSpeed = 0.003; // Slower, constant forward movement
        this.dangerZoneActive = false; // Activate after first move
        this.lastTime = null; // For delta time calculation
    }
    
    async init() {
        console.log('🎮 Initializing Blocky Road Three.js');
        
        const loadingProgress = document.getElementById('loadingProgress');
        const updateProgress = (percent) => {
            if (loadingProgress) loadingProgress.style.width = percent + '%';
        };
        
        // Setup Three.js scene
        updateProgress(10);
        this.setupScene();
        this.setupLights();
        
        // Create game systems
        updateProgress(30);
        this.audio = new AudioManager();
        this.particles = new ParticleSystem(this.scene);
        this.terrain = new TerrainGenerator(this.scene);
        this.obstacles = new ObstacleManager(this.scene, this.terrain);
        this.player = new Player(this.scene, this.particles);
        this.camera = new CrossyCamera(this.scene, this.renderer);
        
        // Generate initial terrain
        updateProgress(50);
        this.terrain.generateInitialTerrain();
        
        console.log('🌍 Terrain generated, rows:', this.terrain.rows.length);
        console.log('📷 Camera position:', this.camera.getCamera().position);
        console.log('🎥 Scene children:', this.scene.children.length);
        
        // Setup input
        updateProgress(70);
        this.setupInput();
        
        // Setup touch controls
        this.touchControls = new TouchControls(this);
        
        // Death line system (chases player from behind)
        this.deathLineZ = -7; // Starts at minimum distance from spawn (player at 0, distance 7)
        this.deathLineSpeed = 1.0 / 60; // 1 block per second (divided by 60fps)
        this.deathLineMinDistance = 7; // Minimum distance behind player (safe buffer)
        this.deathLineEnabled = false; // Enable after player moves
        
        // Create danger zone visual indicator
        this.createDangerZone();
        
        // Setup UI
        updateProgress(85);
        this.setupUI();
        
        // Initialize SDK
        await this.initSDK();
        
        // Start animation loop
        this.animate();
        
        // Hide loading, show start screen
        updateProgress(100);
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'block';
        }, 500);
        
        console.log('✅ Game initialized');
    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            precision: 'highp'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.style.display = 'block';
        document.body.appendChild(this.renderer.domElement);
        
        console.log('🎨 Renderer created:', window.innerWidth, 'x', window.innerHeight);
    }
    
    setupLights() {
        // Ambient light (brighter)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Directional light (sun) with shadows
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.dirLight.position.set(10, 20, 10);
        this.dirLight.castShadow = true;
        
        // Shadow camera settings - only playable area for better performance
        this.dirLight.shadow.camera.left = -10;   // Slightly wider than playable area (-7 to 7)
        this.dirLight.shadow.camera.right = 10;
        this.dirLight.shadow.camera.top = 25;     // Forward visibility
        this.dirLight.shadow.camera.bottom = -15; // Behind player
        this.dirLight.shadow.camera.near = 1;
        this.dirLight.shadow.camera.far = 50;     // Reduced from 150
        this.dirLight.shadow.mapSize.width = 2048; // Reduced from 4096 for softer edges
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.0005; // Less bias for softer shadows
        this.dirLight.shadow.normalBias = 0.05; // Higher for smoother edges
        this.dirLight.shadow.radius = 8; // Very soft blur
        
        this.scene.add(this.dirLight);
        
        // Hemisphere light for better ambient
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x5FAD56, 0.5);
        this.scene.add(hemiLight);
    }
    
    createDangerZone() {
        // No visual fire wall - death line is invisible
        // Camera will follow the death line advancement instead
        
        // Create boundary shadows (left and right)
        this.createBoundaryShadows();
    }
    
    createBoundaryShadows() {
        // Create boundary shadows covering area OUTSIDE playable zone
        // Playable area: -7 to +7, Map extends to -25 to +25
        // Shadows should cover from -25 to -7 (left) and +7 to +25 (right)
        const shadowWidth = 18; // Width of shadow area (from edge to playable boundary)
        const shadowGeometry = new THREE.PlaneGeometry(shadowWidth, 200);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        // Left boundary shadow: covers x=-25 to x=-7 (center at -16)
        const leftShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        leftShadow.rotation.x = -Math.PI / 2;
        leftShadow.position.set(-16, 0.5, 0); // -25 + 9 = -16 (center of -25 to -7)
        leftShadow.renderOrder = 999;
        this.scene.add(leftShadow);
        
        // Right boundary shadow: covers x=+7 to x=+25 (center at +16)
        const rightShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
        rightShadow.rotation.x = -Math.PI / 2;
        rightShadow.position.set(16, 0.5, 0); // 7 + 9 = 16 (center of +7 to +25)
        rightShadow.renderOrder = 999;
        this.scene.add(rightShadow);
        
        // Store references to update position with camera
        this.boundaryShadows = [leftShadow, rightShadow];
    }
    
    setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            // Prevent double-triggering from key repeat
            if (this.keys[key]) return;
            
            this.keys[key] = true;
            
            if (!this.isStarted) {
                this.startGame();
                return;
            }
            
            // Instant input queuing for arrow keys/WASD
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
                // Trigger handleInput immediately for responsive feel
                this.handleInput();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupUI() {
        // Start button
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Mute button
        const muteButton = document.getElementById('muteButton');
        if (muteButton) {
            muteButton.addEventListener('click', () => {
                const isMuted = this.audio.toggleMute();
                muteButton.textContent = isMuted ? '🔇' : '🔊';
            });
        }
    }
    
    async initSDK() {
        if (typeof PlatformSDK !== 'undefined') {
            await PlatformSDK.init();
            console.log('📡 Platform SDK initialized');
        } else {
            console.warn('⚠️ PlatformSDK not available');
        }
    }
    
    startGame() {
        if (this.isStarted) return;
        
        this.isStarted = true;
        document.getElementById('startScreen').style.display = 'none';
        
        // Initialize audio (requires user interaction)
        this.audio.init();
        
        console.log('🎮 Game started!');
    }
    
    restartGame() {
        // Hide game over screen
        document.getElementById('gameOver').style.display = 'none';
        
        // Reset score (will trigger session creation in RuntimeShell)
        this.score = 0;
        this.baseScore = 0;
        this.coins = 0;
        this.updateUI();
        
        // Reset game state
        this.isGameOver = false;
        
        // Clear and regenerate
        this.terrain.clear();
        this.obstacles.clear();
        this.particles.clear();
        
        // Reset difficulty to easy
        this.terrain.updateScore(0);
        this.obstacles.updateScore(0);
        
        this.terrain.generateInitialTerrain();
        this.player.reset(0, 0);
        
        // Reset death line (invisible)
        this.deathLineZ = -7; // Player spawns at 0, so death line at -7 maintains correct distance
        this.deathLineEnabled = false;
        
        console.log('🔄 Game restarted');
        
        // Send score=0 to trigger session restart detection
        if (typeof PlatformSDK !== 'undefined') {
            PlatformSDK.sendScore(0);
        }
    }
    
    handleInput() {
        if (this.inputCooldown > 0) {
            this.inputCooldown--;
            return;
        }
        
        let dx = 0, dz = 0;
        
        if (this.keys['arrowup'] || this.keys['w']) {
            dz = 1;
        } else if (this.keys['arrowdown'] || this.keys['s']) {
            dz = -1;
        } else if (this.keys['arrowleft'] || this.keys['a']) {
            dx = 1;  // Swapped: left now goes right in world space
        } else if (this.keys['arrowright'] || this.keys['d']) {
            dx = -1; // Swapped: right now goes left in world space
        }
        
        if (dx !== 0 || dz !== 0) {
            // Process immediately - no queuing needed
            this.processMove(dx, dz);
        }
    }
    
    processMove(dx, dz) {
        const moved = this.player.move(dx, dz, () => {
            this.checkCollisions();
        });
        
        if (moved) {
            this.inputCooldown = 1;  // 1 frame cooldown for reliable fast input
            
            // Score tracking: increment by 1 for each forward step
            if (dz > 0) {
                const currentGridZ = this.player.gridZ;
                if (currentGridZ > this.baseScore) {
                    this.baseScore = currentGridZ;
                    this.score++;  // Simply increment by 1 for forward movement
                    this.updateUI();
                }
            }
        }
    }
    
    checkCollisions() {
        const playerPos = this.player.getPosition();
        
        // Check water drowning
        if (this.terrain.isWater(playerPos.x, playerPos.z)) {
            const platforms = this.obstacles.getPlatformsAt(playerPos.z);
            
            let onPlatform = false;
            let bestPlatform = null;
            let bestDistance = Infinity;
            
            // Find closest platform that player is on
            for (const platform of platforms) {
                const logLeft = platform.mesh.position.x - (platform.length / 2);
                const logRight = platform.mesh.position.x + (platform.length / 2);
                
                if (playerPos.worldX >= logLeft - 0.4 && playerPos.worldX <= logRight + 0.4) {
                    // Calculate distance to platform center
                    const distance = Math.abs(playerPos.worldX - platform.mesh.position.x);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestPlatform = platform;
                    }
                    onPlatform = true;
                }
            }
            
            if (onPlatform && bestPlatform) {
                // Attach to closest platform, preserving lateral position
                if (this.player.currentPlatform !== bestPlatform) {
                    this.player.attachToPlatform(bestPlatform);
                }
            } else {
                this.player.detachFromPlatform();
                this.gameOver('💧 Drowned!');
                return;
            }
        } else {
            this.player.detachFromPlatform();
        }
        
        // Check vehicle collision
        if (this.obstacles.checkVehicleCollision(playerPos)) {
            this.gameOver('Hit by vehicle!');
            return;
        }
        
        // Check coin collection
        const coin = this.obstacles.checkCoinCollision(playerPos, (coin) => {
            if (!this.coinTypes) {
                this.coinTypes = { steem: 0, bitcoin: 0 };
            }
            this.coins++;
            // Conta per tipo
            if (coin.coinType && this.coinTypes.hasOwnProperty(coin.coinType)) {
                this.coinTypes[coin.coinType]++;
            } else {
                this.coinTypes['steem']++;
            }
            // Score: STEEM = 1, Bitcoin = 5
            if (coin.coinType === 'bitcoin') {
                this.score += 5;
            } else {
                this.score += 1;
            }
            this.updateUI();
            this.particles.createCoinParticles(coin.mesh.position);
            this.audio.play('coin');
        });
    }
    
    gameOver(reason) {
        if (this.isGameOver) return;
        
        console.log('💀 Game Over:', reason);
        this.isGameOver = true;
        
        // Send final score only at game over
        if (typeof PlatformSDK !== 'undefined') {
            PlatformSDK.sendScore(this.score);
        }
        
        // Determine death type based on reason
        const inWater = reason.includes('Drowned') || reason.includes('💧');
        this.player.die(inWater);
        
        // Play death sound
        this.audio.play('death');
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
        
        // Show game over screen
        setTimeout(() => {
            document.getElementById('finalScore').textContent = `Score: ${this.score}`;
            document.getElementById('finalCoins').textContent = '';
            document.getElementById('gameOver').style.display = 'block';
        }, 500);
        
        // Send to SDK - grant XP every game
        if (typeof PlatformSDK !== 'undefined') {
            try {
                PlatformSDK.gameOver(this.score, {
                    coins: this.coins,
                    reason: reason,
                    timestamp: Date.now()
                });
                console.log(`📡 Game over sent to SDK: score=${this.score}`);
            } catch (e) {
                console.error('⚠️ Failed to send game over to SDK:', e);
            }
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('coins').textContent = `🪙 ${this.coins}`;
    }
    
    update(deltaTime = 16) {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;
        
        const frameStart = performance.now();
        
        // Handle input
        this.handleInput();
        
        // Update game systems
        const playerPos = this.player.getPosition();
        this.player.update();
        this.terrain.update(playerPos.z, this.score);
        
        // Update shadow camera to follow player
        this.dirLight.target.position.set(playerPos.worldX, 0, playerPos.worldZ);
        this.dirLight.position.set(playerPos.worldX + 10, 20, playerPos.worldZ + 10);
        this.dirLight.target.updateMatrixWorld();
        
        // Update obstacles with current score for difficulty progression
        this.obstacles.updateScore(this.score);
        this.obstacles.update(playerPos.z);
        
        this.particles.update();
        
        // Rising danger zone mechanic (like Crossy Road's water)
        // DISABLED TEMPORARILY
        // this.updateDangerZone(playerPos.z, deltaTime);
        
        // Continuous collision checking (only when player stopped or every 3rd frame while moving)
        if (!this.player.isMoving) {
            this.checkCollisions();
        } else {
            if (!this.collisionCheckCounter) this.collisionCheckCounter = 0;
            this.collisionCheckCounter++;
            if (this.collisionCheckCounter % 3 === 0) {
                this.checkCollisions();
            }
        }
        
        // Enable death line when player moves forward past Z=2
        if (!this.deathLineEnabled && playerPos.z > 2) {
            this.deathLineEnabled = true;
            console.log('💀 Death line activated!');
        }
        
        // Update death line (chases player from behind)
        if (this.deathLineEnabled) {
            // Death line ALWAYS advances at 1 block per second
            this.deathLineZ += this.deathLineSpeed;
            
            // Calculate distance from player
            const distanceFromPlayer = playerPos.z - this.deathLineZ;
            
            // If player advanced and distance exceeds minimum, jump death line to maintain minimum distance
            // This only happens when player moves FORWARD, not backward or sideways
            const targetDeathLineZ = playerPos.z - this.deathLineMinDistance;
            if (targetDeathLineZ > this.deathLineZ) {
                // Player moved forward beyond safe distance, death line catches up
                this.deathLineZ = targetDeathLineZ;
            }
            
            // Check if death line caught the player
            if (playerPos.z < this.deathLineZ) {
                console.log(`💀 Death! Player Z=${playerPos.z.toFixed(2)}, Death Line Z=${this.deathLineZ.toFixed(2)}`);
                this.gameOver('Troppo lento! Sei stato raggiunto!');
            }
        }
        
        // Update camera to follow death line advancement (Crossy Road style)
        // Camera ALWAYS advances with death line, never stops
        // Death line is 2 blocks behind camera center (closer to bottom edge)
        const cameraTargetZ = this.deathLineZ + 8;
        
        // Create target that uses player's actual position for smooth X following
        // but uses death-line-driven Z for constant forward pressure
        const cameraTarget = {
            x: playerPos.x,
            y: playerPos.y,
            z: cameraTargetZ
        };
        this.camera.follow(cameraTarget);
        
        // Update boundary shadows to follow camera
        if (this.boundaryShadows) {
            this.boundaryShadows.forEach(shadow => {
                shadow.position.z = playerPos.z;
            });
        }
        
        // Log slow frames with object counts
        const frameTime = performance.now() - frameStart;
        if (frameTime > 16.67) { // Slower than 60fps
            const obstacleCount = this.obstacles.obstacles.length;
            const platformCount = this.obstacles.platforms.length;
            const coinCount = this.obstacles.coins.length;
            const particleCount = this.particles.particles.length;
            const terrainRowCount = this.terrain.rows.length;
            
            console.warn(`⏱️ Slow frame: ${frameTime.toFixed(2)}ms | Obstacles:${obstacleCount} Platforms:${platformCount} Coins:${coinCount} Particles:${particleCount} TerrainRows:${terrainRowCount}`);
        }
        if (frameTime > 33) { // Slower than 30fps
            console.error(`🔴 VERY SLOW frame: ${frameTime.toFixed(2)}ms`);
        }
    }
    
    updateDangerZone(playerZ, deltaTime) {
        // Activate danger zone after player moves forward
        if (!this.dangerZoneActive && playerZ > 2) {
            this.dangerZoneActive = true;
            this.dangerZone = playerZ - 10; // Start 8 units behind
        }
        
        if (!this.dangerZoneActive) {
            this.dangerZonePlane.visible = false;
            return;
        }
        
        // Danger zone always moves forward (like Crossy Road water)
        this.dangerZone += this.dangerZoneSpeed * deltaTime;
        
        // Keep minimum distance behind player
        const minDistance = 10;
        if (this.dangerZone < playerZ - minDistance) {
            this.dangerZone = playerZ - minDistance;
        }
        
        // Update visual indicator
        this.dangerZonePlane.visible = true;
        this.dangerZonePlane.position.z = this.dangerZone;
        
        // Pulsating effect for urgency
        const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.4;
        this.dangerZonePlane.material.opacity = pulse;
        
        // Check if danger caught the player (with buffer)
        if (this.dangerZone >= playerZ - 1.0) {
            this.gameOver('⏱️ Too slow!');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate delta time for smooth updates
        const now = performance.now();
        const deltaTime = this.lastTime ? now - this.lastTime : 16;
        this.lastTime = now;
        
        // Update TWEEN animations
        TWEEN.update();
        
        // Update game with delta time
        this.update(deltaTime);
        
        // Render
        this.renderer.render(this.scene, this.camera.getCamera());
    }
}

// Global game instance
let game;
