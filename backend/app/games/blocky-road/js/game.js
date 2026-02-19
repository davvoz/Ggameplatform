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
        this.audio = null;
        
        this.score = 0;
        this.baseScore = 0;  // Track max gridZ separately from total score
        this.coins = 0;
        this.trainDeaths = 0;  // Track deaths by train collision
        this.highScore = 0;
        
        this.isGameOver = false;
        this.isPaused = false;
        this.isStarted = false;
        this.isLoaded = false; // Flag per controllare se il gioco è completamente caricato
        
        // Input - optimized for fast gameplay
        this.keys = {};
        this.inputCooldown = 0;
        this.queuedInput = null;  // Queue one input while in cooldown
        
        // Rising water/danger zone mechanic (like Crossy Road)
        this.dangerZone = -15; // Start far behind player
        this.dangerZoneSpeed = 0.003; // Slower, constant forward movement
        this.dangerZoneActive = false; // Activate after first move
        this.lastTime = null; // For delta time calculation
        
        // Tutorial overlay system
        this.tutorialShown = false;
        this.tutorialVisible = false;
        this.tutorialMoveCount = 0;
        this.tutorialMovesRequired = 3; // Hide after 3 movements
        
        // Setup window listeners for platform messages
        this.setupWindowListeners();
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
    
    /**
     * Show level-up notification
     */
    showLevelUpNotification(levelUpData) {
        const { old_level, new_level, title, badge, coins_awarded, is_milestone, user_data } = levelUpData;

        // Check if user is anonymous (from levelUpData or fallback to checking window.parent)
        const isAnonymous = user_data?.is_anonymous === true;

        const modal = document.createElement('div');
        modal.className = 'level-up-modal';
        modal.innerHTML = `
            <div class="level-up-content ${is_milestone ? 'milestone' : ''}">
                <div class="level-up-animation">
                    <div class="level-up-rays"></div>
                    <div class="level-up-badge-container">
                        <span class="level-up-badge">${badge}</span>
                    </div>
                </div>
                <h2 class="level-up-title">🎉 LEVEL UP! 🎉</h2>
                <div class="level-up-levels">
                    <span class="old-level">${old_level}</span>
                    <span class="level-arrow">→</span>
                    <span class="new-level">${new_level}</span>
                </div>
                <div class="level-up-new-title">${title}</div>
                ${is_milestone ? '<div class="level-up-milestone-badge">✨ MILESTONE ✨</div>' : ''}
                ${!isAnonymous && coins_awarded > 0 ? `
                    <div class="level-up-reward">
                        <span class="reward-icon">🪙</span>
                        <span class="reward-amount">+${coins_awarded} Coins</span>
                    </div>
                ` : ''}
                <button class="level-up-close">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Trigger animation
        setTimeout(() => modal.classList.add('show'), 10);

        // Close handler
        const closeBtn = modal.querySelector('.level-up-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        // Auto-close after 6 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        }, 6000);
    }
    
    /**
     * Setup window listeners for platform messages
     */
    setupWindowListeners() {
        // Listen for messages from platform (e.g., XP banner and level-up requests)
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;
            
            // Handle XP banner
            if (event.data.type === 'showXPBanner' && event.data.payload) {

                this.showXPBanner(event.data.payload.xp_earned, event.data.payload);
            }
            
            // Handle level-up notification
            if (event.data.type === 'showLevelUpModal' && event.data.payload) {

                this.showLevelUpNotification(event.data.payload);
            }
        });
    }
    
    async init() {

        
        const loadingProgress = document.getElementById('loadingProgress');
        const updateProgress = (percent) => {
            if (loadingProgress) loadingProgress.style.width = percent + '%';
        };
        
        // Setup Three.js scene
        updateProgress(10);
        this.setupScene();
        this.setupLights();
        
        // Preload textures (prevent lag during coin spawns)
        updateProgress(20);
        await TextureCache.preloadAll();
        
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
        
        // Gestione resize
        window.addEventListener('resize', () => {
            const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('ios-game-fullscreen');
            if (isFS) {
                // Re-apply fullscreen constraints on resize
                this.handleFullscreenChange();
            } else if (this.camera) {
                this.camera.onResize();
            }
        });
        
        // Gestione fullscreen change
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('mozfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('MSFullscreenChange', () => {
            this.handleFullscreenChange();
        });
        
        // Initial fullscreen icon state
        if (this.updateFullscreenIcon) {
            this.updateFullscreenIcon();
        }
        
        // Hide loading, show start screen
        updateProgress(100);
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('startScreen').style.display = 'block';
            this.isLoaded = true; // Gioco caricato
            
            // Initialize map selector UI
            themeManager.initUI();
        }, 500);
        

    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        const theme = themeManager.getTheme();
        this.scene.background = new THREE.Color(theme.sky.background);
        
        // Fog from theme
        if (theme.sky.fog) {
            this.scene.fog = new THREE.Fog(theme.sky.fog.color, theme.sky.fog.near, theme.sky.fog.far);
        }
        
        // Body background
        document.body.style.background = theme.sky.bodyBackground;
        
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
        this.dirLight.shadow.camera.left = -10;
        this.dirLight.shadow.camera.right = 10;
        this.dirLight.shadow.camera.top = 25;
        this.dirLight.shadow.camera.bottom = -15;
        this.dirLight.shadow.camera.near = 1;
        this.dirLight.shadow.camera.far = 50;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.bias = -0.0005;
        this.dirLight.shadow.normalBias = 0.05;
        this.dirLight.shadow.radius = 8;
        
        this.scene.add(this.dirLight);
        
        // Hemisphere light for better ambient — themed
        const theme = themeManager.getTheme();
        this.hemiLight = new THREE.HemisphereLight(
            theme.sky.hemiSkyColor, theme.sky.hemiGroundColor, 0.5
        );
        this.scene.add(this.hemiLight);
    }
    
    // Apply current theme to scene (sky, fog, lights, body background)
    applyTheme() {
        const theme = themeManager.getTheme();
        
        // Sky
        if (this.scene) {
            this.scene.background = new THREE.Color(theme.sky.background);
            
            // Fog
            if (theme.sky.fog) {
                this.scene.fog = new THREE.Fog(theme.sky.fog.color, theme.sky.fog.near, theme.sky.fog.far);
            } else {
                this.scene.fog = null;
            }
        }
        
        // Hemisphere light
        if (this.hemiLight) {
            this.hemiLight.color.setHex(theme.sky.hemiSkyColor);
            this.hemiLight.groundColor.setHex(theme.sky.hemiGroundColor);
        }
        
        // Body background
        document.body.style.background = theme.sky.bodyBackground;
        
        // Terrain tile colors
        if (this.terrain && this.terrain.updateThemeColors) {
            this.terrain.updateThemeColors();
        }

        // Full scene rebuild: clear all themed 3D objects and regenerate
        // so the new theme is fully applied (decorations, player, obstacles, etc.)
        if (this.terrain && this.obstacles && this.player) {
            this.terrain.clear();
            this.obstacles.clear();
            if (this.particles) this.particles.clear();

            this.terrain.updateScore(this.score || 0);
            this.obstacles.updateScore(this.score || 0);

            this.terrain.generateInitialTerrain();

            // Recreate player with new theme's character
            this.scene.remove(this.player.mesh);
            this.player = new Player(this.scene, this.particles);
        }
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
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }
    
    handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('ios-game-fullscreen');
        
        // Aggiungi classe per sfondo nero
        if (isFullscreen) {
            document.body.classList.add('fullscreen-active');
        } else {
            document.body.classList.remove('fullscreen-active');
        }
        
        // Update fullscreen button icon
        this.updateFullscreenIcon();
        
        if (isFullscreen) {
            // In fullscreen: forza aspect ratio mobile (9:16) su desktop
            if (!this.isMobile()) {
                const height = window.innerHeight;
                const width = Math.floor(height * 9 / 16);
                const margin = Math.floor((window.innerWidth - width) / 2);
                
                // Set CSS variables so all UI elements can constrain to game bounds
                document.body.style.setProperty('--game-width', width + 'px');
                document.body.style.setProperty('--game-margin', margin + 'px');
                
                // Ridimensiona renderer con aspect ratio mobile
                if (this.renderer) {
                    this.renderer.setSize(width, height);
                }
                
                // Aggiorna camera con aspect ratio mobile
                if (this.camera && this.camera.camera) {
                    const aspect = width / height;
                    const frustumSize = 8;
                    this.camera.camera.left = -frustumSize * aspect;
                    this.camera.camera.right = frustumSize * aspect;
                    this.camera.camera.top = frustumSize;
                    this.camera.camera.bottom = -frustumSize;
                    this.camera.camera.updateProjectionMatrix();
                }
                
                // Centra il canvas
                if (this.renderer) {
                    this.renderer.domElement.style.position = 'fixed';
                    this.renderer.domElement.style.left = '50%';
                    this.renderer.domElement.style.top = '50%';
                    this.renderer.domElement.style.transform = 'translate(-50%, -50%)';
                }

            } else {
                // Mobile: usa tutto lo schermo
                if (this.camera) {
                    this.camera.onResize();
                }
            }
        } else {
            // Uscito da fullscreen: ripristina dimensioni normali
            document.body.style.removeProperty('--game-width');
            document.body.style.removeProperty('--game-margin');
            if (this.renderer) {
                this.renderer.domElement.style.position = '';
                this.renderer.domElement.style.left = '';
                this.renderer.domElement.style.top = '';
                this.renderer.domElement.style.transform = '';
            }
            if (this.camera) {
                this.camera.onResize();
            }
        }
    }
    
    toggleFullscreen() {
        // Prefer Platform SDK if available (works on iOS!)
        if (window.PlatformSDK && typeof window.PlatformSDK.toggleFullscreen === 'function') {
            window.PlatformSDK.toggleFullscreen();
            return;
        }

        const elem = document.documentElement;
        
        // iOS/iPadOS detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
        
        if ((isIOS || isIPadOS) && !fullscreenSupported) {
            // iOS doesn't support Fullscreen API - use CSS workaround
            this.toggleIOSFullscreen();
            return;
        }
        
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

        if (!fsElement) {
            // Enter fullscreen
            const requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
            if (requestFs) {
                const promise = requestFs.call(elem);
                if (promise && promise.then) {
                    promise.then(() => {
                        document.body.classList.add('game-fullscreen');
                        this.handleFullscreenChange();
                    }).catch(() => {
                        // Fallback to iOS method if native fails
                        this.toggleIOSFullscreen();
                    });
                } else {
                    document.body.classList.add('game-fullscreen');
                    this.handleFullscreenChange();
                }
            } else {
                // Fallback to iOS method
                this.toggleIOSFullscreen();
            }
        } else {
            // Exit fullscreen
            const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFs) {
                const promise = exitFs.call(document);
                if (promise && promise.then) {
                    promise.then(() => {
                        document.body.classList.remove('game-fullscreen');
                        this.handleFullscreenChange();
                    }).catch(() => {});
                } else {
                    document.body.classList.remove('game-fullscreen');
                    this.handleFullscreenChange();
                }
            }
        }
    }

    // iOS Fullscreen CSS workaround (since iOS Safari doesn't support Fullscreen API)
    toggleIOSFullscreen() {
        const isFullscreen = document.body.classList.contains('ios-game-fullscreen');
        
        if (isFullscreen) {
            // Exit fullscreen
            document.documentElement.classList.remove('ios-game-fullscreen');
            document.body.classList.remove('ios-game-fullscreen');
            document.body.classList.remove('game-fullscreen');
            document.body.classList.remove('fullscreen-active');
            document.body.style.overflow = '';
            const exitBtn = document.getElementById('ios-fs-exit');
            if (exitBtn) exitBtn.remove();
            this.updateFullscreenIcon();
            if (this.camera) {
                setTimeout(() => this.camera.onResize(), 100);
            }
        } else {
            // Enter fullscreen
            document.documentElement.classList.add('ios-game-fullscreen');
            document.body.classList.add('ios-game-fullscreen');
            document.body.classList.add('game-fullscreen');
            document.body.classList.add('fullscreen-active');
            document.body.style.overflow = 'hidden';
            this.createIOSExitButton();
            this.updateFullscreenIcon();
            // Scroll to hide address bar on iOS
            setTimeout(() => {
                window.scrollTo(0, 1);
                if (this.camera) this.camera.onResize();
            }, 100);
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 300);
        }
    }

    createIOSExitButton() {
        if (document.getElementById('ios-fs-exit')) return;
        const btn = document.createElement('button');
        btn.id = 'ios-fs-exit';
        btn.innerHTML = '✕';
        btn.setAttribute('aria-label', 'Exit fullscreen');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleIOSFullscreen();
        });
        document.body.appendChild(btn);
    }

    updateFullscreenIcon() {
        const btn = document.getElementById('fullscreen-btn');
        if (!btn) return;
        // Check both native fullscreen and iOS CSS fullscreen
        const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.body.classList.contains('ios-game-fullscreen');
        btn.innerHTML = isFs
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
             </svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
             </svg>`;
    }
    
    setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            // Prevent double-triggering from key repeat (browser auto-repeat when holding key)
            if (this.keys[key]) return;
            
            this.keys[key] = true;
            
            if (!this.isStarted) {
                this.startGame();
                return;
            }
            
            // Process movement immediately on key press (single press only)
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
                let dx = 0, dz = 0;
                
                if (key === 'arrowup' || key === 'w') {
                    dz = 1;
                } else if (key === 'arrowdown' || key === 's') {
                    dz = -1;
                } else if (key === 'arrowleft' || key === 'a') {
                    dx = 1;  // Swapped: left now goes right in world space
                } else if (key === 'arrowright' || key === 'd') {
                    dx = -1; // Swapped: right now goes left in world space
                }
                
                if (dx !== 0 || dz !== 0) {
                    this.processMove(dx, dz);
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupUI() {
        // Start button
        document.getElementById('startButton').addEventListener('click', () => {
            // Animate out the start screen
            const startScreen = document.getElementById('startScreen');
            if (startScreen) {
                startScreen.classList.add('hiding');
                startScreen.addEventListener('animationend', () => {
                    startScreen.style.display = 'none';
                    startScreen.classList.remove('hiding');
                }, { once: true });
            }
            this.startGame();
        });
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFullscreen();
            });
        }
        
        // Restart button with debounce to prevent rapid clicks
        let restartDebounce = false;
        document.getElementById('restartButton').addEventListener('click', () => {
            if (restartDebounce) {

                return;
            }
            restartDebounce = true;
            this.restartGame();
            setTimeout(() => {
                restartDebounce = false;
            }, 1000); // 1000ms debounce - prevenzione doppio click
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

        } else {

        }
    }
    
    startGame() {
        if (this.isStarted) return;
        
        this.isStarted = true;
        
        // Animate out start screen
        const startScreen = document.getElementById('startScreen');
        if (startScreen && startScreen.style.display !== 'none') {
            startScreen.classList.add('hiding');
            startScreen.addEventListener('animationend', () => {
                startScreen.style.display = 'none';
                startScreen.classList.remove('hiding');
            }, { once: true });
        }
        
        // Initialize audio (requires user interaction)
        this.audio.init();
        
        // Reset per-session train death counter
        this.trainDeaths = 0;
        // Show tutorial overlay at game start
        if (!this.tutorialShown) {
            this.showTutorial();
        }
        
        // Notify platform that game has started - this will create the session
        if (typeof PlatformSDK !== 'undefined') {
            try {
                window.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, '*');

            } catch (e) {
                console.error('⚠️ Failed to send game started event:', e);
            }
        }
        

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
        
        // Rimuovi completamente il player esistente e ricreane uno nuovo
        // (Fix per bug di invisibilità con restart rapidi)
        if (this.player && this.player.mesh) {
            this.scene.remove(this.player.mesh);
        }
        this.player = new Player(this.scene, this.particles);

        
        // Reset per-session train death counter on restart
        this.trainDeaths = 0;
        // Reset death line (invisible)
        this.deathLineZ = -7; // Player spawns at 0, so death line at -7 maintains correct distance
        this.deathLineEnabled = false;
        

        
        // Notify platform that a new game has started - create new session
        if (typeof PlatformSDK !== 'undefined') {
            try {
                window.parent.postMessage({
                    type: 'gameStarted',
                    payload: {},
                    timestamp: Date.now(),
                    protocolVersion: '1.0.0'
                }, '*');

            } catch (e) {
                console.error('⚠️ Failed to send game started event on restart:', e);
            }
        }
    }
    
    handleInput() {
        if (this.inputCooldown > 0) {
            this.inputCooldown--;
        }
    }
    
    processMove(dx, dz) {
        const moved = this.player.move(dx, dz, () => {
            this.checkCollisions();
        });
        
        if (moved) {
            // Count moves and hide tutorial after a few movements
            if (this.tutorialVisible) {
                this.tutorialMoveCount++;
                if (this.tutorialMoveCount >= this.tutorialMovesRequired) {
                    this.hideTutorial();
                }
            }
            
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
        const hitObstacle = this.obstacles.checkVehicleCollision(playerPos);
        if (hitObstacle) {
            // Increment train deaths counter if hit by train
            if (hitObstacle.type === 'train') {
                this.trainDeaths++;
            }
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
                const currentTheme = themeManager.getTheme();
                PlatformSDK.gameOver(this.score, {
                    coins: this.coins,
                    train_deaths: this.trainDeaths,
                    reason: reason,
                    map_theme: currentTheme.id,
                    xp_multiplier: currentTheme.xpMultiplier || 1.0,
                    timestamp: Date.now()
                });
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
        
        // Normalize deltaTime to 60 FPS (16.67ms per frame)
        // This makes movement speed independent of frame rate
        const normalizedDelta = deltaTime / 16.67;
        
        // Tutorial visibility is now controlled by movement count only
        
        // Update game systems
        const playerPos = this.player.getPosition();
        
        const playerUpdateStart = performance.now();
        this.player.update(normalizedDelta);
        const playerUpdateTime = performance.now() - playerUpdateStart;
        
        const terrainUpdateStart = performance.now();
        this.terrain.update(playerPos.z, this.score, normalizedDelta);
        const terrainUpdateTime = performance.now() - terrainUpdateStart;
        
        // Update shadow camera to follow player
        this.dirLight.target.position.set(playerPos.worldX, 0, playerPos.worldZ);
        this.dirLight.position.set(playerPos.worldX + 10, 20, playerPos.worldZ + 10);
        this.dirLight.target.updateMatrixWorld();
        
        // Update obstacles with current score for difficulty progression
        this.obstacles.updateScore(this.score);
        const obstaclesUpdateStart = performance.now();
        this.obstacles.update(playerPos.z, normalizedDelta);
        const obstaclesUpdateTime = performance.now() - obstaclesUpdateStart;
        
        const particlesUpdateStart = performance.now();
        this.particles.update(normalizedDelta);
        const particlesUpdateTime = performance.now() - particlesUpdateStart;
        
        const totalUpdateTime = performance.now() - frameStart;
        
        // Log slow frames (>16.67ms = below 60fps)
        if (totalUpdateTime > 16.67) {

        }
        
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

        }
        
        // Update death line (chases player from behind)
        if (this.deathLineEnabled) {
            // Death line ALWAYS advances at 1 block per second (frame rate independent)
            this.deathLineZ += this.deathLineSpeed * normalizedDelta;
            
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
        this.camera.follow(cameraTarget, normalizedDelta);
        
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
        this.dangerZone += this.dangerZoneSpeed * normalizedDelta;
        
        // Keep minimum distance behind player
        const minDistance = 10;
        if (this.dangerZone < playerZ - minDistance) {
            this.dangerZone = playerZ - minDistance;
        }
        
        // Update visual indicator
        this.dangerZonePlane.visible = true;
        this.dangerZonePlane.position.z = this.dangerZone;
        
        // Pulsating effect - usa counter invece di Date.now()
        if (!this.dangerZoneAnimTime) this.dangerZoneAnimTime = 0;
        this.dangerZoneAnimTime += 0.005 * normalizedDelta;
        const pulse = Math.sin(this.dangerZoneAnimTime) * 0.1 + 0.4;
        this.dangerZonePlane.material.opacity = pulse;
        
        // Check if danger caught the player (with buffer)
        if (this.dangerZone >= playerZ - 1.0) {
            this.gameOver('⏱️ Too slow!');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const frameStart = performance.now();
        
        // Calculate delta time for smooth updates
        const now = performance.now();
        const deltaTime = this.lastTime ? now - this.lastTime : 16;
        this.lastTime = now;
        
        // Update TWEEN animations
        const tweenStart = performance.now();
        TWEEN.update();
        const tweenTime = performance.now() - tweenStart;
        
        // Update game with delta time
        const updateStart = performance.now();
        this.update(deltaTime);
        const updateTime = performance.now() - updateStart;
        
        // Render
        const renderStart = performance.now();
        this.renderer.render(this.scene, this.camera.getCamera());
        const renderTime = performance.now() - renderStart;
        
        const totalFrameTime = performance.now() - frameStart;
        
        // Get detailed render info from Three.js
        const renderInfo = this.renderer.info;
        
        // Log every frame if slow (>16.67ms = below 60fps)
        if (totalFrameTime > 16.67) {

            
            // If render is the bottleneck, log detailed info
            if (renderTime > 8) {


            }
        }
    }
    
    showTutorial() {
        const tutorial = document.getElementById('tutorialOverlay');
        if (tutorial && !this.tutorialShown) {
            tutorial.classList.add('show');
            tutorial.classList.remove('hiding');
            this.tutorialVisible = true;
            this.tutorialAutoHideTimer = 0;

        }
    }
    
    hideTutorial() {
        const tutorial = document.getElementById('tutorialOverlay');
        if (tutorial && this.tutorialVisible) {
            tutorial.classList.add('hiding');
            this.tutorialVisible = false;
            this.tutorialShown = true;
            // Remove show class after animation
            setTimeout(() => {
                tutorial.classList.remove('show');
            }, 500);

        }
    }
}

// Global game instance
let game;
