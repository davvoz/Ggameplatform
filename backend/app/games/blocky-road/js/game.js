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
        this.scene.fog = new THREE.Fog(0x87CEEB, 30, 60);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        console.log('🎨 Renderer created:', window.innerWidth, 'x', window.innerHeight);
        
        // Add grid helper for debugging
        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x888888);
        this.scene.add(gridHelper);
        
        // Add axes helper for debugging
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }
    
    setupLights() {
        // Ambient light (brighter)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Directional light (sun) with shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        
        // Shadow camera settings
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        
        this.scene.add(dirLight);
        
        // Hemisphere light for better ambient
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x5FAD56, 0.5);
        this.scene.add(hemiLight);
    }
    
    createDangerZone() {
        // Create a red warning plane that moves forward when player is idle
        const geometry = new THREE.PlaneGeometry(20, 2);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.dangerZonePlane = new THREE.Mesh(geometry, material);
        this.dangerZonePlane.rotation.x = -Math.PI / 2;
        this.dangerZonePlane.position.y = 0.01;
        this.dangerZonePlane.visible = false; // Keep hidden for now
        // DISABLED: this.scene.add(this.dangerZonePlane);
        
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
        
        // Reset score
        this.score = 0;
        this.coins = 0;
        this.updateUI();
        
        // Reset game state
        this.isGameOver = false;
        
        // Clear and regenerate
        this.terrain.clear();
        this.obstacles.clear();
        this.particles.clear();
        
        this.terrain.generateInitialTerrain();
        this.player.reset(0, 0);
        
        console.log('🔄 Game restarted (not first game)');
    }
    
    handleInput() {
        // No cooldown system - process input immediately for zero lag
        
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
            // No cooldown - instant response for zero input lag
            
            // Score tracking using gridZ - prevents farming by tracking actual grid position
            // Score is simply the furthest gridZ reached (same as Crossy Road)
            if (dz > 0) {
                const currentGridZ = this.player.gridZ;
                if (currentGridZ > this.score) {
                    this.score = currentGridZ;
                    this.updateUI();
                    
                    if (typeof PlatformSDK !== 'undefined') {
                        PlatformSDK.sendScore(this.score);
                    }
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
            this.coins++;
            this.score += 10;
            this.updateUI();
            this.particles.createCoinParticles(coin.mesh.position);
            this.audio.play('coin');
            
            if (typeof PlatformSDK !== 'undefined') {
                PlatformSDK.sendScore(this.score);
            }
        });
    }
    
    gameOver(reason) {
        if (this.isGameOver) return;
        
        console.log('💀 Game Over:', reason);
        this.isGameOver = true;
        
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
            document.getElementById('finalCoins').textContent = `Coins: ${this.coins}`;
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
        
        // Handle input
        this.handleInput();
        
        // Update game systems
        const playerPos = this.player.getPosition();
        this.player.update();
        this.terrain.update(playerPos.z);
        this.obstacles.update(playerPos.z);
        this.particles.update();
        
        // Rising danger zone mechanic (like Crossy Road's water)
        // DISABLED TEMPORARILY
        // this.updateDangerZone(playerPos.z, deltaTime);
        
        // Continuous collision checking
        if (!this.player.isMoving) {
            this.checkCollisions();
        }
        
        // Update camera
        this.camera.follow(this.player.mesh.position);
        
        // Update boundary shadows to follow camera
        if (this.boundaryShadows) {
            this.boundaryShadows.forEach(shadow => {
                shadow.position.z = playerPos.z;
            });
        }
    }
    
    updateDangerZone(playerZ, deltaTime) {
        // Activate danger zone after player moves forward
        if (!this.dangerZoneActive && playerZ > 2) {
            this.dangerZoneActive = true;
            this.dangerZone = playerZ - 12; // Start 12 units behind
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
