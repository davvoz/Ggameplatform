// game.js - Main Three.js game controller

class BlockyRoadGame {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.player = null;
        this.terrain = null;
        this.obstacles = null;
        this.particles = null;
        this.touchControls = null;
        
        this.score = 0;
        this.coins = 0;
        this.highScore = 0;
        
        this.isGameOver = false;
        this.isPaused = false;
        this.isStarted = false;
        
        // Input
        this.keys = {};
        this.inputCooldown = 0;
        
        // Rising water/danger zone mechanic (like Crossy Road)
        this.dangerZone = -15; // Start far behind player
        this.dangerZoneSpeed = 0.003; // Slower, constant forward movement
        this.dangerZoneActive = false; // Activate after first move
        this.lastTime = null; // For delta time calculation
    }
    
    async init() {
        console.log('🎮 Initializing Blocky Road Three.js');
        
        // Setup Three.js scene
        this.setupScene();
        this.setupLights();
        
        // Create game systems
        this.particles = new ParticleSystem(this.scene);
        this.terrain = new TerrainGenerator(this.scene);
        this.obstacles = new ObstacleManager(this.scene, this.terrain);
        this.player = new Player(this.scene, this.particles);
        this.camera = new CrossyCamera(this.scene, this.renderer);
        
        // Generate initial terrain
        this.terrain.generateInitialTerrain();
        
        console.log('🌍 Terrain generated, rows:', this.terrain.rows.length);
        console.log('📷 Camera position:', this.camera.getCamera().position);
        console.log('🎥 Scene children:', this.scene.children.length);
        
        // Setup input
        this.setupInput();
        
        // Setup touch controls
        this.touchControls = new TouchControls(this);
        
        // Create danger zone visual indicator
        this.createDangerZone();
        
        // Setup UI
        this.setupUI();
        
        // Initialize SDK
        await this.initSDK();
        
        // Start animation loop
        this.animate();
        
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
    }
    
    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (!this.isStarted) {
                this.startGame();
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
        
        console.log('🔄 Game restarted');
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
            const moved = this.player.move(dx, dz, () => {
                this.checkCollisions();
            });
            
            if (moved) {
                this.inputCooldown = 10;
                
                // Score for moving forward
                if (dz > 0) {
                    this.score++;
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
            for (const platform of platforms) {
                // Check if player is on this log
                const logLeft = platform.mesh.position.x - (platform.length / 2);
                const logRight = platform.mesh.position.x + (platform.length / 2);
                
                if (playerPos.worldX >= logLeft - 0.4 && playerPos.worldX <= logRight + 0.4) {
                    this.player.attachToPlatform(platform);
                    onPlatform = true;
                    break;
                }
            }
            
            if (!onPlatform) {
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
            
            if (typeof PlatformSDK !== 'undefined') {
                PlatformSDK.sendScore(this.score);
            }
        });
    }
    
    gameOver(reason) {
        if (this.isGameOver) return;
        
        console.log('💀 Game Over:', reason);
        this.isGameOver = true;
        
        this.player.die();
        
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
        
        // Send to SDK
        if (typeof PlatformSDK !== 'undefined') {
            PlatformSDK.gameOver(this.score, {
                coins: this.coins,
                reason: reason
            });
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
