import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');

const fullscreenBtn = document.getElementById('fullscreen-btn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        const sdk = globalThis.PlatformSDK;
        if (sdk && typeof sdk.toggleFullscreen === 'function') sdk.toggleFullscreen();
        else if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
    });
}

const game = new Game(canvas);
game.start();
