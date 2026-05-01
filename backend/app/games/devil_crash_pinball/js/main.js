import { Game } from './core/Game.js';
import { DefaultBoardSource } from './core/sources/DefaultBoardSource.js';
import { RemoteBoardSource } from './core/sources/RemoteBoardSource.js';
import { PostMessageBoardSource } from './core/sources/PostMessageBoardSource.js';
import { BoardShell } from './ui/shell/BoardShell.js';
import { PlatformNotifications } from './platform/PlatformNotifications.js';

/**
 * Boot. Picks a BoardSource from URL parameters, optionally shows the
 * community-board shell, then starts the game loop.
 *
 * URL contract:
 *   (none)                     → show shell (mode picker)
 *   ?mode=default              → original campaign, skip shell
 *   ?mode=community&boardId=N  → load community board N, skip shell
 *   ?source=postmessage        → editor "Test" mode, board arrives via postMessage
 *
 * Only `default` mode opens a Platform SDK session (XP / leaderboard).
 * Community boards (UGC) and editor test plays are STANDALONE — no XP awarded.
 */

// Modes that must NOT open a Platform SDK session (no XP).
const STANDALONE_KINDS = new Set(['community', 'editor']);

function pickSource() {
    const params = new URLSearchParams(globalThis.location?.search ?? '');
    const source = params.get('source');
    const mode = params.get('mode');
    const boardId = params.get('boardId');

    if (source === 'postmessage') {
        return { source: new PostMessageBoardSource(), kind: 'editor', needsShell: false };
    }
    if (mode === 'default') {
        return { source: new DefaultBoardSource(), kind: 'default', needsShell: false };
    }
    if (mode === 'community' && boardId) {
        return { source: new RemoteBoardSource(boardId), kind: 'community', needsShell: false };
    }
    return { source: null, kind: null, needsShell: true };
}

async function startGameWithSource(game, loadingScreen, source, kind) {
    try {
        await game.init(source);
    } catch (err) {
        console.error('[devil_crash_pinball] init failed', err);
        if (loadingScreen) {
            loadingScreen.innerHTML = `<div style="color:#ffb8a8;text-align:center;padding:24px;font-family:system-ui">
                <h2 style="color:#ff3a3a;margin-bottom:12px">Failed to load board</h2>
                <p style="opacity:.8">${err?.message ?? err}</p>
                <p style="margin-top:16px;opacity:.6;font-size:13px">Reload the page to try again.</p>
            </div>`;
        }
        return game;
    }

    // Suppress Platform SDK session (XP, leaderboard) for community / editor plays.
    const standalone = STANDALONE_KINDS.has(kind);
    game.setKind(kind ?? 'default');
    game.platform.setSessionEnabled(!standalone);
    if (standalone) {
        PlatformNotifications.showStandaloneBanner(kind === 'editor'
            ? 'Editor Test — no XP awarded'
            : 'Community Board — standalone, no XP awarded');
    }

    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.remove();
            game.start();
        }, { once: true });
        setTimeout(() => { if (!game.running) game.start(); }, 900);
    } else {
        game.start();
    }
    return game;
}

function bindFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (!fullscreenBtn) return;
    fullscreenBtn.addEventListener('click', (ev) => {
        ev.currentTarget.blur();
        // Always try the native API on our own document first: the click's
        // user-activation lives here and the platform iframe is launched with
        // `allow="fullscreen"`, so this works whether we're embedded or not.
        // Cross-origin postMessage to the parent loses activation, so we only
        // fall back to the SDK if the direct call is unavailable.
        const docEl = document.documentElement;
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        try {
            if (fsEl) {
                (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
                return;
            }
            const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
            if (req) {
                const p = req.call(docEl);
                if (p && typeof p.catch === 'function') {
                    p.catch((err) => {
                        console.debug('[devil_crash_pinball] direct fullscreen rejected, falling back to SDK', err);
                        globalThis.PlatformSDK?.toggleFullscreen?.();
                    });
                }
                return;
            }
        } catch (err) {
            console.debug('[devil_crash_pinball] direct fullscreen threw, falling back to SDK', err);
        }
        globalThis.PlatformSDK?.toggleFullscreen?.();
    });
}

async function bootstrap() {
    const canvas = document.getElementById('game');
    if (!canvas) return;

    const loadingScreen = document.getElementById('loading-screen');
    bindFullscreenButton();

    await document.fonts.ready.catch(() => { /* standalone fallback */ });

    const game = new Game(canvas);
    if (typeof globalThis !== 'undefined') globalThis.__devilCrash = game;
    await game.platform.initialize();

    const { source, kind, needsShell } = pickSource();

    if (needsShell) {
        const shellHost = document.getElementById('board-shell');
        if (!shellHost) {
            console.error('[devil_crash_pinball] board-shell host missing, falling back to default board');
            await startGameWithSource(game, loadingScreen, new DefaultBoardSource(), 'default');
            return;
        }

        if (loadingScreen) loadingScreen.classList.add('fade-out');
        const shell = new BoardShell(shellHost);

        async function runSession(firstScreen) {
            const choice = await shell.show();
            if (firstScreen) firstScreen.classList.remove('fade-out');
            game.onExitToShell = () => {
                game.onExitToShell = null;
                runSession(null);
            };
            await startGameWithSource(game, firstScreen, choice.source, choice.kind);
        }

        runSession(loadingScreen);
        return;
    }

    await startGameWithSource(game, loadingScreen, source, kind);
}

await bootstrap();
