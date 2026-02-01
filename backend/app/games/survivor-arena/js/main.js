/**
 * Survivor Arena - Entry Point
 * @fileoverview Initializes the game when the page loads
 */

'use strict';

// Game instance
let game = null;

/**
 * Initialize game when DOM is ready
 */
function initGame() {
    console.log('[Main] Initializing Survivor Arena...');
    console.log('[Main] Version: 1.0.0');
    
    // Create game instance
    try {
        game = new Game();
        console.log('[Main] Game instance created successfully');
    } catch (error) {
        console.error('[Main] Failed to initialize game:', error);
        showErrorScreen(error.message);
    }
}

/**
 * Show error screen if initialization fails
 * @param {string} message 
 */
function showErrorScreen(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #ff4444;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2>Failed to Load Game</h2>
                <p style="color: #aaa; margin-top: 10px;">${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 30px;
                    background: #ff00ff;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                ">Retry</button>
            </div>
        `;
    }
}

/**
 * Handle platform ready event
 */
function onPlatformReady() {
    console.log('[Main] Platform SDK ready');
    
    if (game) {
        game.platformReady = true;
    }
}

/**
 * Handle messages from parent frame (platform)
 */
function handleMessage(event) {
    const data = event.data;
    
    if (!data || typeof data !== 'object') return;
    
    switch (data.type) {
        case 'platformReady':
            onPlatformReady();
            break;
            
        case 'pause':
            if (game && game.state === 'playing') {
                game.pauseGame();
            }
            break;
            
        case 'resume':
            if (game && game.state === 'paused') {
                game.resumeGame();
            }
            break;
            
        case 'mute':
            if (game && game.audio) {
                game.audio.mute();
            }
            break;
            
        case 'unmute':
            if (game && game.audio) {
                game.audio.unmute();
            }
            break;
            
        case 'showXPBanner':
            if (data.payload && game) {
                console.log('🎁 [Window Message] Showing XP banner:', data.payload);
                showXPBanner(data.payload.xp_earned, data.payload);
            }
            break;
            
        case 'showLevelUpModal':
            if (data.payload && game) {
                console.log('🎉 [Window Message] Showing level-up:', data.payload);
                showLevelUpNotification(data.payload);
            }
            break;
    }
}

// Show XP banner (exposed globally for platform)
function showXPBanner(xpAmount, extraData = null) {
    console.log('🎁 Showing XP banner inside game:', xpAmount, extraData);
    
    // Create banner element
    const banner = document.createElement('div');
    banner.className = 'game-xp-banner';
    banner.innerHTML = `
        <div class="game-xp-badge">
            <span class="game-xp-icon">⭐</span>
            <span class="game-xp-amount">+${Number(xpAmount).toFixed(2)} XP</span>
        </div>
    `;
    
    // Append to game-container for fullscreen compatibility
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(banner);
    
    // Remove after 3.5 seconds
    setTimeout(() => {
        banner.classList.add('hiding');
        setTimeout(() => banner.remove(), 500);
    }, 3500);
}

// Show level-up notification (platform level-up, not in-game level-up)
function showLevelUpNotification(levelUpData) {
    console.log('🎉 Showing level-up notification:', levelUpData);
    
    const { old_level, new_level, title, badge, coins_awarded, is_milestone, user_data } = levelUpData;

    // Check if user is anonymous
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

    // Append to game-container for fullscreen compatibility
    const container = document.getElementById('game-container') || document.body;
    container.appendChild(modal);

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

// Expose globally
window.showXPBanner = showXPBanner;
window.showLevelUpNotification = showLevelUpNotification;

// Listen for platform messages
window.addEventListener('message', handleMessage);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Prevent default touch behaviors (exclude buttons and interactive elements)
        document.body.addEventListener('touchstart', (e) => {
            // Don't prevent on buttons, inputs, or interactive elements
            if (e.target.closest('button, input, .btn-primary, .btn-secondary, .upgrade-option, .modal, .screen, #fullscreen-btn, #settings-popup, .toggle-btn')) {
                return;
            }
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchmove', (e) => {
            // Don't prevent on buttons or interactive elements
            if (e.target.closest('button, input, .btn-primary, .btn-secondary, .upgrade-option, .modal, .screen, #fullscreen-btn, #settings-popup, .toggle-btn')) {
                return;
            }
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        initGame();
        setupFullscreen();
    });
} else {
    // Prevent default touch behaviors (exclude buttons and interactive elements)
    document.body.addEventListener('touchstart', (e) => {
        // Don't prevent on buttons, inputs, or interactive elements
        if (e.target.closest('button, input, .btn-primary, .btn-secondary, .upgrade-option, .modal, .screen, #fullscreen-btn, #settings-popup, .toggle-btn')) {
            return;
        }
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', (e) => {
        // Don't prevent on buttons or interactive elements
        if (e.target.closest('button, input, .btn-primary, .btn-secondary, .upgrade-option, .modal, .screen, #fullscreen-btn, #settings-popup, .toggle-btn')) {
            return;
        }
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    initGame();
    setupFullscreen();
}

// ===== FULLSCREEN FUNCTIONALITY =====
function setupFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Update icon when fullscreen changes
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
    document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

    updateFullscreenIcon();
}

function toggleFullscreen() {
    // Use #game-container for fullscreen
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
                    setTimeout(() => { try { game && game.handleResize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch((err) => {
                    console.warn('Fullscreen request failed:', err);
                    // Fallback to iOS method if native fails
                    toggleIOSFullscreen();
                });
            } else {
                document.body.classList.add('game-fullscreen');
                setTimeout(() => { try { game && game.handleResize(); } catch(e){} }, 100);
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
                    setTimeout(() => { try { game && game.handleResize(); } catch(e){} }, 100);
                    updateFullscreenIcon();
                }).catch(() => {});
            } else {
                document.body.classList.remove('game-fullscreen');
                setTimeout(() => { try { game && game.handleResize(); } catch(e){} }, 100);
            }
        }
    }
}

// iOS Fullscreen CSS workaround
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
        setTimeout(() => { try { game && game.handleResize(); } catch(e){} }, 100);
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
            try { game && game.handleResize(); } catch(e){}
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
            left: max(10px, env(safe-area-inset-left)) !important;
            z-index: 9999998 !important;
        }
        .ios-game-fullscreen .screen,
        .ios-game-fullscreen #gameUI,
        .ios-game-fullscreen .joystick-container,
        .ios-game-fullscreen .modal,
        .ios-game-fullscreen #settings-popup {
            z-index: 1000000 !important;
        }
        #ios-fs-exit {
            position: fixed !important;
            top: max(10px, env(safe-area-inset-top)) !important;
            left: max(60px, calc(env(safe-area-inset-left) + 50px)) !important;
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
    const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.body.classList.contains('ios-game-fullscreen');
    btn.innerHTML = isFs
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
         </svg>`;
}

// Notify parent that game frame is ready
window.addEventListener('load', () => {
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'gameReady',
            game: 'survivor-arena'
        }, '*');
    }
});

// Prevent context menu on canvas (for mobile)
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && game.state === 'playing') {
        game.pauseGame();
    }
});

// Export for debugging
window.survivorArena = {
    getGame: () => game,
    restart: () => game?.startGame(),
    pause: () => game?.pauseGame(),
    resume: () => game?.resumeGame()
};
