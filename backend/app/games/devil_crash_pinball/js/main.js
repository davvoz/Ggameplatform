import { Game } from './core/Game.js';

/**
 * Boot. Waits for fonts + SDK, fades loading screen, then starts the loop.
 */
const canvas = document.getElementById('game');
if (canvas) {
    const loadingScreen = document.getElementById('loading-screen');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    const game = new Game(canvas);

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const sdk = typeof globalThis !== 'undefined' && globalThis.PlatformSDK;
            if (sdk && typeof sdk.toggleFullscreen === 'function') sdk.toggleFullscreen();
            else if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
        });
    }

    // Ensure Google Fonts are ready so canvas drawText uses Orbitron/Exo 2
    await document.fonts.ready.catch(() => { /* standalone fallback */ });

    try {
        await game.init();
    } catch (err) {
        console.warn('[devil_crash_pinball] init failed, continuing in standalone mode', err);
    }

    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.remove();
            game.start();
        }, { once: true });
        // Failsafe: if transitionend never fires (e.g. reduced-motion), start anyway
        setTimeout(() => { if (!game.running) game.start(); }, 900);
    } else {
        game.start();
    }
    if (typeof globalThis !== 'undefined') globalThis.__devilCrash = game;
}
