/**
 * Main Entry Point
 * Initializes game and handles Platform SDK integration
 */

import { Graphics } from './graphics/graphics.js';
import { InputHandler } from './input.js';
import { UIManager } from './ui.js';
import { WaveModeSelector } from './states/WaveModeSelector.js';
import { Game } from './game.obf.js';
import { CONFIG } from './config.js';
import { TutorialManager, TutorialPrompt } from './states/tutorial.js';

// If PlatformSDK is a module, import it. Otherwise, assume global.
// import { PlatformSDK } from '../../sdk/platformsdk.js';

// Get canvas
const canvas = document.getElementById('gameCanvas');
const loadingScreen = document.getElementById('loadingScreen');

// Initialize systems


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


// ========== PLATFORM SDK INTEGRATION ==========

let platformReady = false;
let sessionActive = false;
let sessionStartTime = 0;
let platformBalance = 0;

async function loadUserBalance() {
    let userId = globalThis.platformConfig?.userId;

    if (!userId && typeof PlatformSDK.getConfig === 'function') {
        userId = PlatformSDK.getConfig()?.userId;
    }

    if (!userId) {
        return 0;
    }

    const response = await fetch(`/api/coins/${userId}/balance`, {
        credentials: 'include'
    });

    if (!response.ok) {
        return 0;
    }

    const data = await response.json();
    return data.balance || 0;
}

async function initializePlatform() {
    await PlatformSDK.init({
        onPause: () => game.pause(),
        onResume: () => game.resume(),
        onExit: () => {
            if (sessionActive) {
                endSession();
            }
            game.gameOver();
        },
        onStart: () => game.resume()
    });

    platformReady = true;
    platformBalance = await loadUserBalance();
    globalThis.platformBalance = platformBalance;
}

try {
    await initializePlatform();
} catch (error) {
    console.error('[Merge Tower] Platform initialization failed:', error);
    platformBalance = 0;
    globalThis.platformBalance = 0;
}

// ========== SESSION MANAGEMENT ==========

function startSession() {
    if (!platformReady || sessionActive) return;

    sessionActive = true;
    sessionStartTime = Date.now();

    // Send gameStarted event to platform
    try {
        const targetOrigin = document.referrer ? new URL(document.referrer).origin : globalThis.location.origin;
        globalThis.parent.postMessage({
            type: 'gameStarted',
            payload: {},
            timestamp: Date.now(),
            protocolVersion: '1.0.0'
        }, targetOrigin);

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

        } catch (error) {
            console.error('[Merge Tower] Failed to send gameOver:', error);
        }
    }

    sessionActive = false;
}

function resetSession() {
    // Close current session if active before resetting
    if (sessionActive) {

        endSession();
    }

    // Reset session state for retry
    sessionActive = false;
    firstUpdate = true;
    lastSentScore = 0;
    sessionStartTime = 0;
    victoryRewardAwarded = false;

}

// ========== CONTINUE SYSTEM ==========

function resolveUserId() {
    return globalThis.platformConfig?.userId
        ?? (typeof PlatformSDK.getConfig === 'function' ? PlatformSDK.getConfig()?.userId : null)
        ?? null;
}

async function handleContinueGame() {
    const continueCost = CONFIG.CONTINUE_COST || 100;
    if (!platformReady || platformBalance < continueCost) return;

    try {
        const userId = resolveUserId();
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

        if (!response.ok) return;

        platformBalance -= continueCost;
        globalThis.platformBalance = platformBalance;
        game.resumeAfterContinue();
        startSession();
    } catch (error) {
        console.error('[Merge Tower] Error during continue:', error);
    }
}

// Expose continue handler globally
globalThis.handleContinueGame = handleContinueGame;

// ========== VICTORY HANDLER ==========

async function handleVictory(coinReward) {
    if (!platformReady || victoryRewardAwarded) return;

    try {
        const userId = resolveUserId();
        if (!userId) {
            console.error('[Merge Tower] No userId available for awarding coins');
            return;
        }

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
        if (!response.ok) return;

        platformBalance += coinReward;
        globalThis.platformBalance = platformBalance;
        victoryRewardAwarded = true;
        endSession();
    } catch (error) {
        console.error('[Merge Tower] Error awarding victory coins:', error);
    }
}

// Expose victory handler globally
globalThis.handleVictory = handleVictory;

// ========== GAME LOOP ==========

let lastTime = performance.now();
let running = false;
let lastSentScore = 0;
let firstUpdate = true;

function updateOverlays(dt) {
    if (waveModeSelector && showWaveModeSelector) waveModeSelector.update(dt);
    if (tutorialPrompt && showTutorialPrompt) tutorialPrompt.update(dt);
    if (tutorialManager.isActive) tutorialManager.update(dt);
}

function renderOverlays(state) {
    if (state.isVictory) ui.showVictory(state, state.coinReward, victoryRewardAwarded);
    if (waveModeSelector && showWaveModeSelector) waveModeSelector.render();
    if (tutorialManager.isActive) tutorialManager.render();
    if (tutorialPrompt && showTutorialPrompt) tutorialPrompt.render();
}

function gameLoop(currentTime) {
    if (!running) return;

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    updateOverlays(dt);

    game.update(dt);


    graphics.gameState = game.getState();
    game.render();

    const state = game.getState();
    renderOverlays(state);

    // Start session on first update (only if not game over, not in tutorial, and wave mode selected)
    if (firstUpdate && platformReady && !state.isGameOver && !tutorialManager.isActive && !showTutorialPrompt && !showWaveModeSelector && state.waveModeSelected) {
        startSession();
        firstUpdate = false;
    }

    if (state.isGameOver && sessionActive) endSession();

    if (platformReady && !state.isGameOver && state.score > lastSentScore) {
        PlatformSDK.sendScore(state.score);
        lastSentScore = state.score;
    }

    requestAnimationFrame(gameLoop);
}

// ========== TUTORIAL HANDLING ==========

function handleTutorialChoice(wantsTutorial) {
    showTutorialPrompt = false;

    if (wantsTutorial) {

        tutorialManager.start();
    } else {

        // Show wave mode selector instead of starting game directly
        showWaveModeSelection();
    }
}

// ========== WAVE MODE SELECTION ==========

function showWaveModeSelection() {

    waveModeSelector = new WaveModeSelector(graphics, handleWaveModeSelected);
    waveModeSelector.show();
    showWaveModeSelector = true;
    game.pause();
}

function handleWaveModeSelected(modeKey) {

    showWaveModeSelector = false;

    // Set the wave mode in game
    game.setWaveMode(modeKey);

    // Resume and start game
    game.resume();
    // Music is OFF by default - player can enable it from settings

    // Start session now that mode is selected
    if (platformReady && !sessionActive) {
        startSession();
        firstUpdate = false;
    }
}

// ========== START GAME ==========

// Expose resetSession globally for game.js
globalThis.resetGameSession = resetSession;

function startGame() {


    // Hide loading screen
    loadingScreen.classList.add('hidden');



    tutorialPrompt = new TutorialPrompt(graphics, handleTutorialChoice);
    tutorialPrompt.show();
    showTutorialPrompt = true;
    game.pause(); // Pause game while showing prompt


    // Expose tutorial prompt tap handler globally for game.js
    globalThis.handleTutorialPromptTap = (screenPos) => {
        if (tutorialPrompt && showTutorialPrompt) {
            return tutorialPrompt.handleTap(screenPos);
        }
        return false;
    };

    // Expose wave mode selector tap handler globally for game.js
    globalThis.handleWaveModeSelectorTap = (screenPos) => {
        if (waveModeSelector && showWaveModeSelector) {
            return waveModeSelector.handleTap(screenPos);
        }
        return false;
    };

    // Expose wave mode selection function globally for game.js restart
    globalThis.showWaveModeSelection = showWaveModeSelection;

    // Start game loop
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);


}

// Just start the game

setTimeout(startGame, 500);

// ========== ERROR HANDLING ==========

globalThis.addEventListener('error', (event) => {
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
if (globalThis.location.search.includes('debug')) {
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
if (screen.orientation?.lock) {
    try {
        await screen.orientation.lock('portrait');
    } catch (err) {
        console.warn('[Merge Tower] Failed to lock screen orientation:', err);
    }
}

// ========== EXPORT FOR DEBUGGING ==========

if (globalThis.location.search.includes('debug')) {
    globalThis.MergeTower = {
        game,
        graphics,
        ui,
        input,
        CONFIG,
        CANNON_TYPES,
        ZOMBIE_TYPES,
        Utils
    };

}
