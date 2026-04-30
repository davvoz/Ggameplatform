import Game from './Game.js';
import AudioVisualizer from './managers/AudioVisualizer.js';

/**
 * Space Shooter 2 - Main Entry Point
 * Handles SDK integration, fullscreen, and UI wiring.
 */

let sessionStarted = false;

// ========== SDK ==========

async function initSDK() {
    if (typeof PlatformSDK !== 'undefined') {
        try {
            await PlatformSDK.init({
                onStart: () => {},
                onPause: () => {
                    if (globalThis.game?.state === 'playing') {
                        globalThis.game.togglePause();
                    }
                },
                onResume: () => {
                    if (globalThis.game?.state === 'paused') {
                        globalThis.game.togglePause();
                    }
                }
            });
        } catch (e) {
            console.warn('[SS2] SDK init error:', e);
        }
    }
}

function startGameSession() {
    if (sessionStarted) return;
    sessionStarted = true;
    if (typeof PlatformSDK !== 'undefined') {
        try {
            const targetOrigin = document.referrer ? new URL(document.referrer).origin : globalThis.location.origin;
            globalThis.parent.postMessage({
                type: 'gameStarted',
                payload: {},
                timestamp: Date.now(),
                protocolVersion: '1.0.0'
            }, targetOrigin);
        } catch (e) {
            console.error('[SS2] Failed to start session:', e);
        }
    }
}

function sendScoreToPlatform(finalScore, extraData = {}) {
    if (typeof PlatformSDK !== 'undefined') {
        try {
            PlatformSDK.gameOver(finalScore, {
                extra_data: {
                    level: globalThis.game?.currentLevel || 1,
                    ...extraData
                }
            });
        } catch (e) {
            console.error('[SS2] Failed to send score:', e);
        }
    }
    sessionStarted = false;
}

function showXPBanner(xpAmount, extraData = null) {
    if (globalThis.game && typeof globalThis.game.showXPBanner === 'function') {
        globalThis.game.showXPBanner(xpAmount, extraData);
    }
}

function showStatsBanner(stats) {
    if (globalThis.game && typeof globalThis.game.showStatsBanner === 'function') {
        globalThis.game.showStatsBanner(stats);
    }
}

function showLevelUpNotification(levelUpData) {
    if (globalThis.game && typeof globalThis.game.showLevelUpNotification === 'function') {
        globalThis.game.showLevelUpNotification(levelUpData);
    }
}

globalThis.startGameSession = startGameSession;
globalThis.sendScoreToPlatform = sendScoreToPlatform;
globalThis.showXPBanner = showXPBanner;
globalThis.showStatsBanner = showStatsBanner;
globalThis.showLevelUpNotification = showLevelUpNotification;

// ========== DOMContentLoaded ==========

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error('Canvas not found!'); return; }

    await initSDK();

    // Prevent default touch behaviors
    document.body.addEventListener('touchstart', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn') && !e.target.closest('.hud-btn') && !e.target.closest('.ui-screen')) {
            e.preventDefault();
        }
    }, { passive: false });
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container') && !e.target.closest('#fullscreen-btn') && !e.target.closest('.hud-btn') && !e.target.closest('.ui-screen')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Create game
    const game = await Game.create(canvas);
    globalThis.game = game;

    // Audio-reactive visualizer for popup screens
    const audioViz = new AudioVisualizer(game.sound);
    globalThis.audioViz = audioViz;

    /**
     * Show a UI screen with audio-reactive background.
     * @param {string} screenId - The screen element ID
     * @param {boolean} withViz - Whether to attach the audio visualizer (default: true)
     */
    function showScreen(screenId, withViz = true) {
        const el = document.getElementById(screenId);
        if (!el) return;
        el.classList.remove('hidden');
        if (withViz && game.sound.musicEnabled) {
            audioViz.start(el);
        }
    }

    /**
     * Hide a UI screen and stop the visualizer if it's attached there.
     * @param {string} screenId - The screen element ID
     */
    function hideScreen(screenId) {
        const el = document.getElementById(screenId);
        if (!el) return;
        el.classList.add('hidden');
        // Stop viz if canvas is inside this screen
        if (audioViz.canvas?.parentNode === el) {
            audioViz.stop();
        }
    }

    // Auto-pause on tab switch
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && globalThis.game?.state === 'playing') {
            globalThis.game.togglePause();
        }
    });

    // Sync toggle states whenever game pauses
    globalThis.addEventListener('game-paused', () => {
        syncToggleStates();
    });

    // ========== WORLD PROGRESS ==========
    let unlockedWorlds = 1; // default: only world 1 unlocked
    let selectedWorld = 1;

    // Load progress from DB when SDK is ready
    async function loadWorldProgress() {
        if (typeof PlatformSDK !== 'undefined' && PlatformSDK.loadProgress) {
            try {
                const data = await PlatformSDK.loadProgress();
                if (data?.worlds_unlocked) {
                    unlockedWorlds = data.worlds_unlocked;
                }
            } catch (e) {
                console.warn('[SS2] Failed to load progress:', e);
            }
        }
        updateWorldCards();
    }

    function updateWorldCards() {
        const panel = document.getElementById('world-select-panel');
        document.querySelectorAll('.world-card').forEach(card => {
            const worldNum = Number.parseInt(card.dataset.world);
            const isLocked = worldNum > unlockedWorlds;
            card.classList.toggle('locked', isLocked);
            const icon = card.querySelector('.diff-icon');
            const lockLabel = card.querySelector('.world-lock-label');
            updateCardAppearance(isLocked, icon, lockLabel, card, worldNum);
        });
        // Ensure a valid world is selected
        const anySelected = document.querySelector('.world-card.selected:not(.locked)');
        if (!anySelected) {
            const first = document.querySelector('.world-card:not(.locked)');
            if (first) { first.classList.add('selected'); selectedWorld = Number.parseInt(first.dataset.world); }
        }
        // Show world panel only if 2+ worlds are unlocked
        if (panel) {
            if (unlockedWorlds > 1) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
                selectedWorld = 1;
            }
        }
    }

    // Save progress when a world is completed
    globalThis.saveWorldProgress = function(worldCompleted) {
        const newUnlock = Math.max(unlockedWorlds, worldCompleted + 1);
        if (newUnlock > unlockedWorlds) {
            unlockedWorlds = newUnlock;
            if (typeof PlatformSDK !== 'undefined' && PlatformSDK.saveProgress) {
                PlatformSDK.saveProgress({ worlds_unlocked: unlockedWorlds });
            }
        }
    };

    // Load progress on startup
    loadWorldProgress();

    // ========== SAVE / LOAD ==========

    // Load saved checkpoint and show CONTINUE button if available
    async function loadSaveData() {
        const save = await game.saveManager.loadRaw();
        const btnContinue = document.getElementById('btn-continue');
        const infoEl = document.getElementById('continue-info');
        if (save && btnContinue) {
            btnContinue.classList.remove('hidden');
            // Show save info (level + date)
            const dt = new Date(save.ts);
            const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const worldNum = Math.ceil(save.level / 30);
            infoEl.textContent = `Level ${save.level} · World ${worldNum} · ${dateStr}`;
        } else if (btnContinue) {
            btnContinue.classList.add('hidden');
        }
    }
    loadSaveData();

    // CONTINUE button → load save and start playing
    document.getElementById('btn-continue')?.addEventListener('click', () => {
        const save = game.saveManager.getCachedSave();
        if (!save) return;
        game.sound.playMenuClick();
        hideScreen('start-screen');
        game.sound.resume();
        game.sound.playGameMusic();
        game.loadSavedGame(save);
    });

    // SAVE from pause menu (save and keep playing)
    document.getElementById('btn-save')?.addEventListener('click', async () => {
        game.sound.playMenuClick();
        await game.saveMidLevel();
    });

    // SAVE & QUIT from pause menu
    document.getElementById('btn-save-quit')?.addEventListener('click', async () => {
        game.sound.playMenuClick();
        await game.saveMidLevel();
        game.state = 'menu';
        showScreen('start-screen', false);
        hideScreen('settings-popup');
        game._hideHudButtons();
        game.sound.playIntroMusic();
        // Refresh continue button
        await loadSaveData();
    });

    // ========== DIFFICULTY SELECTION ==========
    const diffCards = document.querySelectorAll('.diff-card');
    let selectedDifficulty = 'boring';

    diffCards.forEach(card => {
        card.addEventListener('click', () => {
            diffCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedDifficulty = card.dataset.difficulty;
            game.sound.playMenuClick();
        });
    });

    // ========== WORLD SELECTION ==========
    document.querySelectorAll('.world-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('locked')) return;
            document.querySelectorAll('.world-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedWorld = Number.parseInt(card.dataset.world);
            game.sound.playMenuClick();
        });
    });

    // ========== SHIP SELECTION ==========
    const shipCards = document.querySelectorAll('.ship-card');
    const ultimateCards = document.querySelectorAll('.ultimate-card');
    let selectedShip = 'vanguard';
    let selectedUltimate = 'nova_blast';

    shipCards.forEach(card => {
        card.addEventListener('click', () => {
            shipCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedShip = card.dataset.shipId;
            game.sound.playMenuClick();
        });
    });

    ultimateCards.forEach(card => {
        card.addEventListener('click', () => {
            ultimateCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedUltimate = card.dataset.ultimateId;
            game.sound.playMenuClick();
        });
    });

    // Start screen → Cinematic → Difficulty select
    document.getElementById('btn-start')?.addEventListener('click', () => {
        hideScreen('start-screen');
        game.sound.playMenuClick();
        game.sound.resume();
        game.sound.playIntroMusic();
        const onCinematicDone = () => {
            showScreen('difficulty-select-screen');
        };
        // Play world-specific opening cinematic (World 1: game intro, World 2+: world intro)
        game.startCinematic(onCinematicDone, selectedWorld);
    });

    // Difficulty select → Ship select
    document.getElementById('btn-select-difficulty')?.addEventListener('click', () => {
        hideScreen('difficulty-select-screen');
        showScreen('ship-select-screen');
        game.sound.playMenuClick();
    });

    // Ship select → Ultimate select
    document.getElementById('btn-select-ship')?.addEventListener('click', () => {
        hideScreen('ship-select-screen');
        showScreen('ultimate-select-screen');
        game.sound.playMenuClick();
    });

    // Ultimate select → Start game (or Survivor pre-pick for World 5)
    document.getElementById('btn-select-ultimate')?.addEventListener('click', () => {
        hideScreen('ultimate-select-screen');
        game.sound.playMenuClick();

        if (selectedWorld === 5) {
            // Survivor: take over the existing perk-select screen for the pre-run pick.
            game.survivorPicker.reset();
            game.survivorPicker.mount({
                onBack: () => {
                    game.survivorPicker.unmount();
                    hideScreen('perk-select-screen');
                    showScreen('ultimate-select-screen');
                    game.sound.playMenuClick();
                },
                onStart: () => {
                    game.survivorPicker.commitPicks();
                    game.survivorPicker.unmount();
                    hideScreen('perk-select-screen');
                    game.sound.playMenuClick();
                    game.saveManager.deleteSave();
                    game.startSurvivorRun(selectedShip, selectedUltimate, selectedDifficulty);
                }
            });
            showScreen('perk-select-screen');
            return;
        }

        // New game clears any existing save
        game.saveManager.deleteSave();
        game.startGame(selectedShip, selectedUltimate, selectedDifficulty, selectedWorld);
    });

    // (Survivor BACK / ENTER ARENA wiring is handled by SurvivorPerkPicker.mount callbacks.)

    // Back buttons
    document.getElementById('btn-back-to-start')?.addEventListener('click', () => {
        hideScreen('difficulty-select-screen');
        showScreen('start-screen', false);
        game.sound.playMenuClick();
    });
    document.getElementById('btn-back-to-menu')?.addEventListener('click', () => {
        hideScreen('ship-select-screen');
        showScreen('difficulty-select-screen');
        game.sound.playMenuClick();
    });
    document.getElementById('btn-back-to-ships')?.addEventListener('click', () => {
        hideScreen('ultimate-select-screen');
        showScreen('ship-select-screen');
        game.sound.playMenuClick();
    });

    // ========== LEVEL COMPLETE ==========
    document.getElementById('btn-next-level')?.addEventListener('click', () => {
        game.sound.playMenuClick();
        const lcScreen = document.getElementById('level-complete-screen');
        // Skip perk screen on world-end levels (30, 60) — world transition or victory follows
        const isWorldEnd = (game.currentLevel % 30 === 0);
        if (isWorldEnd) {
            game.hideLevelCompleteScreen();
            game.startNextLevel();
        } else {
            // Cross-fade directly into perk screen (no flash)
            game.showPerkScreen(lcScreen);
        }
    });

    // ========== SHOP ==========
    document.getElementById('btn-shop-continue')?.addEventListener('click', () => {
        game.hideShopScreen();
        game.startNextLevel();
        game.sound.playMenuClick();
    });

    // ========== GAME OVER ==========
    document.getElementById('go-continue-btn')?.addEventListener('click', () => {
        game.uiManager.handleContinue();
        game.sound.playMenuClick();
    });

    document.getElementById('go-continue-build-btn')?.addEventListener('click', () => {
        game.uiManager.handleContinueChangeBuild();
        game.sound.playMenuClick();
    });

    document.getElementById('perk-swap-confirm')?.addEventListener('click', () => {
        game.uiManager.confirmPerkSwap();
        game.sound.playMenuClick();
    });

    document.getElementById('perk-swap-cancel')?.addEventListener('click', () => {
        game.uiManager.hidePerkSwapOverlay();
        game.sound.playMenuClick();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
        game.state = 'menu';
        game.clearAllEntities();
        // Ensure save is cleared on game over (run ended)
        game.saveManager.deleteSave();
        loadWorldProgress();
        loadSaveData();
        showScreen('start-screen', false);
        hideScreen('game-over-screen');
        game.sound.playIntroMusic();
        game.sound.playMenuClick();
    });

    // ========== VICTORY ==========
    document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
        game.state = 'menu';
        game.clearAllEntities();
        loadWorldProgress();
        // Delete save on victory (game completed)
        game.saveManager.deleteSave();
        loadSaveData();
        showScreen('start-screen', false);
        hideScreen('victory-screen');
        game.sound.playIntroMusic();
        game.sound.playMenuClick();
    });

    // ========== SETTINGS / PAUSE ==========
    document.getElementById('btn-resume')?.addEventListener('click', () => {
        game.togglePause();
        game.sound.playMenuClick();
    });
    document.getElementById('btn-toggle-music')?.addEventListener('click', () => {
        game.sound.toggleMusic();
        updateMusicToggle();
        game.sound.playMenuClick();
    });
    document.getElementById('btn-toggle-sfx')?.addEventListener('click', () => {
        game.sound.toggleSFX();
        updateSfxToggle();
        game.sound.playMenuClick();
    });
    document.getElementById('btn-quit')?.addEventListener('click', () => {
        game.state = 'menu';
        showScreen('start-screen', false);
        hideScreen('settings-popup');
        game._hideHudButtons();
        game.sound.playIntroMusic();
        game.sound.playMenuClick();
        loadSaveData();
    });

    // ========== PERFORMANCE BUTTONS ==========
    document.querySelectorAll('.perf-btn').forEach(btn => {
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const mode = btn.dataset.perf;
            if (mode) {
                game.setPerformanceMode(mode);
                game.sound.playMenuClick();
            }
        };
        btn.addEventListener('click', handler);
        btn.addEventListener('touchend', handler);
    });

    // Sync perf button active state on load
    const savedPerf = game.performanceMode || 'high';
    document.querySelectorAll('.perf-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.perf === savedPerf);
    });

    // HUD buttons
    document.getElementById('hud-settings-btn')?.addEventListener('click', () => {
        if (game.state === 'playing') {
            game.togglePause();
            game.sound.playMenuClick();
        }
    });
    document.getElementById('hud-ship-btn')?.addEventListener('click', () => {
        if (game.state === 'playing') {
            game.showShipDetail();
            game.sound.playMenuClick();
        }
    });
    document.getElementById('btn-close-detail')?.addEventListener('click', () => {
        game.closeShipDetail();
        game.sound.playMenuClick();
    });

    function syncToggleStates() {
        updateMusicToggle();
        updateSfxToggle();
    }

    function updateMusicToggle() {
        const btn = document.getElementById('btn-toggle-music');
        if (btn) {
            const on = game.sound.musicEnabled;
            btn.textContent = on ? 'ON' : 'OFF';
            btn.classList.toggle('on', on);
            btn.classList.toggle('off', !on);
        }
    }
    function updateSfxToggle() {
        const btn = document.getElementById('btn-toggle-sfx');
        if (btn) {
            const on = game.sound.sfxEnabled;
            btn.textContent = on ? 'ON' : 'OFF';
            btn.classList.toggle('on', on);
            btn.classList.toggle('off', !on);
        }
    }

    // ========== FULLSCREEN ==========
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    updateFullscreenIcon();
});

function updateCardAppearance(isLocked, icon, lockLabel, card, worldNum) {
    if (isLocked) {
        setLockedIcon(icon, lockLabel);
        card.classList.remove('selected');
    } else {
        // Restore original icon
        updateIconForWorld(icon, worldNum, lockLabel);
    }
}

function setLockedIcon(icon, lockLabel) {
    if (icon) icon.textContent = '▣';
    if (lockLabel) lockLabel.style.display = '';
}

function updateIconForWorld(icon, worldNum, lockLabel) {
    if (icon) {
        if (worldNum === 1) icon.textContent = '◆';
        else if (worldNum === 2) icon.textContent = '◇';
        else if (worldNum === 3) icon.textContent = '⬡';
        else if (worldNum === 4) icon.textContent = '⚛';
    }
    if (lockLabel) lockLabel.style.display = 'none';
}

// ===== FULLSCREEN =====

function toggleFullscreen() {
    if (globalThis.PlatformSDK && typeof globalThis.PlatformSDK.toggleFullscreen === 'function') {
        globalThis.PlatformSDK.toggleFullscreen();
        return;
    }

    const elem = document.getElementById('game-container') || document.documentElement;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !globalThis.MSStream;
    const isIPadOS = /Mac|iPad/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
    const fullscreenSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;

    if ((isIOS || isIPadOS) && !fullscreenSupported) {
        toggleIOSFullscreen();
        return;
    }

    const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (fsElement) {
        exitFullscreenHandler();
    } else {
        requestFullscreen(elem);
    }
}

function exitFullscreenHandler() {
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exitFs) {
        const p = exitFs.call(document);
        if (p?.then) {
            p.then(() => {
                document.body.classList.remove('game-fullscreen');
                setTimeout(() => {
                    try { globalThis.game?.resize(); } catch (e) {
                        console.warn('Resize failed after exiting fullscreen:', e);
                    }
                }, 100);
                updateFullscreenIcon();
            }).catch(() => { });
        } else {
            document.body.classList.remove('game-fullscreen');
            setTimeout(() => {
                try { globalThis.game?.resize(); } catch (e) {
                    console.warn('Resize failed after exiting fullscreen:', e);
                }
            }, 100);
        }
    }
}

function requestFullscreen(elem) {
    const requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
    if (requestFs) {
        const p = requestFs.call(elem);
        if (p?.then) {
            p.then(() => {
                document.body.classList.add('game-fullscreen');
                setTimeout(() => {
                    try { globalThis.game?.resize(); } catch (e) {
                        console.warn('Resize failed after entering fullscreen:', e);
                    }
                }, 100);
                updateFullscreenIcon();
            }).catch(() => toggleIOSFullscreen());
        } else {
            document.body.classList.add('game-fullscreen');
            setTimeout(() => {
                try { globalThis.game?.resize(); } catch (e) {
                    console.warn('Resize failed after entering fullscreen:', e);
                }
            }, 100);
        }
    } else {
        toggleIOSFullscreen();
    }
}

function toggleIOSFullscreen() {
    const isFs = document.body.classList.contains('ios-game-fullscreen');
    if (isFs) {
        document.documentElement.classList.remove('ios-game-fullscreen');
        document.body.classList.remove('ios-game-fullscreen', 'game-fullscreen');
        document.body.style.overflow = '';
        const exitBtn = document.getElementById('ios-fs-exit');
        if (exitBtn) exitBtn.remove();
        updateFullscreenIcon();
        setTimeout(() => { try { globalThis.game?.resize(); } catch(e){
            console.warn('Resize failed after exiting iOS fullscreen:', e);
        } }, 100);
    } else {
        injectIOSFullscreenStyles();
        document.documentElement.classList.add('ios-game-fullscreen');
        document.body.classList.add('ios-game-fullscreen', 'game-fullscreen');
        document.body.style.overflow = 'hidden';
        createIOSExitButton();
        updateFullscreenIcon();
        setTimeout(() => { window.scrollTo(0, 1); try { globalThis.game?.resize(); } catch(e){
            console.warn('Resize failed after entering iOS fullscreen:', e);
        } }, 100);
        setTimeout(() => { window.scrollTo(0, 1); }, 300);
    }
}

function injectIOSFullscreenStyles() {
    if (document.getElementById('ios-fullscreen-styles')) return;
    const style = document.createElement('style');
    style.id = 'ios-fullscreen-styles';
    style.textContent = `
        html.ios-game-fullscreen, html.ios-game-fullscreen body {
            position: fixed !important; top: 0 !important; left: 0 !important;
            right: 0 !important; bottom: 0 !important;
            width: 100% !important; height: 100% !important;
            overflow: hidden !important; -webkit-overflow-scrolling: auto !important;
        }
        html.ios-game-fullscreen body { min-height: 100dvh !important; min-height: -webkit-fill-available !important; }
        .ios-game-fullscreen #game-container {
            position: fixed !important; top: 0 !important; left: 0 !important;
            right: 0 !important; bottom: 0 !important;
            width: 100vw !important; height: 100dvh !important;
            z-index: 999999 !important; background: #000 !important;
        }
        .ios-game-fullscreen #gameCanvas {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100dvh !important;
        }
        .ios-game-fullscreen #fullscreen-btn {
            position: fixed !important; top: max(10px, env(safe-area-inset-top)) !important;
            right: max(10px, env(safe-area-inset-right)) !important; z-index: 9999998 !important;
        }
        #ios-fs-exit {
            position: fixed !important; top: max(10px, env(safe-area-inset-top)) !important;
            right: max(60px, calc(env(safe-area-inset-right) + 50px)) !important;
            z-index: 9999999 !important; background: rgba(0,0,0,0.7) !important;
            color: white !important; border: none !important; border-radius: 50% !important;
            width: 44px !important; height: 44px !important; font-size: 24px !important;
            cursor: pointer !important; display: flex !important;
            align-items: center !important; justify-content: center !important;
        }
    `;
    document.head.appendChild(style);
}

function createIOSExitButton() {
    if (document.getElementById('ios-fs-exit')) return;
    const btn = document.createElement('button');
    btn.id = 'ios-fs-exit';
    btn.innerHTML = '✕';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleIOSFullscreen(); });
    document.body.appendChild(btn);
}

function updateFullscreenIcon() {
    const btn = document.getElementById('fullscreen-btn');
    if (!btn) return;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.body.classList.contains('ios-game-fullscreen');
    btn.innerHTML = isFs
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
}
