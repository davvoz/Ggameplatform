import { GameConfig } from './config/GameConfig.js';
import { Game } from './core/Game.js';

function fitCanvas(canvas) {
    const W = GameConfig.VIEW_WIDTH;
    const H = GameConfig.VIEW_HEIGHT;
    const vw = globalThis.innerWidth;
    const vh = globalThis.innerHeight;
    const cssW = (vw / vh) <= (W / H) ? vw : Math.round(vh * W / H);
    const cssH = Math.round(cssW * H / W);
    canvas.style.width  = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
}

function bindFullscreenButton() {
    const btn = document.getElementById('fullscreen-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const docEl = document.documentElement;
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        try {
            if (fsEl) {
                (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
                return;
            }
            const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
            if (req) req.call(docEl)?.catch(() => globalThis.PlatformSDK?.toggleFullscreen?.());
            else globalThis.PlatformSDK?.toggleFullscreen?.();
        } catch {
            globalThis.PlatformSDK?.toggleFullscreen?.();
        }
    });
}

const canvas = document.getElementById('game');
if (!canvas) throw new Error('main: #game canvas not found');
fitCanvas(canvas);
globalThis.addEventListener('resize', () => fitCanvas(canvas));

const game = new Game(canvas);
try {
    await game.init();
    game.start();
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
    }
} catch (err) {
    console.error('[roulette] boot failed', err);
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '16px system-ui';
        ctx.fillText(`Boot error: ${err.message}`, 20, 40);
    }
}
bindFullscreenButton();
