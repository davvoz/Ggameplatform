/**
 * FullscreenManager — SRP: all fullscreen transitions (native, iOS, PlatformSDK).
 *
 * SonarQube deduplication: the canvas-resize + button-setup pattern appeared
 * three times in game_old.js. It is now in `_refreshLayout`.
 * The "close popup + resume + transition guard" pattern is in `_prepareForTransition`.
 */
export class FullscreenManager {
    constructor(game) {
        this.game = game;
    }

    // ── public API ─────────────────────────────────────────────────────────
    toggleFullscreen() {
        if (globalThis.PlatformSDK && typeof globalThis.PlatformSDK.toggleFullscreen === 'function') {
            this._prepareForTransition();
            globalThis._gameFullscreenState = !globalThis._gameFullscreenState;
            globalThis.PlatformSDK.toggleFullscreen();
            return;
        }

        const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent) && !globalThis.MSStream;
        const isIPadOS = (navigator.userAgentData?.platform === 'macOS' || navigator.userAgentData?.platform === 'iPad') && navigator.maxTouchPoints > 1;
        const fsSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;

        if ((isIOS || isIPadOS) && !fsSupported) {
            this.toggleIOSFullscreen();
            return;
        }

        if (document.body.classList.contains('game-fullscreen')) {
            this.exitFullscreen();
        } else {
            this.requestFullscreen();
        }
    }

    toggleIOSFullscreen() {
        this._prepareForTransition();
        if (document.body.classList.contains('ios-game-fullscreen')) {
            this._exitIOSFullscreen();
        } else {
            this._enterIOSFullscreen();
        }
    }

    requestFullscreen() {
        this._prepareForTransition();
        document.body.classList.add('game-fullscreen');
        window.scrollTo(0, 0);

        const elem = document.documentElement;
        if      (elem.requestFullscreen)       elem.requestFullscreen().catch(() => {});
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.mozRequestFullScreen)    elem.mozRequestFullScreen();
        else if (elem.msRequestFullscreen)     elem.msRequestFullscreen();

        setTimeout(() => this._refreshLayout(), 100);
    }

    exitFullscreen() {
        if (globalThis.PlatformSDK && typeof globalThis.PlatformSDK.toggleFullscreen === 'function' && globalThis._gameFullscreenState) {
            globalThis._gameFullscreenState = false;
            globalThis.PlatformSDK.toggleFullscreen();
            return;
        }
        if (document.body.classList.contains('ios-game-fullscreen')) {
            this.toggleIOSFullscreen();
            return;
        }

        this._prepareForTransition();
        document.body.classList.remove('game-fullscreen');
        window.scrollTo(0, 0);

        if      (document.exitFullscreen)       document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen)  document.mozCancelFullScreen();
        else if (document.msExitFullscreen)     document.msExitFullscreen();

        setTimeout(() => this._refreshLayout(), 100);
    }

    injectIOSFullscreenStyles() {
        if (document.getElementById('ios-fullscreen-styles')) return;
        const style    = document.createElement('style');
        style.id       = 'ios-fullscreen-styles';
        style.textContent = `
            html.ios-game-fullscreen,
            html.ios-game-fullscreen body {
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important;
                overflow: hidden !important;
                -webkit-overflow-scrolling: auto !important;
            }
            html.ios-game-fullscreen body {
                min-height: 100vh !important;
                min-height: 100dvh !important;
                min-height: -webkit-fill-available !important;
            }
            .ios-game-fullscreen #gameCanvas {
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                height: 100dvh !important;
                height: -webkit-fill-available !important;
                z-index: 999999 !important;
            }
            #ios-fs-exit {
                position: fixed !important;
                top: max(10px, env(safe-area-inset-top)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                z-index: 9999999 !important;
                background: rgba(0,0,0,0.7) !important;
                color: white !important; border: none !important;
                border-radius: 50% !important;
                width: 44px !important; height: 44px !important;
                font-size: 24px !important; cursor: pointer !important;
                display: flex !important;
                align-items: center !important; justify-content: center !important;
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }

    createIOSExitButton() {
        if (document.getElementById('ios-fs-exit')) return;
        const btn = document.createElement('button');
        btn.id    = 'ios-fs-exit';
        btn.innerHTML = '✕';
        btn.setAttribute('aria-label', 'Exit fullscreen');
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleIOSFullscreen();
        });
        document.body.appendChild(btn);
    }

    // ── private helpers ────────────────────────────────────────────────────

    /**
     * Deduplicated transition preparation.
     * Was repeated in requestFullscreen, exitFullscreen, toggleIOSFullscreen.
     */
    _prepareForTransition() {
        this.game.ui.closeSettingsPopup();
        this.game.resume();
        this.game.isFullscreenTransition = true;
        setTimeout(() => { this.game.isFullscreenTransition = false; }, 500);
    }

    /**
     * Deduplicated canvas + UI refresh.
     * Was repeated in requestFullscreen, exitFullscreen, toggleIOSFullscreen.
     */
    _refreshLayout() {
        this.game.graphics.setupCanvas();
        this.game.ui.setupShopButtons();
    }

    _enterIOSFullscreen() {
        this.injectIOSFullscreenStyles();
        document.documentElement.classList.add('ios-game-fullscreen');
        document.body.classList.add('ios-game-fullscreen', 'game-fullscreen');
        document.body.style.overflow = 'hidden';
        this.createIOSExitButton();
        setTimeout(() => {
            window.scrollTo(0, 1);
            this._refreshLayout();
        }, 100);
        setTimeout(() => window.scrollTo(0, 1), 300);
    }

    _exitIOSFullscreen() {
        document.documentElement.classList.remove('ios-game-fullscreen');
        document.body.classList.remove('ios-game-fullscreen', 'game-fullscreen');
        document.body.style.overflow = '';
        document.getElementById('ios-fs-exit')?.remove();
        setTimeout(() => this._refreshLayout(), 100);
    }
}
