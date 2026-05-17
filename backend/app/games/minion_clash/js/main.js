import { Game } from './core/Game.js';

// ─── Platform message listener (XP banner, level-up modal) ───────────────────
let _parentOrigin = null;
window.addEventListener('message', (event) => {
    try {
        const msg = event.data;
        if (!msg?.type) return;
        if (msg.protocolVersion !== '1.0.0') return;
        if (_parentOrigin && event.origin !== _parentOrigin) {
            console.warn('[minion_clash] Rejected message from untrusted origin:', event.origin);
            return;
        }
        if (!_parentOrigin && event.origin) _parentOrigin = event.origin;

        if (msg.type === 'showXPBanner' && msg.payload) {
            showXPBanner(msg.payload.xp_earned, msg.payload);
        }
        if (msg.type === 'showLevelUpModal' && msg.payload) {
            showLevelUpNotification(msg.payload);
        }
    } catch (e) {
        console.error('[minion_clash] platform msg error', e);
    }
});

function showXPBanner(xpAmount, payload) {
    if (xpAmount <= 0) return;
    if (!document.querySelector('#mc-xp-styles')) {
        const s = document.createElement('style');
        s.id = 'mc-xp-styles';
        s.textContent = `
            .mc-xp-banner { position:fixed; top:60px; right:16px; z-index:10000;
                animation:mcXpIn .5s ease; pointer-events:none; }
            .mc-xp-banner.hiding { animation:mcXpOut .5s ease forwards; }
            .mc-xp-badge { background:linear-gradient(135deg,#ffd700 0%,#ffed4e 100%);
                padding:14px 22px; border-radius:12px;
                box-shadow:0 4px 20px rgba(255,215,0,.4);
                display:flex; align-items:center; gap:10px; }
            .mc-xp-icon { font-size:1.4em; }
            .mc-xp-amount { font-size:1.1em; font-weight:700; color:#1a1a1a; }
            @keyframes mcXpIn  { from{transform:translateX(400px);opacity:0} to{transform:translateX(0);opacity:1} }
            @keyframes mcXpOut { from{transform:translateX(0);opacity:1} to{transform:translateX(400px);opacity:0} }
        `;
        document.head.appendChild(s);
    }
    const banner = document.createElement('div');
    banner.className = 'mc-xp-banner';
    const badge  = document.createElement('div');
    badge.className = 'mc-xp-badge';
    const icon   = document.createElement('span');
    icon.className = 'mc-xp-icon';
    icon.textContent = '⭐';
    const amount = document.createElement('span');
    amount.className = 'mc-xp-amount';
    amount.textContent = `+${Number(xpAmount).toFixed(2)} XP`;
    badge.appendChild(icon);
    badge.appendChild(amount);
    banner.appendChild(badge);
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.classList.add('hiding');
        setTimeout(() => banner.remove(), 500);
    }, 2500);
}

function showLevelUpNotification(data) {
    const { old_level, new_level, title = '' } = data;
    const titleHtml = title ? '<div style="margin-top:4px;font-size:.9em;opacity:.8">' + title + '</div>' : '';
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10001;background:#1a1a2e;border:2px solid #ffd700;border-radius:16px;padding:32px 40px;text-align:center;color:#fff;font-family:system-ui,sans-serif;pointer-events:none;';
    modal.innerHTML = `<div style="font-size:2em;margin-bottom:8px">🎉</div>
        <div style="font-size:1.4em;font-weight:700;color:#ffd700">Level Up!</div>
        <div style="margin-top:8px;font-size:1.1em">${old_level} → ${new_level}</div>
        ${titleHtml}`;
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 3000);
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fit the canvas display size to the viewport while preserving the 480×800 aspect ratio.
 * This is the authoritative fallback for browsers that handle `svh` or `aspect-ratio`
 * incorrectly (older Android WebView, some Samsung Internet versions).
 */
function fitCanvas(canvas) {
    const W = 480, H = 800;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cssW = (vw / vh) <= (W / H) ? vw : Math.round(vh * W / H);
    const cssH = Math.round(cssW * H / W);
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
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
            if (req) req.call(docEl)?.catch?.(() => globalThis.PlatformSDK?.toggleFullscreen?.());
            else globalThis.PlatformSDK?.toggleFullscreen?.();
        } catch {
            globalThis.PlatformSDK?.toggleFullscreen?.();
        }
    });
}

const canvas = document.getElementById('game');
if (!canvas) throw new Error('main: #game canvas not found');
fitCanvas(canvas);
window.addEventListener('resize', () => fitCanvas(canvas));
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
    console.error('[minion_clash] boot failed', err);
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '16px system-ui';
        ctx.fillText(`Boot error: ${err.message}`, 20, 40);
    }
}
bindFullscreenButton();
