/**
 * Main Entry Point
 * Initializes game and handles Platform SDK integration
 */

import { Graphics } from './graphics.js';
import { InputHandler } from './input.js';
import { UIManager } from './ui.js';
import { WaveModeSelector } from './WaveModeSelector.js';
import { Game } from './game.js';
import { CONFIG } from './config.js';
import { TutorialManager, TutorialPrompt } from './tutorial.js';

// If PlatformSDK is a module, import it. Otherwise, assume global.
// import { PlatformSDK } from '../../sdk/platformsdk.js';

(async function () {
    'use strict';

    // ========== DEV MODE (?dev=true) ==========
    const DEV_MODE = new URLSearchParams(window.location.search).has('dev');
    if (DEV_MODE) console.log('[DEV] Developer mode enabled');

    // Get canvas
    const canvas = document.getElementById('gameCanvas');
    const loadingScreen = document.getElementById('loadingScreen');

    // Initialize systems
    console.log('[Merge Tower] Initializing game systems...');

    const graphics = new Graphics(canvas);
    const input = new InputHandler(canvas, graphics);
    const game = new Game(graphics, input, null); // UI will be passed after
    const ui = new UIManager(graphics, canvas, game.audio);
    game.ui = ui;

    // Initialize tutorial system
    const tutorialManager = new TutorialManager(game, graphics, ui);
    game.tutorial = tutorialManager;

    // Tutorial prompt for first-time users
    let tutorialPrompt = null;
    let showTutorialPrompt = false;

    // Wave mode selector
    let waveModeSelector = null;
    let showWaveModeSelector = false;
    let victoryRewardAwarded = false;

    console.log('[Merge Tower] Game systems initialized');

    // ========== DEV PANEL ==========
    let devGodMode = false;
    if (DEV_MODE) {
        const devPanel = document.createElement('div');
        devPanel.id = 'devPanel';
        devPanel.innerHTML = `
            <style>
                #devPanel { position:fixed; top:5px; left:5px; background:rgba(0,0,0,0.9); color:#0f0; padding:8px; font:12px monospace; z-index:99999; border:1px solid #0f0; border-radius:4px; }
                #devPanel input { width:60px; background:#111; color:#0f0; border:1px solid #0f0; margin:2px; }
                #devPanel button { background:#0f0; color:#000; border:none; padding:3px 8px; margin:2px; cursor:pointer; }
                #devPanel button:hover { background:#0a0; }
            </style>
            <b>🛠 DEV</b><br>
            💰 <input type="number" id="devCoins" value="1000"> 
            ⚡ <input type="number" id="devEnergy" value="100"><br>
            🌊 <input type="number" id="devWave" value="1">
            🎯 <input type="number" id="devTarget" value="20"><br>
            <button id="devApply">Apply</button>
            <button id="devSkipWave">Skip Wave</button>
            <button id="devGodMode">God Mode</button>
        `;
        document.body.appendChild(devPanel);

        document.getElementById('devApply').onclick = () => {
            const state = game.getState();
            state.coins = parseInt(document.getElementById('devCoins').value) || 100;
            state.energy = parseInt(document.getElementById('devEnergy').value) || 100;
            state.wave = parseInt(document.getElementById('devWave').value) || 1;
            state.targetWaves = parseInt(document.getElementById('devTarget').value) || 20;
            state.waveModeSelected = true;
            state.selectedWaveMode = state.selectedWaveMode || 'EASY';
            console.log('[DEV] Applied:', { coins: state.coins, energy: state.energy, wave: state.wave, target: state.targetWaves });
        };
        document.getElementById('devSkipWave').onclick = () => {
            const state = game.getState();
            [...game.entities.zombies].forEach(z => game.entities.removeZombie(z));
            state.waveZombiesSpawned = state.waveZombiesTotal;
            console.log('[DEV] Wave skipped');
        };
        document.getElementById('devGodMode').onclick = (e) => {
            devGodMode = !devGodMode;
            e.target.style.background = devGodMode ? '#f00' : '#0f0';
            e.target.textContent = devGodMode ? 'God ON' : 'God Mode';
            console.log('[DEV] God mode:', devGodMode);
        };
        // Expose for god mode check in game loop
        window.devGodMode = () => devGodMode;
    }

    // ========== PLATFORM SDK INTEGRATION ==========

    let platformReady = false;
    let sessionActive = false;
    let sessionStartTime = 0;
    let platformBalance = 0;

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

        // Load user's coin balance using platform API (like seven does)
        try {
            // Get userId from platform config
            let userId = null;
            if (window.platformConfig && window.platformConfig.userId) {
                userId = window.platformConfig.userId;
            } else if (PlatformSDK.getConfig && typeof PlatformSDK.getConfig === 'function') {
                const config = PlatformSDK.getConfig();
                if (config && config.userId) {
                    userId = config.userId;
                }
            }

            if (userId) {
                console.log('[Merge Tower] Fetching balance for user:', userId);
                const response = await fetch(`/api/coins/${userId}/balance`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    platformBalance = data.balance || 0;
                    window.platformBalance = platformBalance;
                    console.log('[Merge Tower] Platform balance loaded:', platformBalance);
                } else {
                    console.warn('[Merge Tower] Failed to load balance, status:', response.status);
                    platformBalance = 0;
                    window.platformBalance = 0;
                }
            } else {
                console.warn('[Merge Tower] No userId available');
                platformBalance = 0;
                window.platformBalance = 0;
            }
        } catch (error) {
            console.warn('[Merge Tower] Failed to load platform balance:', error);
            platformBalance = 0;
            window.platformBalance = 0;
        }

    } catch (error) {
        console.warn('[Merge Tower] Platform SDK initialization failed:', error);
        console.log('[Merge Tower] Running in standalone mode');
        platformBalance = 0;
        window.platformBalance = 0;
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
                        towers_placed: state.towersPlaced || 0,
                        victory: state.isVictory || false,
                        wave_mode: state.selectedWaveMode || 'NONE'
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
        victoryRewardAwarded = false;
        console.log('[Merge Tower] Session state reset - ready for new session');
    }

    // ========== CONTINUE SYSTEM ==========

    async function handleContinueGame() {
        if (!platformReady) {
            console.warn('[Merge Tower] Platform not ready, cannot continue');
            return;
        }

        const continueCost = CONFIG.CONTINUE_COST || 100;

        // Check balance
        if (platformBalance < continueCost) {
            console.warn('[Merge Tower] Insufficient balance to continue');
            return;
        }

        try {
            // Get userId like seven does
            let userId = null;
            if (window.platformConfig && window.platformConfig.userId) {
                userId = window.platformConfig.userId;
            } else if (PlatformSDK.getConfig && typeof PlatformSDK.getConfig === 'function') {
                const config = PlatformSDK.getConfig();
                if (config && config.userId) {
                    userId = config.userId;
                }
            }

            if (!userId) {
                console.error('[Merge Tower] No userId available for spending');
                return;
            }

            // Spend coins via platform API (exactly like seven)
            const response = await fetch(`/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount: continueCost,
                    transaction_type: 'game_continue',
                    source_id: 'merge-tower-defense',
                    description: `Merge Tower continue: ${continueCost} coins`
                })
            });

            if (!response.ok) {
                console.warn('[Merge Tower] Failed to spend coins, status:', response.status);
                return;
            }

            // Update balance
            platformBalance -= continueCost;
            window.platformBalance = platformBalance;
            console.log('[Merge Tower] Continue purchased, new balance:', platformBalance);

            // Resume game
            game.resumeAfterContinue();

            // Restart session after continue
            startSession();
            console.log('[Merge Tower] Game continued successfully, session restarted');

        } catch (error) {
            console.error('[Merge Tower] Error during continue:', error);
        }
    }

    // Expose continue handler globally
    window.handleContinueGame = handleContinueGame;

    // ========== VICTORY HANDLER ==========

    async function handleVictory(coinReward) {
        if (!platformReady || victoryRewardAwarded) {
            console.log('[Merge Tower] Victory - reward already awarded or platform not ready');
            return;
        }

        try {
            // Get userId
            let userId = null;
            if (window.platformConfig && window.platformConfig.userId) {
                userId = window.platformConfig.userId;
            } else if (PlatformSDK.getConfig && typeof PlatformSDK.getConfig === 'function') {
                const config = PlatformSDK.getConfig();
                if (config && config.userId) {
                    userId = config.userId;
                }
            }

            if (!userId) {
                console.error('[Merge Tower] No userId available for awarding coins');
                return;
            }

            // Award coins via platform API
            const response = await fetch(`/api/coins/${userId}/award`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    amount: coinReward,
                    transaction_type: 'game_win',
                    source_id: 'merge-tower-defense',
                    description: `Merge Tower Victory: completed ${game.getState().targetWaves} waves - ${coinReward} coins`
                })
            });

            if (!response.ok) {
                console.warn('[Merge Tower] Failed to award coins, status:', response.status);
                return;
            }

            // Update balance
            platformBalance += coinReward;
            window.platformBalance = platformBalance;
            victoryRewardAwarded = true;
            
            console.log(`[Merge Tower] Victory! Awarded ${coinReward} platform coins. New balance: ${platformBalance}`);

            // End session after victory
            endSession();

        } catch (error) {
            console.error('[Merge Tower] Error awarding victory coins:', error);
        }
    }

    // Expose victory handler globally
    window.handleVictory = handleVictory;

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

        // Update wave mode selector if visible
        if (waveModeSelector && showWaveModeSelector) {
            waveModeSelector.update(dt);
        }

        // Update tutorial prompt if visible
        if (tutorialPrompt && showTutorialPrompt) {
            tutorialPrompt.update(dt);
        }

        // Update tutorial if active
        if (tutorialManager.isActive) {
            tutorialManager.update(dt);
        }

        // DEV: God mode - save energy before update
        const prevEnergy = DEV_MODE && window.devGodMode && window.devGodMode() ? game.getState().energy : 0;

        // Update and render game
        game.update(dt);

        // DEV: God mode - restore energy if it dropped
        if (DEV_MODE && window.devGodMode && window.devGodMode()) {
            game.getState().energy = Math.max(prevEnergy, game.getState().energy);
        }

        // Passa lo stato al renderer per i mattoni dinamici
        graphics.gameState = game.getState();
        game.render();

        // Render victory screen if victory
        const state = game.getState();
        if (state.isVictory) {
            ui.showVictory(state, state.coinReward, victoryRewardAwarded);
        }

        // Render wave mode selector if visible (on top of game)
        if (waveModeSelector && showWaveModeSelector) {
            waveModeSelector.render();
        }

        // Render tutorial overlay if active
        if (tutorialManager.isActive) {
            tutorialManager.render();
        }

        // Render tutorial prompt if visible
        if (tutorialPrompt && showTutorialPrompt) {
            tutorialPrompt.render();
        }

        // Start session on first update (only if not game over, not in tutorial, and wave mode selected)
        if (firstUpdate && platformReady && !state.isGameOver && !tutorialManager.isActive && !showTutorialPrompt && !showWaveModeSelector && state.waveModeSelected) {
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

    // ========== TUTORIAL HANDLING ==========

    function handleTutorialChoice(wantsTutorial) {
        showTutorialPrompt = false;

        if (wantsTutorial) {
            console.log('[Merge Tower] User chose to do the tutorial');
            tutorialManager.start();
        } else {
            console.log('[Merge Tower] User skipped the tutorial');
            // Show wave mode selector instead of starting game directly
            showWaveModeSelection();
        }
    }

    // ========== WAVE MODE SELECTION ==========

    function showWaveModeSelection() {
        console.log('[Merge Tower] Showing wave mode selection');
        waveModeSelector = new WaveModeSelector(graphics, handleWaveModeSelected);
        waveModeSelector.show();
        showWaveModeSelector = true;
        game.pause();
    }

    function handleWaveModeSelected(modeKey) {
        console.log('[Merge Tower] Wave mode selected:', modeKey);
        showWaveModeSelector = false;
        
        // Set the wave mode in game
        game.setWaveMode(modeKey);
        
        // Resume and start game
        game.resume();
        game.audio.play();
        
        // Start session now that mode is selected
        if (platformReady && !sessionActive) {
            startSession();
            firstUpdate = false;
        }
    }

    // ========== START GAME ==========

    // Expose resetSession globally for game.js
    window.resetGameSession = resetSession;

    function startGame() {
        console.log('[Merge Tower] Starting game...');

        // Hide loading screen
        loadingScreen.classList.add('hidden');


        console.log('[Merge Tower] First time player - showing tutorial prompt');
        tutorialPrompt = new TutorialPrompt(graphics, handleTutorialChoice);
        tutorialPrompt.show();
        showTutorialPrompt = true;
        game.pause(); // Pause game while showing prompt


        // Expose tutorial prompt tap handler globally for game.js
        window.handleTutorialPromptTap = (screenPos) => {
            if (tutorialPrompt && showTutorialPrompt) {
                return tutorialPrompt.handleTap(screenPos);
            }
            return false;
        };

        // Expose wave mode selector tap handler globally for game.js
        window.handleWaveModeSelectorTap = (screenPos) => {
            if (waveModeSelector && showWaveModeSelector) {
                return waveModeSelector.handleTap(screenPos);
            }
            return false;
        };

        // Expose wave mode selection function globally for game.js restart
        window.showWaveModeSelection = showWaveModeSelection;

        // Start game loop
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);

        console.log('[Merge Tower] Game started!');
    }

    // Just start the game
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
