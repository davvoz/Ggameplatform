import { Game } from './core/Game.js';

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
            if (req) req.call(docEl)?.catch?.(() => globalThis.PlatformSDK?.toggleFullscreen?.());
            else globalThis.PlatformSDK?.toggleFullscreen?.();
        } catch {
            globalThis.PlatformSDK?.toggleFullscreen?.();
        }
    });
}

const canvas = document.getElementById('game');
if (!canvas) throw new Error('main: #game canvas not found');
const game = new Game(canvas);
try {
    await game.init();
    game.start();
} catch (err) {
    console.error('[minion_clash] boot failed', err);
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '16px system-ui';
        ctx.fillText(`Boot error: ${err.message}`, 20, 40);
    }
}
bindFullscreenButton();
