/**
 * Main Entry Point
 * Initializes game and handles Platform SDK integration
 */

(async function() {
    'use strict';
    
    // Get canvas
    const canvas = document.getElementById('gameCanvas');
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Initialize systems
    console.log('[Merge Tower] Initializing game systems...');
    
    const graphics = new Graphics(canvas);
    const input = new InputHandler(canvas, graphics);
    const ui = new UIManager(graphics, canvas);
    const game = new Game(graphics, input, ui);
    
    console.log('[Merge Tower] Game systems initialized');
    
    // ========== PLATFORM SDK INTEGRATION ==========
    
    let platformReady = false;
    let sessionActive = false;
    let sessionStartTime = 0;
    
    try {
        console.log('[Merge Tower] Initializing Platform SDK...');
        
        await PlatformSDK.init({
            onPause: () => {
                console.log('[Merge Tower] Game paused by platform');
                game.pause();
            },
            
            onResume: () => {
                console.log('[Merge Tower] Game resumed by platform');
                game.resume();
            },
            
            onExit: () => {
                console.log('[Merge Tower] Exit requested by platform');
                if (sessionActive) {
                    endSession();
                }
                game.gameOver();
            },
            
            onStart: () => {
                console.log('[Merge Tower] Start signal received from platform');
                game.resume();
            }
        });
        
        platformReady = true;
        console.log('[Merge Tower] Platform SDK ready');
        
    } catch (error) {
        console.warn('[Merge Tower] Platform SDK initialization failed:', error);
        console.log('[Merge Tower] Running in standalone mode');
    }
    
    // ========== SESSION MANAGEMENT ==========
    
    function startSession() {
        if (!platformReady || sessionActive) return;
        
        sessionActive = true;
        sessionStartTime = Date.now();
        
        // Send gameStarted event to platform
        try {
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0'
            }, '*');
            console.log('[Merge Tower] Session started - gameStarted event sent');
        } catch (error) {
            console.error('[Merge Tower] Failed to send gameStarted:', error);
        }
    }
    
    function endSession() {
        if (!sessionActive) return;
        
        const state = game.getState();
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        
        // Send gameOver with complete extra_data for XP calculation
        if (platformReady) {
            try {
                PlatformSDK.gameOver(state.score, {
                    extra_data: {
                        wave: state.wave,
                        kills: state.kills,
                        tower_merges: state.towerMerges || 0,
                        highest_tower_level: state.highestLevel || 1,
                        coins_earned: state.coinsEarned || 0,
                        play_time: sessionDuration,
                        towers_placed: state.towersPlaced || 0
                    }
                });
                console.log('[Merge Tower] Session ended - gameOver sent with XP data');
            } catch (error) {
                console.error('[Merge Tower] Failed to send gameOver:', error);
            }
        }
        
        sessionActive = false;
    }
    
    function resetSession() {
        // Close current session if active before resetting
        if (sessionActive) {
            console.log('[Merge Tower] Closing active session before retry');
            endSession();
        }
        
        // Reset session state for retry
        sessionActive = false;
        firstUpdate = true;
        lastSentScore = 0;
        sessionStartTime = 0;
        console.log('[Merge Tower] Session state reset - ready for new session');
    }
    
    // ========== GAME LOOP ==========
    
    let lastTime = performance.now();
    let running = false;
    let lastSentScore = 0;
    let firstUpdate = true;
    
    function gameLoop(currentTime) {
        if (!running) return;
        
        // Calculate delta time
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        
        // Update and render
        game.update(dt);
        game.render();
        
        // Check game state
        const state = game.getState();
        
        // Start session on first update (only if not game over)
        if (firstUpdate && platformReady && !state.isGameOver) {
            startSession();
            firstUpdate = false;
        }
        
        // Check for game over
        if (state.isGameOver && sessionActive) {
            endSession();
        }
        
        // Send score updates only when score changes
        if (platformReady && !state.isGameOver) {
            if (state.score > lastSentScore) {
                PlatformSDK.sendScore(state.score);
                lastSentScore = state.score;
            }
        }
        
        // Continue loop
        requestAnimationFrame(gameLoop);
    }
    
    // ========== START GAME ==========
    
    // Expose resetSession globally for game.js
    window.resetGameSession = resetSession;
    
    function startGame() {
        console.log('[Merge Tower] Starting game...');
        
        // Hide loading screen
        loadingScreen.classList.add('hidden');
        
        // Start game loop
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
        
        console.log('[Merge Tower] Game started!');
    }
    
    // ========== VISIBILITY HANDLING ==========
    
    // Note: Removed automatic pause on blur/visibility change
    // The game should continue running even when tab loses focus
    // This prevents the game from becoming stuck in pause state
    
    // ========== FULLSCREEN SUPPORT ==========
    
    function isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }
    
    function requestFullscreen() {
        const elem = document.documentElement;
        
        try {
            if (elem.requestFullscreen) {
                return elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                return elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                return elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                return elem.msRequestFullscreen();
            }
        } catch (e) {
            console.log('[Merge Tower] Fullscreen not supported:', e);
            return Promise.resolve();
        }
        return Promise.resolve();
    }
    
    // iOS doesn't support true fullscreen, but we can maximize viewport
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Just start the game - let the platform handle fullscreen if needed
    console.log('[Merge Tower] Starting game...');
    setTimeout(startGame, 500);
    
    // ========== ERROR HANDLING ==========
    
    window.addEventListener('error', (event) => {
        console.error('[Merge Tower] Runtime error:', event.error);
        
        // Try to report error to platform
        if (platformReady) {
            try {
                PlatformSDK.log('error', event.error.message);
            } catch (e) {
                console.error('[Merge Tower] Failed to report error to platform:', e);
            }
        }
    });
    
    // ========== PERFORMANCE MONITORING ==========
    
    // Log performance metrics periodically in debug mode
    if (window.location.search.includes('debug')) {
        setInterval(() => {
            const state = game.getState();
            const counts = game.entities.getCounts();
            
            console.log('[Merge Tower] Performance:', {
                fps: game.performanceMonitor.getFPS(),
                entities: counts,
                particles: game.particles.getCount(),
                wave: state.wave,
                score: state.score
            });
        }, 5000);
    }
    
    // ========== RESPONSIVE RESIZE ==========
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            graphics.setupCanvas();
            ui.setupShopButtons();
        }, 100);
    });
    
    // ========== MOBILE OPTIMIZATION ==========
    
    // Prevent pull-to-refresh
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Prevent pinch zoom
    document.body.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    
    document.body.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
    
    document.body.addEventListener('gestureend', (e) => {
        e.preventDefault();
    });
    
    // Lock orientation to portrait on mobile (if supported)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {
            console.log('[Merge Tower] Orientation lock not supported');
        });
    }
    
    // ========== EXPORT FOR DEBUGGING ==========
    
    if (window.location.search.includes('debug')) {
        window.MergeTower = {
            game,
            graphics,
            ui,
            input,
            CONFIG,
            CANNON_TYPES,
            ZOMBIE_TYPES,
            Utils
        };
        console.log('[Merge Tower] Debug mode enabled. Access via window.MergeTower');
    }
    
    console.log('[Merge Tower] Initialization complete');
})();
