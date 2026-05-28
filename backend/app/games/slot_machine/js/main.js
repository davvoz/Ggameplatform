/**
 * Boot entrypoint. Wires DOM, fullscreen, exit-on-hide, then starts the game.
 */
import { Game } from './core/Game.js';

const canvas = document.getElementById('game');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const loadingScreen = document.getElementById('loading-screen');

function bindFullscreen() {
    if (!fullscreenBtn) return;
    fullscreenBtn.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
        } catch { /* ignore */ }
    });
}

function bindLifecycle(game) {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            game.pause();
            // Don't send gameOver here — platform 'exit' will handle that
        } else {
            game.resume();
        }
    });
    window.addEventListener('pagehide', () => game.finalize(), { once: true });
    window.addEventListener('beforeunload', () => game.finalize(), { once: true });
}

bindFullscreen();
const game = new Game(canvas);
try {
    await game.init();
    bindLifecycle(game);
    game.start();
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 600);
    }
} catch (err) {
    console.error('[slot_machine] boot failed:', err);
    if (loadingScreen) {
        loadingScreen.innerHTML =
            `<div class="loader-content"><div class="loader-title" style="color:#ff2244">BOOT FAILED</div>
             <div class="loader-text">${err?.message ?? err}</div></div>`;
    }
}
