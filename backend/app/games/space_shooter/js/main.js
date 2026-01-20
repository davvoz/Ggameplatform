/**
 * Main entry point
 */

// Track if game session has been started
let sessionStarted = false;

// Initialize Platform SDK
async function initSDK() {
    if (typeof PlatformSDK !== 'undefined') {
        try {
            await PlatformSDK.init({
                onStart: () => {
                    console.log('[Space Shooter] Platform requested start');
                },
                onPause: () => {
                    console.log('[Space Shooter] Platform requested pause');
                    if (window.game && window.game.state === 'playing') {
                        window.game.togglePause();
                    }
                },
                onResume: () => {
                    console.log('[Space Shooter] Platform requested resume');
                    if (window.game && window.game.state === 'paused') {
                        window.game.togglePause();
                    }
                }
            });
            console.log('📡 Platform SDK initialized for Space Shooter');
        } catch (error) {
            console.warn('⚠️ PlatformSDK init failed:', error);
        }
    } else {
        console.warn('⚠️ PlatformSDK not available');
    }
}

// Start game session (call when actual gameplay begins)
function startGameSession() {
    if (sessionStarted) return;
    sessionStarted = true;
    
    if (typeof PlatformSDK !== 'undefined') {
        try {
            window.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0'
            }, '*');
            console.log('🎮 Game session started for Space Shooter');
        } catch (error) {
            console.error('⚠️ Failed to start game session:', error);
        }
    }
}

// Send score to platform (call on game over)
function sendScoreToPlatform(finalScore, extraData = {}) {
    if (typeof PlatformSDK !== 'undefined') {
        try {
            PlatformSDK.gameOver(finalScore, {
                extra_data: {
                    level: window.game?.level || 1,
                    wave: window.game?.waveNumber || 0,
                    ...extraData
                }
            });
            console.log(`📊 Score sent: ${finalScore}`);
        } catch (error) {
            console.error('⚠️ Failed to send score:', error);
        }
    }
    // Reset session for next game
    sessionStarted = false;
}

// Show XP banner (exposed globally for platform)
function showXPBanner(xpAmount, extraData = null) {
    if (window.game && typeof window.game.showXPBanner === 'function') {
        window.game.showXPBanner(xpAmount, extraData);
    }
}

// Show stats banner (exposed globally for platform)
function showStatsBanner(stats) {
    if (window.game && typeof window.game.showStatsBanner === 'function') {
        window.game.showStatsBanner(stats);
    }
}

// Show level up notification (exposed globally for platform)
function showLevelUpNotification(levelUpData) {
    if (window.game && typeof window.game.showLevelUpNotification === 'function') {
        window.game.showLevelUpNotification(levelUpData);
    }
}

// Export functions for Game.js to use
window.startGameSession = startGameSession;
window.sendScoreToPlatform = sendScoreToPlatform;
window.showXPBanner = showXPBanner;
window.showStatsBanner = showStatsBanner;
window.showLevelUpNotification = showLevelUpNotification;

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Initialize SDK first
    await initSDK();
    
    // Prevent default touch behaviors (exclude fullscreen button)
    document.body.addEventListener('touchstart', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Initialize game
    const game = new Game(canvas);
    
    // Expose game instance for debugging
    window.game = game;
    
    // Fullscreen button - use click event (works for both mouse and touch)
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Update icon when fullscreen changes
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
    document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

    updateFullscreenIcon();

    console.log('🚀 Space Shooter initialized!');
});

// ===== FULLSCREEN FUNCTIONALITY =====
function toggleFullscreen() {
    // Prefer Platform SDK if available (works on iOS!)
    if (window.PlatformSDK && typeof window.PlatformSDK.toggleFullscreen === 'function') {
        window.PlatformSDK.toggleFullscreen();
        return;
    }

    // Use game-container for Android compatibility
    const elem = document.getElementById('game-container') || document.documentElement;
    
    // iOS/iPadOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    
    if ((isIOS || isIPadOS) && !fullscreenSupported) {
        // iOS doesn't support Fullscreen API - use CSS workaround
        toggleIOSFullscreen();
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
                    setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch((err) => {
                    console.warn('Fullscreen request failed:', err);
                    // Fallback to iOS method if native fails
                    toggleIOSFullscreen();
                });
            } else {
                document.body.classList.add('game-fullscreen');
                setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
            }
        } else {
            // Fallback to iOS method
            toggleIOSFullscreen();
        }
    } else {
        // Exit fullscreen
        const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFs) {
            const promise = exitFs.call(document);
            if (promise && promise.then) {
                promise.then(() => {
                    document.body.classList.remove('game-fullscreen');
                    setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch(() => {});
            } else {
                document.body.classList.remove('game-fullscreen');
                setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
            }
        }
    }
}

// iOS Fullscreen CSS workaround (since iOS Safari doesn't support Fullscreen API)
function toggleIOSFullscreen() {
    const isFullscreen = document.body.classList.contains('ios-game-fullscreen');
    
    if (isFullscreen) {
        // Exit fullscreen
        document.documentElement.classList.remove('ios-game-fullscreen');
        document.body.classList.remove('ios-game-fullscreen');
        document.body.classList.remove('game-fullscreen');
        document.body.style.overflow = '';
        const exitBtn = document.getElementById('ios-fs-exit');
        if (exitBtn) exitBtn.remove();
        updateFullscreenIcon();
        setTimeout(() => { try { window.game && window.game.resize(); } catch(e){} }, 100);
    } else {
        // Enter fullscreen
        injectIOSFullscreenStyles();
        document.documentElement.classList.add('ios-game-fullscreen');
        document.body.classList.add('ios-game-fullscreen');
        document.body.classList.add('game-fullscreen');
        document.body.style.overflow = 'hidden';
        createIOSExitButton();
        updateFullscreenIcon();
        // Scroll to hide address bar on iOS
        setTimeout(() => {
            window.scrollTo(0, 1);
            try { window.game && window.game.resize(); } catch(e){}
        }, 100);
        // Try again after a short delay
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 300);
    }
}

function injectIOSFullscreenStyles() {
    if (document.getElementById('ios-fullscreen-styles')) return;
    const style = document.createElement('style');
    style.id = 'ios-fullscreen-styles';
    style.textContent = `
        html.ios-game-fullscreen,
        html.ios-game-fullscreen body {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            -webkit-overflow-scrolling: auto !important;
        }
        html.ios-game-fullscreen body {
            min-height: 100vh !important;
            min-height: 100dvh !important;
            min-height: -webkit-fill-available !important;
        }
        .ios-game-fullscreen #game-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            height: -webkit-fill-available !important;
            z-index: 999999 !important;
            background: #000 !important;
        }
        .ios-game-fullscreen #gameCanvas {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            height: -webkit-fill-available !important;
        }
        .ios-game-fullscreen #fullscreen-btn {
            position: fixed !important;
            top: max(10px, env(safe-area-inset-top)) !important;
            right: max(10px, env(safe-area-inset-right)) !important;
            z-index: 9999998 !important;
        }
        .ios-game-fullscreen #touch-controls,
        .ios-game-fullscreen #start-screen,
        .ios-game-fullscreen #game-over-screen,
        .ios-game-fullscreen #settings-popup {
            z-index: 1000000 !important;
        }
        #ios-fs-exit {
            position: fixed !important;
            top: max(10px, env(safe-area-inset-top)) !important;
            right: max(60px, calc(env(safe-area-inset-right) + 50px)) !important;
            z-index: 9999999 !important;
            background: rgba(0,0,0,0.7) !important;
            color: white !important;
            border: none !important;
            border-radius: 50% !important;
            width: 44px !important;
            height: 44px !important;
            font-size: 24px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            -webkit-tap-highlight-color: transparent;
        }
    `;
    document.head.appendChild(style);
}

function createIOSExitButton() {
    if (document.getElementById('ios-fs-exit')) return;
    const btn = document.createElement('button');
    btn.id = 'ios-fs-exit';
    btn.innerHTML = '✕';
    btn.setAttribute('aria-label', 'Exit fullscreen');
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleIOSFullscreen();
    });
    document.body.appendChild(btn);
}

function updateFullscreenIcon() {
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
